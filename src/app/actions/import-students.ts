"use server";

import { supabase } from "@/lib/supabase";

export type ImportRowResult = {
  row: number;
  studentName: string;
  success: boolean;
  error?: string;
};

export type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  results: ImportRowResult[];
};

type CsvRow = {
  "NOME DO RESPONSAVEL": string;
  EMAIL: string;
  CELULAR: string;
  "CPF ou CNPJ": string;
  "TIPO DE ALUNA": string;
  TURMA: string;
  "NOME DA ALUNA": string;
  PLANO: string;
  MENSALIDADE: string;
  "TAXA DA ESCOLA": string;
};

function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseValidityType(plano: string): "semester" | "annual" {
  const normalized = plano.trim().toLowerCase();
  if (normalized.includes("anual") || normalized.includes("annual")) {
    return "annual";
  }
  return "semester";
}

function parseIsInternal(tipo: string): boolean {
  const normalized = tipo.trim().toLowerCase();
  return normalized.includes("intern");
}

/**
 * Normaliza string para comparação: lowercase, remove acentos.
 */
function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * CSV TURMA format: "INFANTIL 2 - MÃE CORUJA"
 *   → classPart: "infantil 2"
 *   → locationKeyword: "mae coruja"
 *
 * DB has: class.name = "Infantil 2", location.name = "Creche e Pré-Escola Mãe Coruja"
 *
 * Match: class.name matches classPart AND location.name contains locationKeyword.
 */
type ClassLookupEntry = {
  classId: string;
  className: string;
  locationName: string;
};

/**
 * Splits a normalized string into words (3+ chars) for fuzzy matching.
 * Ignores short prepositions like "de", "da", "do", "e".
 */
function significantWords(str: string): string[] {
  return normalize(str)
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * Returns true if every significant word from `keyword` appears in `target`.
 * This tolerates typos in the CSV like "ACONHEGO" matching "Aconchego"
 * by checking if the target contains words that START WITH the keyword word
 * (min 3 chars prefix match).
 */
function fuzzyContains(target: string, keyword: string): boolean {
  const targetWords = significantWords(target);
  const keywordWords = significantWords(keyword);

  return keywordWords.every((kw) =>
    targetWords.some(
      (tw) => tw.includes(kw) || kw.includes(tw) || tw.startsWith(kw.slice(0, 4))
    )
  );
}

function findClassId(
  turma: string,
  entries: ClassLookupEntry[]
): ClassLookupEntry | undefined {
  const separatorIdx = turma.indexOf(" - ");
  if (separatorIdx === -1) {
    const normTurma = normalize(turma);
    return entries.find((e) => normalize(e.className) === normTurma);
  }

  const classPart = normalize(turma.slice(0, separatorIdx));
  const locationKeyword = turma.slice(separatorIdx + 3);

  return entries.find(
    (e) =>
      normalize(e.className) === classPart &&
      fuzzyContains(e.locationName, locationKeyword)
  );
}

export async function importStudentsFromCsv(
  rows: CsvRow[]
): Promise<ImportResult> {
  const results: ImportRowResult[] = [];
  let imported = 0;
  let failed = 0;

  // Pre-fetch existing students to avoid duplicates (normalized name)
  const { data: existingStudents } = await supabase
    .from("students")
    .select("full_name");

  const existingNames = new Set(
    (existingStudents ?? []).map((s: { full_name: string }) =>
      normalize(s.full_name)
    )
  );

  // Pre-fetch all classes with their locations
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, location:locations(name)");

  if (classesError || !classes) {
    return {
      total: rows.length,
      imported: 0,
      failed: rows.length,
      results: rows.map((row, i) => ({
        row: i + 1,
        studentName: row["NOME DA ALUNA"] || "??",
        success: false,
        error: "Falha ao carregar turmas do banco.",
      })),
    };
  }

  // Build lookup entries
  const lookupEntries: ClassLookupEntry[] = classes.map((cls: any) => ({
    classId: cls.id,
    className: cls.name,
    locationName: cls.location?.name ?? "",
  }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const studentName = (row["NOME DA ALUNA"] || "").trim();
    const rowNum = i + 1;

    if (!studentName) {
      results.push({
        row: rowNum,
        studentName: "(vazio)",
        success: false,
        error: "Nome da aluna vazio, linha ignorada.",
      });
      failed++;
      continue;
    }

    // Skip duplicates
    if (existingNames.has(normalize(studentName))) {
      results.push({
        row: rowNum,
        studentName,
        success: false,
        error: "Aluna já cadastrada, ignorada.",
      });
      failed++;
      continue;
    }

    try {
      // 1. Resolve class_id via composite match
      const turmaRaw = (row["TURMA"] || "").trim();
      const match = findClassId(turmaRaw, lookupEntries);

      if (!match) {
        results.push({
          row: rowNum,
          studentName,
          success: false,
          error: `Turma não encontrada: "${turmaRaw}". Turmas disponíveis: ${lookupEntries.map((e) => `${e.className} - ${e.locationName}`).join(", ")}`,
        });
        failed++;
        continue;
      }

      // 2. Insert student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          full_name: studentName,
          guardian_name: (row["NOME DO RESPONSAVEL"] || "").trim(),
          guardian_email: (row["EMAIL"] || "").trim() || null,
          guardian_phone: (row["CELULAR"] || "").trim() || null,
          guardian_cpf: (row["CPF ou CNPJ"] || "").trim() || null,
          is_internal: parseIsInternal(row["TIPO DE ALUNA"] || ""),
          is_active: true,
        })
        .select("id")
        .single();

      if (studentError || !student) {
        results.push({
          row: rowNum,
          studentName,
          success: false,
          error: `Erro ao inserir aluna: ${studentError?.message}`,
        });
        failed++;
        continue;
      }

      // 3. Insert enrollment
      const now = new Date();
      const year = now.getFullYear();
      const validityType = parseValidityType(row["PLANO"] || "");
      const startsAt = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endsAt =
        validityType === "semester"
          ? `${year}-${String(Math.min(now.getMonth() + 7, 12)).padStart(2, "0")}-01`
          : `${year}-12-31`;

      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          student_id: student.id,
          class_id: match.classId,
          status: "active",
          validity_type: validityType,
          starts_at: startsAt,
          ends_at: endsAt,
          base_fee: parseCurrency(row["MENSALIDADE"] || ""),
          due_day: 5,
        });

      if (enrollmentError) {
        await supabase.from("students").delete().eq("id", student.id);
        results.push({
          row: rowNum,
          studentName,
          success: false,
          error: `Erro ao criar matrícula: ${enrollmentError.message}`,
        });
        failed++;
        continue;
      }

      existingNames.add(normalize(studentName));
      results.push({ row: rowNum, studentName, success: true });
      imported++;
    } catch (err) {
      results.push({
        row: rowNum,
        studentName,
        success: false,
        error: `Erro inesperado: ${err instanceof Error ? err.message : String(err)}`,
      });
      failed++;
    }
  }

  return { total: rows.length, imported, failed, results };
}

"use server";

import { getServiceSupabase } from "@/lib/supabase";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { safeDbError } from "@/lib/safe-error";
import { unwrapJoin } from "@/lib/supabase-helpers";
import { computeEnrollmentDates } from "@/lib/enrollment-utils";
import type { ActionResult } from "@/lib/action-result";
import { normalize, type ClassLookupEntry, type CsvRow } from "@/lib/csv-import";

const supabase = getServiceSupabase();

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

export async function getClassesForImport(): Promise<
  ActionResult<ClassLookupEntry[]>
> {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from("classes")
      .select("id, name, location:locations(name)")
      .order("name");

    if (error) {
      return { success: false, error: safeDbError(error, "getClassesForImport") };
    }

    const typed = (data ?? []) as {
      id: string;
      name: string;
      location: { name: string }[] | { name: string } | null;
    }[];

    const entries: ClassLookupEntry[] = typed.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      locationName: unwrapJoin(cls.location)?.name ?? "",
    }));

    return { success: true, data: entries };
  } catch (e) {
    return (
      handleAuthError<ClassLookupEntry[]>(e) ?? {
        success: false,
        error: "Falha ao carregar turmas.",
      }
    );
  }
}

export async function importStudentsFromCsv(
  rows: CsvRow[],
  classMap: Record<string, string>,
): Promise<ImportResult> {
  await requireAdmin();

  const results: ImportRowResult[] = [];
  let imported = 0;
  let failed = 0;

  const { data: existingStudents } = await supabase
    .from("students")
    .select("full_name");

  const existingNames = new Set(
    (existingStudents ?? []).map((s: { full_name: string }) =>
      normalize(s.full_name),
    ),
  );

  const { data: validClasses } = await supabase.from("classes").select("id");
  const validClassIds = new Set(
    (validClasses ?? []).map((c: { id: string }) => c.id),
  );

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
      const turmaRaw = (row["TURMA"] || "").trim();
      const classId = classMap[turmaRaw];

      if (!classId) {
        results.push({
          row: rowNum,
          studentName,
          success: false,
          error: `Turma "${turmaRaw}" não foi mapeada na etapa de confirmação.`,
        });
        failed++;
        continue;
      }

      if (!validClassIds.has(classId)) {
        results.push({
          row: rowNum,
          studentName,
          success: false,
          error: "ID de turma inválido.",
        });
        failed++;
        continue;
      }

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
          error: `Erro ao inserir aluna: ${safeDbError(studentError, "importStudents:student")}`,
        });
        failed++;
        continue;
      }

      const validityType = parseValidityType(row["PLANO"] || "");
      const { startsAt, endsAt } = computeEnrollmentDates(validityType);

      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          student_id: student.id,
          class_id: classId,
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
          error: `Erro ao criar matrícula: ${safeDbError(enrollmentError, "importStudents:enrollment")}`,
        });
        failed++;
        continue;
      }

      existingNames.add(normalize(studentName));
      results.push({ row: rowNum, studentName, success: true });
      imported++;
    } catch (err) {
      console.error("[importStudents:unexpected]", err);
      results.push({
        row: rowNum,
        studentName,
        success: false,
        error: "Erro inesperado ao processar esta linha.",
      });
      failed++;
    }
  }

  return { total: rows.length, imported, failed, results };
}

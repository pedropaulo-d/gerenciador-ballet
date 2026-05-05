export type ClassLookupEntry = {
  classId: string;
  className: string;
  locationName: string;
};

export type CsvRow = {
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

export function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function significantWords(str: string): string[] {
  return normalize(str)
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function fuzzyContains(target: string, keyword: string): boolean {
  const targetWords = significantWords(target);
  const keywordWords = significantWords(keyword);

  return keywordWords.every((kw) =>
    targetWords.some(
      (tw) => tw.includes(kw) || kw.includes(tw) || tw.startsWith(kw.slice(0, 4)),
    ),
  );
}

export function findClassMatch(
  turma: string,
  entries: ClassLookupEntry[],
): ClassLookupEntry | undefined {
  const separatorIdx = turma.indexOf(" - ");
  if (separatorIdx === -1) {
    const normTurma = normalize(turma);
    return entries.find((e) => normalize(e.className) === normTurma);
  }

  const classPart = normalize(turma.slice(0, separatorIdx));
  const locationKeyword = turma.slice(separatorIdx + 3);

  const exact = entries.find(
    (e) =>
      normalize(e.className) === classPart &&
      fuzzyContains(e.locationName, locationKeyword),
  );
  if (exact) return exact;

  const sameClass = entries.filter(
    (e) => normalize(e.className) === classPart,
  );
  if (sameClass.length === 1) return sameClass[0];

  return undefined;
}

export function uniqueTurmas(rows: CsvRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const turma = (row.TURMA || "").trim();
    if (turma) set.add(turma);
  }
  return Array.from(set).sort();
}

import type { ValidityType } from "@/types/database";

// ---------- Moeda ----------

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- Dias da semana ----------

export const DAY_LABELS = [
  "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb",
] as const;

const DAY_SORT_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function sortedDays(days: number[]): number[] {
  return [...days].sort(
    (a, b) => DAY_SORT_ORDER.indexOf(a) - DAY_SORT_ORDER.indexOf(b)
  );
}

// ---------- Plano / Validade ----------

const VALIDITY_LABELS: Record<ValidityType, string> = {
  semester: "Semestral",
  annual: "Anual",
};

export function validityLabel(type: ValidityType): string {
  return VALIDITY_LABELS[type];
}

// ---------- Horário ----------

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

// ---------- Data / Timezone ----------

/** Current date/time in America/Sao_Paulo, safe for server environments (UTC). */
export function nowBrasilia(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
}

/** First day of current month as "YYYY-MM-01". */
export function getCurrentMonth(): string {
  const now = nowBrasilia();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Today as "YYYY-MM-DD". */
export function todayISO(): string {
  const d = nowBrasilia();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Start and end dates of the current month as "YYYY-MM-DD". */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = nowBrasilia();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

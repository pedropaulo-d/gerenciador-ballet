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

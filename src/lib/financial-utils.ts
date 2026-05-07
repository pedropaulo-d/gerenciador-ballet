import { todayISO } from "./formatters";

/**
 * Decide se uma mensalidade ja virou Vencida com base na regra de negocio:
 * "no proprio dia do vencimento a cobranca ainda e Pendente; soma vira
 * Vencida no dia seguinte". Comparacao feita em strings YYYY-MM-DD para
 * evitar drift de milissegundos/timezone em comparacoes de Date.
 */
export function isFeeOverdue(referenceMonth: string, dueDay: number): boolean {
  const [year, month] = referenceMonth.split("-").map(Number);
  const dueDateStr = `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  return todayISO() > dueDateStr;
}

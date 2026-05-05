/**
 * Last second of `dueDay` in the month identified by `referenceMonth` (YYYY-MM-DD).
 * Used to decide overdue vs pending: any moment past this Date counts as overdue.
 */
export function computeDueDate(referenceMonth: string, dueDay: number): Date {
  const [year, month] = referenceMonth.split("-").map(Number);
  return new Date(year, month - 1, dueDay, 23, 59, 59);
}

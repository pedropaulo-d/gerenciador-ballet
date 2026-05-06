import type { ValidityType } from "@/types/database";

/**
 * Compute the start and end dates of a new enrollment based on the validity
 * type, anchored at the first day of the reference month.
 *
 * - semester: end is the first day of the 7th month after start (i.e. 6 months
 *   later), wrapping into the next year when start is in the second half.
 * - annual: ends at December 31 of the same year.
 *
 * Returned as "YYYY-MM-DD" strings.
 */
export function computeEnrollmentDates(
  validityType: ValidityType,
  reference: Date = new Date(),
): { startsAt: string; endsAt: string } {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const startsAt = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  if (validityType === "annual") {
    return { startsAt, endsAt: `${year}-12-31` };
  }

  const totalMonths = month + 6;
  const endYear = year + Math.floor(totalMonths / 12);
  const endMonth = (totalMonths % 12) + 1;
  const endsAt = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  return { startsAt, endsAt };
}

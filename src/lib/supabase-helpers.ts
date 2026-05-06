/**
 * Unwrap a PostgREST join that may be returned as an object or an array.
 * PostgREST returns objects for many-to-one joins (FK on source table)
 * and arrays for one-to-many. Callers that always expect a single related
 * row use this to handle both shapes defensively.
 */
export function unwrapJoin<T>(value: T | T[] | null | undefined): T | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

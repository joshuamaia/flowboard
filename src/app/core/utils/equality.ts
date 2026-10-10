/**
 * Structural equality for small plain-data values (chart series, view models).
 * Used as a computed() `equal` fn so consumers only react to real changes.
 */
export function jsonEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

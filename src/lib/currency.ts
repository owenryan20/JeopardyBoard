/** Format a score or clue value with the Philippine peso sign. */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}

export const PESO = '₱';

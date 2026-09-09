/** Wrap an index into `0 … length-1`. Empty collections stay at 0. */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function adjacentIndex(
  index: number,
  length: number,
  step: -1 | 1,
): number {
  return wrapIndex(index + step, length);
}

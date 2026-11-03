export type ByteRange = { start: number; end: number };

/** Parse a single bytes range. Multiple ranges are unsupported and rejected. */
export function parseRange(header: string, size: number): ByteRange | null {
  if (!Number.isSafeInteger(size) || size < 1) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if (
    (first !== undefined && !Number.isSafeInteger(first)) ||
    (last !== undefined && !Number.isSafeInteger(last))
  )
    return null;
  if (first === undefined) {
    if (last === undefined || last < 1) return null;
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (last !== undefined && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

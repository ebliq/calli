export function compareNullableDates(
  a: Date | undefined,
  b: Date | undefined
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const timeA = a.getTime();
  const timeB = b.getTime();

  if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
    return a.toString().localeCompare(b.toString());
  }

  return timeA - timeB;
}

/**
 * Auto-expiry — the self-cleaning mechanism for dated content (field notes
 * now; corkboard posts later). Combined with the nightly rebuild, anything
 * with an `expires` date removes itself from every page the night it lapses.
 *
 * Semantics: `expires` is INCLUSIVE — content stays visible through the end
 * of that calendar day and disappears on the next build after it. Day-level
 * precision only; dates compare in the build machine's local time, which is
 * fine at this granularity.
 */

export function isExpired(expires: Date | undefined | null, now: Date = new Date()): boolean {
  if (!expires) return false;
  const endOfExpiryDay = new Date(
    expires.getFullYear(),
    expires.getMonth(),
    expires.getDate(),
    23,
    59,
    59,
    999,
  );
  return now.getTime() > endOfExpiryDay.getTime();
}

/** Filter helper for collections whose entries carry `data.expires`. */
export function notExpired<T extends { data: { expires?: Date } }>(
  entries: T[],
  now: Date = new Date(),
): T[] {
  return entries.filter((e) => !isExpired(e.data.expires, now));
}

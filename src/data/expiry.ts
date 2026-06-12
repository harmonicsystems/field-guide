/**
 * Auto-expiry — the self-cleaning mechanism for dated content (field notes
 * now; corkboard posts later). Combined with the nightly rebuild, anything
 * with an `expires` date removes itself from every page the night it lapses.
 *
 * Semantics: `expires` is INCLUSIVE — content stays visible through the end
 * of that calendar day and disappears on the next build after it.
 *
 * Frontmatter date-only values ("2026-06-28") parse as UTC midnight, so the
 * whole pipeline treats them as UTC calendar days: expiry compares against
 * the UTC day-end here, and the display helpers format with timeZone 'UTC'.
 * Mixing in local time shifts everything a day early — don't.
 */

export function isExpired(expires: Date | undefined | null, now: Date = new Date()): boolean {
  if (!expires) return false;
  const endOfExpiryDay = Date.UTC(
    expires.getUTCFullYear(),
    expires.getUTCMonth(),
    expires.getUTCDate(),
    23,
    59,
    59,
    999,
  );
  return now.getTime() > endOfExpiryDay;
}

/** Filter helper for collections whose entries carry `data.expires`. */
export function notExpired<T extends { data: { expires?: Date } }>(
  entries: T[],
  now: Date = new Date(),
): T[] {
  return entries.filter((e) => !isExpired(e.data.expires, now));
}

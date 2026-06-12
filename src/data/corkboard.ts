import { getCollection, type CollectionEntry } from 'astro:content';
import { notExpired } from './expiry';

export type CorkboardPost = CollectionEntry<'corkboard'>;
export type CorkboardCategory = 'business' | 'event' | 'community';

export const corkboardCategoryOrder: CorkboardCategory[] = [
  'business',
  'event',
  'community',
];

export const corkboardCategoryLabels: Record<CorkboardCategory, string> = {
  business: 'Business notes',
  event: 'Events',
  community: 'Community',
};

/**
 * All corkboard posts that haven't expired, newest first. Every surface
 * (the board, place pages, llms-full) goes through this — same expiry
 * behavior everywhere, same as field notes.
 */
export async function livePosts(now: Date = new Date()): Promise<CorkboardPost[]> {
  const all = await getCollection('corkboard');
  return notExpired(all, now).sort(
    (a, b) => b.data.posted.getTime() - a.data.posted.getTime(),
  );
}

export function postDateLabel(d: Date): string {
  // Frontmatter dates are UTC calendar days — format in UTC or they drift
  // a day early (see expiry.ts).
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "Comes down Jun 26" — expiry is shown, not hidden. The board is honest. */
export function comesDownLabel(expires: Date): string {
  return `comes down ${postDateLabel(expires)}`;
}

import { getCollection, type CollectionEntry } from 'astro:content';
import { notExpired } from './expiry';

export type NoteEntry = CollectionEntry<'notes'>;

/**
 * All field notes that haven't expired, newest first. Every surface (home,
 * /notes/, place pages, RSS, JSON Feed) goes through this so expiry behaves
 * identically everywhere.
 */
export async function liveNotes(now: Date = new Date()): Promise<NoteEntry[]> {
  const all = await getCollection('notes');
  return notExpired(all, now).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

export function noteDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

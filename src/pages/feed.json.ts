import type { APIRoute } from 'astro';
import { liveNotes } from '../data/fieldNotes';
import { places } from '../data/places';

export const prerender = true;

/** JSON Feed 1.1 of the field notes — https://jsonfeed.org/version/1.1 */
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://field-guide.feed-and-seed.com'))
    .toString()
    .replace(/\/$/, '');
  const notes = await liveNotes();

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Field Guide — field notes',
    home_page_url: `${base}/notes/`,
    feed_url: `${base}/feed.json`,
    description:
      'Short dated notes from around Kinderhook, NY. Kept by Feed & Seed, a barn in Kinderhook.',
    items: notes.map((note) => {
      const place = note.data.place
        ? places.find((p) => p.slug === note.data.place)
        : undefined;
      return {
        id: note.id,
        url: `${base}/notes/#${note.id}`,
        ...(place ? { external_url: `${base}/${place.slug}/` } : {}),
        date_published: note.data.date.toISOString(),
        content_text: (note.body ?? '').trim(),
        ...(note.data.author ? { authors: [{ name: note.data.author }] } : {}),
        ...(place ? { tags: [place.slug] } : {}),
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
};

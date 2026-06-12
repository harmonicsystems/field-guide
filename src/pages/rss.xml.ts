import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { liveNotes, noteDateLabel } from '../data/fieldNotes';
import { places } from '../data/places';

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const notes = await liveNotes();
  return rss({
    title: 'Field Guide — field notes',
    description:
      'Short dated notes from around Kinderhook, NY. Kept by Feed & Seed, a barn in Kinderhook.',
    site: context.site ?? 'https://field-guide.feed-and-seed.com',
    items: notes.map((note) => {
      const place = note.data.place
        ? places.find((p) => p.slug === note.data.place)
        : undefined;
      return {
        title: place
          ? `${place.name} — ${noteDateLabel(note.data.date)}`
          : noteDateLabel(note.data.date),
        pubDate: note.data.date,
        description: note.body ?? '',
        // Anchor on the archive page; unique per note so feed readers
        // treat each note as a distinct item.
        link: `/notes/#${note.id}`,
      };
    }),
  });
};

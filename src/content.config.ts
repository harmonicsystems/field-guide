import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { places } from './data/places';

const placeSlugs = new Set(places.map((p) => p.slug));

/**
 * Field notes — dated micro-entries, 1–4 sentences each. One markdown file
 * per note in src/content/notes/. The 30-second publishing unit:
 *
 *   ---
 *   date: 2026-06-11
 *   place: hamrahs        # optional — links the note to a place page
 *   author: Feed & Seed   # optional — defaults to Feed & Seed
 *   expires: 2026-09-01   # optional — note removes itself after this day
 *   ---
 *   The falafel hand pies were back this Saturday. Gone by 1:30.
 */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date(),
    place: z
      .string()
      .optional()
      .refine((slug) => slug === undefined || placeSlugs.has(slug), {
        message: 'place must match a slug in src/data/places.ts',
      }),
    author: z.string().optional(),
    expires: z.coerce.date().optional(),
  }),
});

export const collections = { notes };

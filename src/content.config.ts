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

const MAX_POST_DAYS = 60;

/**
 * Corkboard posts — the village bulletin board that cleans itself. One
 * markdown file per post in src/content/corkboard/, usually created by the
 * corkboard-approve workflow from an approved GitHub issue:
 *
 *   ---
 *   posted: 2026-06-12
 *   expires: 2026-06-26   # REQUIRED — the whole point. Max 60 days out.
 *   category: business    # business | event | community
 *   from: "Samascott's Garden Market"
 *   place: samascotts     # optional — surfaces on that place's page
 *   ---
 *   Strawberries are in. Pick-your-own opens Saturday.
 *
 * Body is capped at 280 characters (enforced by seo-check; the lighter the
 * unit, the more businesses will actually use it).
 */
const corkboard = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/corkboard' }),
  schema: z
    .object({
      posted: z.coerce.date(),
      expires: z.coerce.date(),
      category: z.enum(['business', 'event', 'community']),
      from: z.string().min(1),
      place: z
        .string()
        .optional()
        .refine((slug) => slug === undefined || placeSlugs.has(slug), {
          message: 'place must match a slug in src/data/places.ts',
        }),
    })
    .refine((d) => d.expires.getTime() >= d.posted.getTime(), {
      message: 'expires must be on or after posted',
    })
    .refine(
      (d) => d.expires.getTime() - d.posted.getTime() <= MAX_POST_DAYS * 24 * 60 * 60 * 1000,
      { message: `posts may live at most ${MAX_POST_DAYS} days — shorter is the point` },
    ),
});

export const collections = { notes, corkboard };

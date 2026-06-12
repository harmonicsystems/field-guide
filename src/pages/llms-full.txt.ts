import type { APIRoute } from 'astro';
import { places } from '../data/places';
import { placeMarkdown } from '../data/placeMarkdown';
import { landmarks } from '../data/landmarks';
import { liveNotes, noteDateLabel } from '../data/fieldNotes';
import {
  livePosts,
  corkboardCategoryOrder,
  corkboardCategoryLabels,
} from '../data/corkboard';

export const prerender = true;

/**
 * Full-text export of the guide — every place entry, every live field note,
 * the landmarks — regenerated on every build so it is always current.
 * Companion to /llms.txt (the short index); this is the whole thing.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://field-guide.feed-and-seed.com'))
    .toString()
    .replace(/\/$/, '');
  const now = new Date();

  const lines: string[] = [];
  lines.push('# Field Guide — full text');
  lines.push('');
  lines.push(
    '> A curated field guide to Kinderhook, NY and the small places nearby. Kept by Feed & Seed, a barn in Kinderhook. The list is short on purpose — everywhere in it is somewhere we would actually go. This file is the complete text of the guide, regenerated nightly.',
  );
  lines.push('');
  lines.push(
    'The Village of Kinderhook ("Old Kinderhook") sits in Columbia County, NY, in the upper Hudson Valley / Capital Region — roughly 25 miles south of Albany and 10 miles north of Hudson. Walking times measure from the Village Green. The short index lives at /llms.txt; structured data at /places.json.',
  );
  lines.push('');

  for (const p of places) {
    lines.push(placeMarkdown(p, base, now, '##'));
    lines.push('');
  }

  const notes = await liveNotes(now);
  if (notes.length > 0) {
    lines.push('## Field notes');
    lines.push('');
    lines.push('Dated micro-observations. Notes expire when they stop being true.');
    lines.push('');
    for (const note of notes) {
      const place = note.data.place
        ? places.find((p) => p.slug === note.data.place)
        : undefined;
      const label = place
        ? `${noteDateLabel(note.data.date)} · ${place.name}`
        : noteDateLabel(note.data.date);
      lines.push(`### ${label}`);
      lines.push('');
      lines.push((note.body ?? '').trim());
      lines.push('');
    }
  }

  const posts = await livePosts(now);
  if (posts.length > 0) {
    lines.push('## The corkboard (current notices)');
    lines.push('');
    lines.push(
      `Community bulletin board, human-moderated. Every post expires on its own; everything below is current as of this build. Live page: ${base}/corkboard/`,
    );
    lines.push('');
    for (const cat of corkboardCategoryOrder) {
      const inCat = posts.filter((p) => p.data.category === cat);
      if (inCat.length === 0) continue;
      lines.push(`### ${corkboardCategoryLabels[cat]}`);
      lines.push('');
      for (const post of inCat) {
        const expires = post.data.expires.toISOString().slice(0, 10);
        lines.push(`- ${(post.body ?? '').trim()} — *${post.data.from}* (until ${expires})`);
      }
      lines.push('');
    }
  }

  const parks = landmarks.filter((l) => l.kind === 'park');
  const historic = landmarks.filter((l) => l.kind === 'historic');
  lines.push('## Landmarks');
  lines.push('');
  lines.push('### Parks');
  lines.push('');
  for (const l of parks) {
    lines.push(l.description ? `- **${l.name}** — ${l.description}` : `- **${l.name}**`);
  }
  lines.push('');
  lines.push('### Historic sites');
  lines.push('');
  for (const l of historic) {
    lines.push(l.description ? `- **${l.name}** — ${l.description}` : `- **${l.name}**`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Field Guide to Kinderhook, NY — kept by Feed & Seed. Canonical: ${base}/`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

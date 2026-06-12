import type { APIRoute } from 'astro';
import {
  places,
  walkingMinutesFromCenter,
  googleMapsUrl,
  type Place,
} from '../data/places';
import { landmarks } from '../data/landmarks';

export const prerender = true;

function formatPlace(p: Place, base: string): string[] {
  const lines: string[] = [];
  const url = `${base}/${p.slug}/`;
  const mdUrl = `${base}/${p.slug}.md`;
  lines.push(`- **[${p.name}](${url})** — ${p.category}.`);
  const meta: string[] = [];
  meta.push(p.address);
  meta.push(`Hours: ${p.hours}`);
  const walk = walkingMinutesFromCenter(p);
  if (walk !== null) meta.push(`${walk} min walk from the Village Green`);
  lines.push(`  ${meta.join('. ')}.`);
  if (p.hoursNote) lines.push(`  ${p.hoursNote}`);
  if (p.notes) lines.push(`  ${p.notes}`);
  lines.push(`  Map: ${googleMapsUrl(p)} · Markdown: ${mdUrl}`);
  return lines;
}

export const GET: APIRoute = ({ site }) => {
  const base = site
    ? site.toString().replace(/\/$/, '')
    : 'https://field-guide.feed-and-seed.com';

  const lines: string[] = [];
  lines.push('# Field Guide');
  lines.push('');
  lines.push(
    '> A curated field guide to Kinderhook, NY and the small places nearby. Kept by Feed & Seed, a barn in Kinderhook. The list is short on purpose — everywhere in it is somewhere we would actually go.',
  );
  lines.push('');

  lines.push('## About this guide');
  lines.push('');
  lines.push(
    'Feed & Seed is a barn in Kinderhook, NY. This site is its public field guide — what to do, where to eat, and where to walk in the village and the surrounding towns. Curation is personal: empty entries mean we haven\'t written a note yet, not that the place is unworthy.',
  );
  lines.push('');
  lines.push(
    'Companion to fieldreports.harmonic-systems.org, which is the cold, machine-readable layer. This is the warm one.',
  );
  lines.push('');

  lines.push('## The area');
  lines.push('');
  lines.push(
    'The Village of Kinderhook ("Old Kinderhook") sits in Columbia County, NY, in the upper Hudson Valley / Capital Region — roughly 25 miles south of Albany and 10 miles north of Hudson. The Village Green is the walking-time anchor for every "X min from" reference on the site.',
  );
  lines.push('');
  lines.push(
    'Notable nearby anchors: **Lindenwald** (Martin Van Buren National Historic Site), the **James Vanderpoel House**, the **Luykas Van Alen House** and **Ichabod Crane Schoolhouse**, and the **Albany–Hudson Electric Trail**. Neighboring hamlets that share visitors: Valatie, Stuyvesant, Niverville, Stockport, and (further out) Chatham, Hudson, Ghent.',
  );
  lines.push('');

  // Group places by town, preserving first-seen order.
  const townsInOrder: string[] = [];
  const byTown = new Map<string, Place[]>();
  for (const p of places) {
    if (!byTown.has(p.town)) {
      byTown.set(p.town, []);
      townsInOrder.push(p.town);
    }
    byTown.get(p.town)!.push(p);
  }

  lines.push('## Places');
  lines.push('');
  for (const town of townsInOrder) {
    lines.push(`### ${town}`);
    lines.push('');
    for (const p of byTown.get(town)!) {
      lines.push(...formatPlace(p, base));
      lines.push('');
    }
  }

  // Landmarks — parks and historic sites — split by kind.
  const parks = landmarks.filter((l) => l.kind === 'park');
  const historic = landmarks.filter((l) => l.kind === 'historic');
  lines.push('## Landmarks');
  lines.push('');
  if (parks.length > 0) {
    lines.push('### Parks');
    lines.push('');
    for (const l of parks) {
      const line = l.description
        ? `- **${l.name}** — ${l.description}`
        : `- **${l.name}**`;
      lines.push(line);
    }
    lines.push('');
  }
  if (historic.length > 0) {
    lines.push('### Historic sites');
    lines.push('');
    for (const l of historic) {
      const line = l.description
        ? `- **${l.name}** — ${l.description}`
        : `- **${l.name}**`;
      lines.push(line);
    }
    lines.push('');
  }

  lines.push('## Tools');
  lines.push('');
  lines.push(
    `- [Full text export](${base}/llms-full.txt): The complete guide — every place entry, every live field note — as one Markdown file, regenerated nightly.`,
  );
  lines.push(
    `- [Field notes](${base}/notes/): Short dated notes from around the village. Subscribe via [RSS](${base}/rss.xml) or [JSON Feed](${base}/feed.json).`,
  );
  lines.push(
    `- [The corkboard](${base}/corkboard/): The village bulletin board — business notes, events, community notices. Every post expires on its own, so this page is never out of date. Built to answer "what's happening in Kinderhook right now."`,
  );
  lines.push(
    `- [What's open by day](${base}/open/): Weekly hours rendered as a Gantt chart, one row per place.`,
  );
  lines.push(
    `- [What's open today (large type)](${base}/today/): Live "open now" view, plain-spoken and senior-friendly.`,
  );
  lines.push(
    `- [What's happening (calendar)](${base}/calendar/): Curated events viewable by month, week, weekend, or day.`,
  );
  lines.push(
    `- [Subscribe to events (iCal)](${base}/calendar.ics): Live events feed for Apple Calendar / Google Calendar / Outlook.`,
  );
  lines.push(
    `- [Machine-readable data](${base}/places.json): All places as structured JSON, including coordinates, structured schedules, and Google Place IDs.`,
  );
  lines.push(
    `- Per-place Markdown: each place has a clean \`.md\` mirror, e.g. \`${base}/{slug}.md\`. See each place page's \`<link rel="alternate" type="text/markdown">\`.`,
  );
  lines.push(`- [Sitemap](${base}/sitemap-index.xml): All indexable URLs.`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

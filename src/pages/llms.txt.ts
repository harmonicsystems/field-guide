import type { APIRoute } from 'astro';
import { places } from '../data/places';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ? site.toString().replace(/\/$/, '') : 'https://field-guide.feed-and-seed.com';

  const lines: string[] = [];
  lines.push('# Field Guide');
  lines.push('');
  lines.push(
    '> A curated field guide to Kinderhook, NY and the small places nearby. Kept by David Nyman, who lives in the village. The list is short on purpose — everything in it is somewhere David would actually go.',
  );
  lines.push('');
  lines.push(
    'Companion to fieldreports.harmonic-systems.org, which is the cold, machine-readable layer. This is the warm one.',
  );
  lines.push('');
  lines.push('## Places');
  lines.push('');
  for (const p of places) {
    lines.push(`- [${p.name}](${base}/${p.slug}/): ${p.category}. ${p.town}. Hours: ${p.hours}.`);
  }
  lines.push('');
  lines.push('## Tools');
  lines.push('');
  lines.push(`- [What's open by day](${base}/open/): Weekly hours rendered as a Gantt chart, one row per place.`);
  lines.push(`- [What's happening (calendar)](${base}/calendar/): Curated events viewable by month, week, weekend, or day.`);
  lines.push(`- [Machine-readable data](${base}/places.json): All 23 entries as structured JSON, including coordinates, structured schedules, and Google Place IDs.`);
  lines.push(`- [Sitemap](${base}/sitemap-index.xml): All indexable URLs.`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

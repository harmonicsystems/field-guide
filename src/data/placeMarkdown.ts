import {
  googleMapsUrl,
  walkingMinutesFromCenter,
  dayKeys,
  dayLabels,
  type Place,
  type DayKey,
} from './places';
import { events, eventsInRange } from './events';

function fmt(s: string): string {
  const [h, m] = s.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function describeDay(p: Place, dk: DayKey): string {
  const d = p.schedule[dk];
  if (d === 'appt') return 'By appointment';
  if (d.length === 0) return 'Closed';
  return d.map((b) => `${fmt(b.open)}–${fmt(b.close)}`).join(', ');
}

function fmtEventDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtEventTime(occ: { allDay: boolean; start: Date; end: Date | null }): string {
  if (occ.allDay) return 'All day';
  const start = fmt(occ.start.toTimeString().slice(0, 5));
  if (!occ.end) return start;
  const end = fmt(occ.end.toTimeString().slice(0, 5));
  return `${start}–${end}`;
}

/**
 * One place as clean Markdown — the body of /{slug}.md and the per-place
 * sections of /llms-full.txt. `heading` controls the title depth so the
 * full-text export can nest places under its own headings.
 */
export function placeMarkdown(
  place: Place,
  base: string,
  now: Date = new Date(),
  heading: '#' | '##' = '#',
): string {
  const sub = heading === '#' ? '##' : '###';
  const canonical = `${base}/${place.slug}/`;

  const lines: string[] = [];
  lines.push(`${heading} ${place.name}`);
  lines.push('');
  lines.push(`> ${place.category} · ${place.town}`);
  lines.push('');

  if (place.notes) {
    lines.push(place.notes);
    lines.push('');
  }

  lines.push(`${sub} At a glance`);
  lines.push('');
  lines.push(`- **Address:** ${place.address}`);
  lines.push(`- **Hours:** ${place.hours}`);
  if (place.hoursNote) lines.push(`- **Note:** ${place.hoursNote}`);
  if (place.lastVerified) lines.push(`- **Hours last verified:** ${place.lastVerified}`);
  if (place.phone) lines.push(`- **Phone:** ${place.phone}`);
  const walk = walkingMinutesFromCenter(place);
  if (walk !== null) {
    lines.push(`- **Walk from Village Green:** ${walk} min`);
  }
  lines.push(`- **Google Maps:** ${googleMapsUrl(place)}`);
  lines.push(`- **Coordinates:** ${place.lat}, ${place.lng}`);
  lines.push('');

  lines.push(`${sub} Hours by day`);
  lines.push('');
  for (const dk of dayKeys) {
    lines.push(`- **${dayLabels[dk].long}:** ${describeDay(place, dk)}`);
  }
  lines.push('');

  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const upcoming = eventsInRange(
    events.filter((e) => e.placeSlug === place.slug),
    now,
    horizon,
  );
  if (upcoming.length > 0) {
    lines.push(`${sub} Upcoming here (next 60 days)`);
    lines.push('');
    for (const occ of upcoming) {
      lines.push(`- ${fmtEventDate(occ.start)} · ${fmtEventTime(occ)} — ${occ.event.title}`);
    }
    lines.push('');
  }

  lines.push(`Canonical: ${canonical}`);
  return lines.join('\n');
}

import type { APIRoute } from 'astro';
import { events, isAllDay, parseEventDate } from '../data/events';
import { places, type DayKey } from '../data/places';

export const prerender = true;

const dayKeyToICalBYDAY: Record<DayKey, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
  sat: 'SA',
  sun: 'SU',
};

function fmtICalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function fmtICalDateTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${fmtICalDate(d)}T${h}${mi}00`;
}

function escapeICalText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

export const GET: APIRoute = ({ site }) => {
  const base = site
    ? site.toString().replace(/\/$/, '')
    : 'https://field-guide.feed-and-seed.com';

  const placeBySlug = new Map(places.map((p) => [p.slug, p]));
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Feed & Seed//Field Guide//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:Field Guide — Kinderhook, NY');
  lines.push('X-WR-CALDESC:Events from the Field Guide. Kept by Feed & Seed.');
  lines.push('X-WR-TIMEZONE:America/New_York');

  // VTIMEZONE for America/New_York (post-2007 DST rules)
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:America/New_York');
  lines.push('BEGIN:DAYLIGHT');
  lines.push('TZOFFSETFROM:-0500');
  lines.push('TZOFFSETTO:-0400');
  lines.push('TZNAME:EDT');
  lines.push('DTSTART:19700308T020000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU');
  lines.push('END:DAYLIGHT');
  lines.push('BEGIN:STANDARD');
  lines.push('TZOFFSETFROM:-0400');
  lines.push('TZOFFSETTO:-0500');
  lines.push('TZNAME:EST');
  lines.push('DTSTART:19701101T020000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');

  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@field-guide.feed-and-seed.com`);
    lines.push(`SUMMARY:${escapeICalText(e.title)}`);

    const allDay = isAllDay(e);
    const start = parseEventDate(e.start);
    const end = e.end ? parseEventDate(e.end) : null;

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtICalDate(start)}`);
      // For all-day events iCal DTEND is exclusive — add a day to the inclusive end.
      const dtend = end ? new Date(end) : new Date(start);
      dtend.setDate(dtend.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${fmtICalDate(dtend)}`);
    } else {
      lines.push(`DTSTART;TZID=America/New_York:${fmtICalDateTime(start)}`);
      if (end) {
        lines.push(`DTEND;TZID=America/New_York:${fmtICalDateTime(end)}`);
      }
    }

    if (e.recurring) {
      const days = e.recurring.byDay.map((d) => dayKeyToICalBYDAY[d]).join(',');
      let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${days}`;
      if (e.recurring.until) {
        // UNTIL must be in UTC per RFC 5545; use end-of-day to include the boundary.
        const u = parseEventDate(e.recurring.until);
        u.setHours(23, 59, 59);
        rrule += `;UNTIL=${fmtICalDate(u)}T235959Z`;
      }
      lines.push(rrule);
    }

    let location = '';
    if (e.placeSlug) {
      const place = placeBySlug.get(e.placeSlug);
      if (place) location = `${place.name}, ${place.address}`;
    } else if (e.locationOverride) {
      location = e.locationOverride;
    }
    if (location) lines.push(`LOCATION:${escapeICalText(location)}`);

    let url = e.url;
    if (!url && e.placeSlug) url = `${base}/${e.placeSlug}/`;
    if (url) lines.push(`URL:${url}`);

    if (e.description) lines.push(`DESCRIPTION:${escapeICalText(e.description)}`);

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires CRLF line endings.
  const body = lines.join('\r\n') + '\r\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="field-guide.ics"',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

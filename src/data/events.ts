import type { DayKey } from './places';

export type EventCategory =
  | 'arts'
  | 'food'
  | 'civic'
  | 'market'
  | 'music'
  | 'kids'
  | 'community'
  | 'other';

export interface FieldEvent {
  /** URL-safe unique id. */
  id: string;
  title: string;
  description?: string;
  /** Reference to a Place.slug in places.ts. Optional if venue isn't in the guide. */
  placeSlug?: string;
  /** Free-text location if no Place match. */
  locationOverride?: string;
  /** "YYYY-MM-DD" for all-day events, "YYYY-MM-DDTHH:MM" (local time) for timed. */
  start: string;
  /** Optional end. Same format as start. For all-day multi-day events, "YYYY-MM-DD". */
  end?: string;
  /** Weekly recurrence. The `start` defines the first occurrence's time-of-day. */
  recurring?: {
    freq: 'weekly';
    byDay: DayKey[];
    /** Inclusive end of recurrence (YYYY-MM-DD). Omit for indefinite. */
    until?: string;
  };
  url?: string;
  category?: EventCategory;
}

/** Parse "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" as a LOCAL Date (no UTC shift). */
export function parseEventDate(s: string): Date {
  const datePart = s.slice(0, 10);
  const timePart = s.length > 10 ? s.slice(11) : null;
  const [y, mo, d] = datePart.split('-').map(Number);
  if (timePart) {
    const [h, mi] = timePart.split(':').map(Number);
    return new Date(y, mo - 1, d, h ?? 0, mi ?? 0);
  }
  return new Date(y, mo - 1, d);
}

export function isAllDay(e: FieldEvent): boolean {
  return !e.start.includes('T');
}

/** Stable category color tokens. */
export const categoryLabels: Record<EventCategory, string> = {
  arts: 'Arts',
  food: 'Food',
  civic: 'Civic',
  market: 'Market',
  music: 'Music',
  kids: 'Kids',
  community: 'Community',
  other: 'Other',
};

/**
 * Curated events. Only things David can personally vouch for go here.
 *
 * Event shape (reference — do not copy verbatim as a real event):
 *
 *   {
 *     id: 'unique-slug-string',
 *     title: 'Event Name',
 *     description: 'Optional. One or two sentences of context.',
 *     placeSlug: 'matching-slug-from-places.ts',   // optional
 *     locationOverride: 'Free-text location',      // use if no placeSlug
 *     start: 'YYYY-MM-DDTHH:MM',                   // ISO local; omit time for all-day
 *     end: 'YYYY-MM-DDTHH:MM',                     // optional
 *     recurring: {                                  // optional
 *       freq: 'weekly',
 *       byDay: ['sat'],                            // 'mon' | 'tue' | ... | 'sun'
 *       until: 'YYYY-MM-DD',                       // optional
 *     },
 *     url: 'https://example.com',                  // optional external link
 *     category: 'arts',                            // arts | food | civic | market | music | kids | community | other
 *   }
 */
export const events: FieldEvent[] = [];

const dayKeyToJSDay: Record<DayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export interface EventOccurrence {
  event: FieldEvent;
  start: Date;
  end: Date | null;
  allDay: boolean;
}

/**
 * Return all occurrences of an event whose start falls within [rangeStart, rangeEnd].
 * For recurring events, expands all matching weekdays in range.
 */
export function expandOccurrences(
  e: FieldEvent,
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  const allDay = isAllDay(e);

  if (!e.recurring) {
    const start = parseEventDate(e.start);
    const end = e.end ? parseEventDate(e.end) : null;
    const occurrenceEnd = end ?? start;
    if (occurrenceEnd < rangeStart || start > rangeEnd) return [];
    return [{ event: e, start, end, allDay }];
  }

  const seriesStart = parseEventDate(e.start);
  const until = e.recurring.until
    ? parseEventDate(e.recurring.until)
    : new Date(2099, 0, 1);
  const targetDays = new Set(e.recurring.byDay.map((d) => dayKeyToJSDay[d]));

  const occurrences: EventOccurrence[] = [];
  const walkStart = new Date(Math.max(rangeStart.getTime(), seriesStart.getTime()));
  walkStart.setHours(0, 0, 0, 0);
  const walkEnd = new Date(Math.min(rangeEnd.getTime(), until.getTime()));

  const durationMs = e.end
    ? parseEventDate(e.end).getTime() - seriesStart.getTime()
    : 0;

  for (
    const d = new Date(walkStart);
    d <= walkEnd;
    d.setDate(d.getDate() + 1)
  ) {
    if (!targetDays.has(d.getDay())) continue;
    const occStart = new Date(d);
    occStart.setHours(
      seriesStart.getHours(),
      seriesStart.getMinutes(),
      0,
      0,
    );
    const occEnd = durationMs > 0 ? new Date(occStart.getTime() + durationMs) : null;
    occurrences.push({ event: e, start: occStart, end: occEnd, allDay });
  }
  return occurrences;
}

export function eventsInRange(
  all: FieldEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  return all
    .flatMap((e) => expandOccurrences(e, rangeStart, rangeEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

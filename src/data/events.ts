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
 * Event shape:
 *   id: unique slug
 *   title, description (optional)
 *   placeSlug (optional, must match places.ts) OR locationOverride (free-text)
 *   start: 'YYYY-MM-DDTHH:MM' (timed) or 'YYYY-MM-DD' (all-day)
 *   end: optional, same format
 *   recurring: { freq: 'weekly', byDay: ['sat'], until: 'YYYY-MM-DD' } — optional
 *   url: optional external link
 *   category: arts | food | civic | market | music | kids | community | other
 *
 * Many of the entries below were imported from harmonicsystems/market on
 * 2026-05-12 — see scripts in commit history. To add new events, append to
 * this array. Slug duplicates within the array will produce duplicate UIDs.
 */
export const events: FieldEvent[] = [
  // Recurring backbone: the Saturday market itself. Ends 2026-10-24 so the
  // explicit "Final Market Day of 2026" (Oct 31) below isn't doubled up.
  {
    id: 'kinderhook-farmers-market-2026-season',
    title: 'Kinderhook Farmers Market',
    description: 'Weekly Saturday market on the Village Green — May through October.',
    placeSlug: 'kinderhook-farmers-market',
    start: '2026-05-02T08:30',
    end: '2026-05-02T12:30',
    recurring: { freq: 'weekly', byDay: ['sat'], until: '2026-10-24' },
    category: 'market',
  },

  // --- Imported from harmonicsystems/market on 2026-05-12 ---
  {
    id: 'fall-festival',
    title: 'Fall Festival & Kinderhook Makers Market',
    description:
      'Fall Festival — extended market day with the Kinderhook Makers Market joining the Farmers Market on the Village Green.',
    placeSlug: 'kinderhook-farmers-market',
    start: '2026-10-10T08:30',
    end: '2026-10-10T14:00',
    category: 'community',
  },
  {
    id: 'fall-yard-sale',
    title: 'Village-Wide Fall Yard Sale',
    description: 'Village-wide fall yard sale — treasures scattered across Kinderhook. Runs 9 AM until sold out.',
    locationOverride: 'Throughout the Village',
    start: '2026-09-19T09:00',
    category: 'community',
  },
  {
    id: 'festival-of-the-unknown',
    title: 'Festival of the Unknown',
    description:
      'Lectures and panel discussions on cryptozoology, ufology, and parapsychology, plus author meet-and-greets, vendors, and a documentary screening about local cryptids.',
    placeSlug: 'kinderhook-library',
    start: '2026-05-16T11:00',
    end: '2026-05-16T14:00',
    url: 'https://kinderhooklibrary.org/event/festival-of-the-unknown-3/',
    category: 'civic',
  },
  {
    id: 'final-market-day-2026',
    title: 'Final Market Day of 2026',
    description: 'The last Saturday of the 2026 Kinderhook Farmers Market season. See you next spring!',
    placeSlug: 'kinderhook-farmers-market',
    start: '2026-10-31T08:30',
    end: '2026-10-31T12:30',
    category: 'food',
  },
  {
    id: 'fyfe-drumms-muster-parade',
    title: 'Fyfe & Drumms Muster & Parade',
    description: 'Muster and parade on Broad Street celebrating local Fyfe & Drumms traditions.',
    locationOverride: 'Broad Street',
    start: '2026-05-30T12:00',
    category: 'community',
  },
  {
    id: 'kinderhook-makers-market-2026-05-30',
    title: 'Kinderhook Makers Market — Extended Market Day',
    description:
      'Extended market day featuring the Kinderhook Farmers Market alongside the Kinderhook Makers Market.',
    placeSlug: 'kinderhook-farmers-market',
    start: '2026-05-30T08:30',
    end: '2026-05-30T14:00',
    category: 'community',
  },
  {
    id: 'kinderhook-pride-parade',
    title: 'Kinderhook Pride Parade',
    description: 'The Kinderhook Pride Parade — Hudson Street to Kinderhook Village Square.',
    locationOverride: 'Hudson Street to Kinderhook Village Square',
    start: '2026-06-27T14:00',
    category: 'community',
  },
  {
    id: 'modus-operandi-jack-shainman',
    title: 'Modus Operandi',
    description:
      "Season-opening group exhibition at Jack Shainman Gallery's landmark space on Broad Street. Works by El Anatsui, Radcliffe Bailey, Yoan Capote, Nick Cave, Mark Dion, Jannis Kounellis, Guillermo Kuitca, Wolfgang Laib, Amy Lincoln, Barry McGee, Meleko Mokgosi, Richard Mosse, Bruce Nauman, Elizabeth Neel, George Rickey, Faith Ringgold, Alexis Rockman, Susan Rothenberg, and Rose B. Simpson.",
    placeSlug: 'jack-shainman',
    start: '2026-05-30T14:00',
    url: 'https://jackshainman.com/',
    category: 'arts',
  },
  {
    id: 'ok-5k',
    title: 'OK 5K',
    description: "The OK 5K — Kinderhook's community road race. Time to be announced.",
    locationOverride: 'Kinderhook',
    start: '2026-06-06',
    category: 'community',
  },
  {
    id: 'peoples-parade-2026-07-04',
    title: "People's Parade",
    description:
      "KBPA's annual People's Parade kicks off from Rothermel Park. The farmers market runs extended hours to 1:30 PM.",
    locationOverride: 'Rothermel Park',
    start: '2026-07-04T11:30',
    category: 'community',
  },
  {
    id: 'persons-of-color-cemetery-tour',
    title: 'Persons of Color Cemetery Tour',
    description: 'Guided cemetery tour conducted by The Cultural Landscape Foundation. Times to be announced.',
    locationOverride: 'Kinderhook',
    start: '2026-06-06',
    category: 'community',
  },
  {
    id: 'rising-star-dance-academy-performance',
    title: 'Rising Star Dance Academy Performance',
    description: 'Rising Star Dance Academy performs live at the Kinderhook Farmers Market.',
    placeSlug: 'kinderhook-farmers-market',
    start: '2026-06-20T11:00',
    category: 'community',
  },
  {
    id: 'seen-scenes-opening-reception',
    title: 'Seen Scenes — Opening Reception',
    description:
      'Opening reception for Seen Scenes, the Create Council on the Arts Members Show 2026. On view June 5–28 at the Kinderhook Knitting Mill.',
    locationOverride: 'Kinderhook Knitting Mill',
    start: '2026-06-06T15:00',
    end: '2026-06-06T17:00',
    category: 'arts',
  },
  {
    id: 'spring-yard-sale',
    title: 'Village-Wide Spring Yard Sale',
    description: 'Village-wide spring yard sale — treasures scattered across Kinderhook. Runs 9 AM until sold out.',
    locationOverride: 'Throughout the Village',
    start: '2026-05-23T09:00',
    category: 'community',
  },
  {
    id: 'stories-for-pups-2026-06-06',
    title: 'Stories for Pups',
    description:
      'Young readers practice reading aloud to Windy, a certified therapy dog, in a welcoming, judgment-free environment.',
    placeSlug: 'kinderhook-library',
    start: '2026-06-06T13:00',
    end: '2026-06-06T14:00',
    url: 'https://kinderhooklibrary.org/event/stories-for-pups-4/2026-06-06/',
    category: 'civic',
  },
  {
    id: 'stories-for-pups-2026-05-02',
    title: 'Stories for Pups',
    description:
      'Young readers practice reading aloud to Windy, a certified therapy dog, in a welcoming, judgment-free environment.',
    placeSlug: 'kinderhook-library',
    start: '2026-05-02T13:00',
    end: '2026-05-02T14:00',
    url: 'https://kinderhooklibrary.org/event/stories-for-pups-4/2026-05-02/',
    category: 'civic',
  },
  {
    id: 'super-stories-mothers-day-card-making',
    title: "Open Maker Hours — Mother's Day Card Making",
    description: "Drop in to Super Stories' open maker hours and make a card for Mother's Day.",
    placeSlug: 'super-stories',
    start: '2026-05-09T10:00',
    end: '2026-05-09T12:00',
    category: 'community',
  },
  {
    id: 'travel-planning-made-easy',
    title: 'Travel Planning Made Easy',
    description:
      'Practical tools for budgeting, packing, evaluating options, and building an itinerary for your next trip.',
    placeSlug: 'kinderhook-library',
    start: '2026-05-09T14:00',
    end: '2026-05-09T15:00',
    url: 'https://kinderhooklibrary.org/event/travel-planning-made-easy/',
    category: 'civic',
  },
  {
    id: 'volunteer-fair',
    title: 'Volunteer Fair',
    description:
      "The library's inaugural volunteer fair — meet local nonprofits that need help and learn about their missions, time commitments, and skills needed.",
    placeSlug: 'kinderhook-library',
    start: '2026-06-13T10:00',
    end: '2026-06-13T14:00',
    url: 'https://kinderhooklibrary.org/event/volunteer-fair/',
    category: 'civic',
  },
];

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

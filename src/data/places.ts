export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type TimeBlock = { open: string; close: string };

/** Empty array = closed all day. 'appt' = by appointment / by program. */
export type DaySchedule = TimeBlock[] | 'appt';

export type Schedule = Record<DayKey, DaySchedule>;

export const dayKeys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const dayLabels: Record<DayKey, { short: string; long: string }> = {
  mon: { short: 'Mon', long: 'Monday' },
  tue: { short: 'Tue', long: 'Tuesday' },
  wed: { short: 'Wed', long: 'Wednesday' },
  thu: { short: 'Thu', long: 'Thursday' },
  fri: { short: 'Fri', long: 'Friday' },
  sat: { short: 'Sat', long: 'Saturday' },
  sun: { short: 'Sun', long: 'Sunday' },
};

/** Convert JS Date.getDay() (0=Sun) to our DayKey. */
export function dayKeyFromDate(d: Date): DayKey {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[d.getDay()];
}

const at = (open: string, close: string): TimeBlock => ({ open, close });

/** schema.org type. Refined per place; defaults to LocalBusiness. */
export type SchemaType =
  | 'LocalBusiness'
  | 'Restaurant'
  | 'CafeOrCoffeeShop'
  | 'Bakery'
  | 'BarOrPub'
  | 'Winery'
  | 'Store'
  | 'GroceryStore'
  | 'BookStore'
  | 'ArtGallery'
  | 'Library';

export interface Place {
  slug: string;
  name: string;
  category: string;
  town: string;
  address: string;
  phone: string | null;
  hours: string;
  schedule: Schedule;
  schemaType: SchemaType;
  /** Google Place ID. Null for venues without one (e.g. the Village Green). */
  placeId: string | null;
  lat: number;
  lng: number;
  googleRating: string;
  /** Empty for now. This is the field-guide voice — David's curation. */
  notes: string;
}

/** The Kinderhook Village Green — used as the reference point for walking-time labels. */
export const villageCenter = { lat: 42.3953, lng: -73.6984 };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Walking minutes from the Village Green for places in Kinderhook proper.
 * Returns null for places outside the village (too far to walk in any
 * useful sense), or for places literally on the green.
 */
export function walkingMinutesFromCenter(place: Place): number | null {
  if (place.town !== 'Kinderhook, NY') return null;
  const km = haversineKm(place.lat, place.lng, villageCenter.lat, villageCenter.lng);
  if (km < 0.02) return null; // place is on the Village Green itself
  const minutes = (km * 1000) / 80; // ~80 m/min ≈ 4.8 km/h
  return Math.max(1, Math.round(minutes));
}

/**
 * Abstracted popularity from googleRating — three categories, plus null.
 * Avoids surfacing hard numbers in user-facing UI while still conveying signal.
 */
export type PopularityLabel = 'Local favorite' | 'Quiet pick' | 'Popular';

export function popularityLabel(googleRating: string): PopularityLabel | null {
  const m = googleRating.match(/^([\d.]+)\s*\((\d+)\)/);
  if (!m) return null;
  const rating = parseFloat(m[1]);
  const count = parseInt(m[2], 10);
  if (count >= 100 && rating >= 4.7) return 'Local favorite';
  if (count < 50 && rating >= 4.7) return 'Quiet pick';
  if (count >= 200 && rating < 4.7) return 'Popular';
  return null;
}

/** Is `place` currently open? If yes, return the closing time of the active block. */
export function isOpenNow(
  schedule: Schedule,
  now: Date = new Date(),
): { open: true; closesAt: string } | { open: false; reason: 'closed' | 'appt' } {
  const dayKey = dayKeyFromDate(now);
  const day = schedule[dayKey];
  if (day === 'appt') return { open: false, reason: 'appt' };
  if (day.length === 0) return { open: false, reason: 'closed' };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const block of day) {
    const [oh, om] = block.open.split(':').map(Number);
    const [ch, cm] = block.close.split(':').map(Number);
    const startMin = oh * 60 + om;
    const endMin = ch * 60 + cm;
    if (nowMin >= startMin && nowMin < endMin) {
      return { open: true, closesAt: block.close };
    }
  }
  return { open: false, reason: 'closed' };
}

const dayToSchemaDay: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Parse "3 Albany Ave, Kinderhook, NY 12106" → PostalAddress LD shape. */
export function parseAddressLD(addr: string) {
  const parts = addr.split(',').map((s) => s.trim());
  const stateZip = parts[parts.length - 1] ?? '';
  const addressLocality = parts[parts.length - 2] ?? '';
  const streetAddress = parts.slice(0, -2).join(', ');
  const [addressRegion = '', postalCode = ''] = stateZip.split(/\s+/);
  return {
    '@type': 'PostalAddress' as const,
    streetAddress,
    addressLocality,
    addressRegion,
    postalCode,
    addressCountry: 'US',
  };
}

export function placeOpeningHoursLD(p: Place) {
  const specs: Array<Record<string, string>> = [];
  for (const day of dayKeys) {
    const d = p.schedule[day];
    if (d === 'appt') continue;
    for (const block of d) {
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${dayToSchemaDay[day]}`,
        opens: block.open,
        closes: block.close,
      });
    }
  }
  return specs;
}

export function placeLD(p: Place, baseUrl: string) {
  const url = `${baseUrl}/${p.slug}/`;
  const description = p.notes ? p.notes : `${p.category}. ${p.town}.`;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': p.schemaType,
    '@id': url,
    name: p.name,
    description,
    url,
    address: parseAddressLD(p.address),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: p.lat,
      longitude: p.lng,
    },
    sameAs: [googleMapsUrl(p)],
  };
  if (p.phone) ld.telephone = p.phone;
  const hours = placeOpeningHoursLD(p);
  if (hours.length > 0) ld.openingHoursSpecification = hours;
  return ld;
}

export function breadcrumbLD(p: Place, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Field Guide',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: p.name,
      },
    ],
  };
}

export function collectionLD(allPlaces: Place[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/`,
    url: `${baseUrl}/`,
    name: 'Field Guide — Kinderhook, NY',
    description:
      'A curated field guide to Kinderhook, NY and the small places nearby — kept by Feed & Seed, a barn in Kinderhook.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allPlaces.length,
      itemListElement: allPlaces.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${baseUrl}/${p.slug}/`,
        name: p.name,
      })),
    },
  };
}

export const places: Place[] = [
  {
    slug: 'hamrahs',
    schemaType: 'Restaurant',
    name: "Hamrah's Lebanese Foods",
    category: 'Food — Lebanese / takeaway',
    town: 'Kinderhook, NY',
    address: '3 Albany Ave, Kinderhook, NY 12106',
    phone: '+1 518-610-8235',
    hours: 'Wed 12–2p; Thu 12–6p; Fri–Sat 12–7p; closed Sun–Tue',
    schedule: {
      mon: [],
      tue: [],
      wed: [at('12:00', '14:00')],
      thu: [at('12:00', '18:00')],
      fri: [at('12:00', '19:00')],
      sat: [at('12:00', '19:00')],
      sun: [],
    },
    placeId: 'ChIJrRWosemN3YkR8WzIeHDwbB4',
    lat: 42.3956891,
    lng: -73.6986972,
    googleRating: '5.0 (45)',
    notes: '',
  },
  {
    slug: 'samascotts',
    schemaType: 'Store',
    name: "Samascott's Garden Market",
    category: 'Market — nursery / farm market / ice cream',
    town: 'Kinderhook, NY',
    address: '65 Chatham St, Kinderhook, NY 12106',
    phone: '+1 518-217-2249',
    hours: 'Daily 9a–8p',
    schedule: {
      mon: [at('09:00', '20:00')],
      tue: [at('09:00', '20:00')],
      wed: [at('09:00', '20:00')],
      thu: [at('09:00', '20:00')],
      fri: [at('09:00', '20:00')],
      sat: [at('09:00', '20:00')],
      sun: [at('09:00', '20:00')],
    },
    placeId: 'ChIJUZSecWHu3YkRxP54VhDt9JY',
    lat: 42.4037866,
    lng: -73.6944785,
    googleRating: '4.7 (272)',
    notes: '',
  },
  {
    slug: 'greenhouse-cidery',
    schemaType: 'Winery',
    name: 'The Greenhouse Cidery',
    category: 'Drink — cidery / Thai food / outdoor',
    town: 'Chatham, NY',
    address: '2309 NY-203, Chatham, NY 12037',
    phone: null,
    hours: 'Thu–Fri 5–9p; Sat 12–9p; closed Sun–Wed (seasonal — closed after ~Nov 1)',
    schedule: {
      mon: [],
      tue: [],
      wed: [],
      thu: [at('17:00', '21:00')],
      fri: [at('17:00', '21:00')],
      sat: [at('12:00', '21:00')],
      sun: [],
    },
    placeId: 'ChIJnYf13iDz3YkRDS3ZfYh79iY',
    lat: 42.3760805,
    lng: -73.6346502,
    googleRating: '5.0 (31)',
    notes: '',
  },
  {
    slug: 'chatham-berry-farm',
    schemaType: 'LocalBusiness',
    name: 'The Chatham Berry Farm',
    category: 'Farm / market / pick-your-own',
    town: 'Chatham, NY',
    address: '2309 NY-203, Chatham, NY 12037',
    phone: '+1 518-392-4609',
    hours: 'Daily 8a–6p',
    schedule: {
      mon: [at('08:00', '18:00')],
      tue: [at('08:00', '18:00')],
      wed: [at('08:00', '18:00')],
      thu: [at('08:00', '18:00')],
      fri: [at('08:00', '18:00')],
      sat: [at('08:00', '18:00')],
      sun: [at('08:00', '18:00')],
    },
    placeId: 'ChIJyxMsqo3z3YkR2iGa58j17-c',
    lat: 42.3760990,
    lng: -73.6344400,
    googleRating: '4.8 (138)',
    notes: '',
  },
  {
    slug: 'feast-and-floret',
    schemaType: 'Restaurant',
    name: 'feast & floret',
    category: 'Food — Italian / dinner / florist',
    town: 'Hudson, NY',
    address: '13 S 3rd St, Hudson, NY 12534',
    phone: '+1 518-822-1500',
    hours: 'Mon–Thu 5–10p; Fri–Sun 12–3p & 5–10p',
    schedule: {
      mon: [at('17:00', '22:00')],
      tue: [at('17:00', '22:00')],
      wed: [at('17:00', '22:00')],
      thu: [at('17:00', '22:00')],
      fri: [at('12:00', '15:00'), at('17:00', '22:00')],
      sat: [at('12:00', '15:00'), at('17:00', '22:00')],
      sun: [at('12:00', '15:00'), at('17:00', '22:00')],
    },
    placeId: 'ChIJdWQzHHKV3YkRpIVefILlOy4',
    lat: 42.2527188,
    lng: -73.7918413,
    googleRating: '4.6 (345)',
    notes: '',
  },
  {
    slug: 'antique-warehouse',
    schemaType: 'Store',
    name: 'The Antique Warehouse',
    category: 'Shopping — antiques / vintage',
    town: 'Hudson, NY',
    address: 'Door 21, 99 Front St, Hudson, NY 12534',
    phone: '+1 908-399-9445',
    hours: 'Mon–Thu 10a–5p; Fri–Sun 10a–6p',
    schedule: {
      mon: [at('10:00', '17:00')],
      tue: [at('10:00', '17:00')],
      wed: [at('10:00', '17:00')],
      thu: [at('10:00', '17:00')],
      fri: [at('10:00', '18:00')],
      sat: [at('10:00', '18:00')],
      sun: [at('10:00', '18:00')],
    },
    placeId: 'ChIJWWlcrtWV3YkRHiYb19EclI8',
    lat: 42.2508572,
    lng: -73.7988028,
    googleRating: '4.4 (397)',
    notes: '',
  },
  {
    slug: 'quinnies',
    schemaType: 'CafeOrCoffeeShop',
    name: "Quinnie's",
    category: 'Food — café / bar / playground',
    town: 'Hudson, NY (Rt 66)',
    address: '834 NY-66, Hudson, NY 12534',
    phone: '+1 518-697-3700',
    hours: 'Mon–Tue 9a–4p; Fri–Sat 9a–9p; Sun 9a–4p; closed Wed–Thu',
    schedule: {
      mon: [at('09:00', '16:00')],
      tue: [at('09:00', '16:00')],
      wed: [],
      thu: [],
      fri: [at('09:00', '21:00')],
      sat: [at('09:00', '21:00')],
      sun: [at('09:00', '16:00')],
    },
    placeId: 'ChIJe5vCxDjz3YkRLYuhzNRqMkY',
    lat: 42.2735391,
    lng: -73.7218160,
    googleRating: '4.7 (214)',
    notes: '',
  },
  {
    slug: 'ten-barn-farm',
    schemaType: 'Restaurant',
    name: 'Ten Barn Farm (The Kitchen)',
    category: 'Farm — Sunday brunch / chickens & goats / creek',
    town: 'Ghent, NY',
    address: '1142 Co Rte 22, Ghent, NY 12075',
    phone: '+1 518-267-8679',
    hours: 'Sun 9a–2p only',
    schedule: {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [at('09:00', '14:00')],
    },
    placeId: 'ChIJh9tuLint3YkRj8LRtiLfUqg',
    lat: 42.3206364,
    lng: -73.6899953,
    googleRating: '5.0 (20)',
    notes: '',
  },
  {
    slug: 'art-omi',
    schemaType: 'ArtGallery',
    name: 'Art Omi',
    category: 'Arts — outdoor sculpture park (120 acres)',
    town: 'Ghent, NY',
    address: '1405 Co Rte 22, Ghent, NY 12075',
    phone: '+1 518-392-4747',
    hours: 'Mon, Wed–Sun 9a–5p; closed Tue',
    schedule: {
      mon: [at('09:00', '17:00')],
      tue: [],
      wed: [at('09:00', '17:00')],
      thu: [at('09:00', '17:00')],
      fri: [at('09:00', '17:00')],
      sat: [at('09:00', '17:00')],
      sun: [at('09:00', '17:00')],
    },
    placeId: 'ChIJhVNv6Gvt3YkR2vjVkrbZros',
    lat: 42.3311545,
    lng: -73.6725110,
    googleRating: '4.8 (328)',
    notes: '',
  },
  {
    slug: 'bartlett-house',
    schemaType: 'Bakery',
    name: 'Bartlett House',
    category: 'Food — bakery / café / brunch',
    town: 'Ghent, NY',
    address: '2258 NY-66, Ghent, NY 12075',
    phone: '+1 518-392-7787',
    hours: 'Daily 8a–2p',
    schedule: {
      mon: [at('08:00', '14:00')],
      tue: [at('08:00', '14:00')],
      wed: [at('08:00', '14:00')],
      thu: [at('08:00', '14:00')],
      fri: [at('08:00', '14:00')],
      sat: [at('08:00', '14:00')],
      sun: [at('08:00', '14:00')],
    },
    placeId: 'ChIJhXLaTamS3YkRcjdq8YYx80M',
    lat: 42.3271858,
    lng: -73.6183784,
    googleRating: '4.5 (455)',
    notes: '',
  },
  {
    slug: 'hudson-chatham-winery',
    schemaType: 'Winery',
    name: 'Hudson Chatham Winery',
    category: 'Drink — winery / chickens / fire pits',
    town: 'Ghent, NY',
    address: '1900 NY-66, Ghent, NY 12075',
    phone: '+1 518-392-9463',
    hours: 'Thu–Sat 12–7p; Sun 12–5p; closed Mon–Wed',
    schedule: {
      mon: [],
      tue: [],
      wed: [],
      thu: [at('12:00', '19:00')],
      fri: [at('12:00', '19:00')],
      sat: [at('12:00', '19:00')],
      sun: [at('12:00', '17:00')],
    },
    placeId: 'ChIJtZA6LrDy3YkRw3-rfMKoXN8',
    lat: 42.3108802,
    lng: -73.6417505,
    googleRating: '4.8 (195)',
    notes: '',
  },
  {
    slug: 'rebus',
    schemaType: 'Store',
    name: 'Rebus',
    category: "Shopping — children's clothing & toys (curated)",
    town: 'Hudson, NY',
    address: '337 Warren St, Hudson, NY 12534',
    phone: '+1 518-821-4074',
    hours: 'Mon, Thu–Sun 11a–6p; closed Tue–Wed',
    schedule: {
      mon: [at('11:00', '18:00')],
      tue: [],
      wed: [],
      thu: [at('11:00', '18:00')],
      fri: [at('11:00', '18:00')],
      sat: [at('11:00', '18:00')],
      sun: [at('11:00', '18:00')],
    },
    placeId: 'ChIJ_YHSDGOV3YkRX4H_jVhjvYA',
    lat: 42.2519415,
    lng: -73.7901010,
    googleRating: '5.0 (28)',
    notes: '',
  },
  {
    slug: 'kinderhook-books',
    schemaType: 'BookStore',
    name: 'Kinderhook Books',
    category: 'Shopping — bookstore / wine bar',
    town: 'Kinderhook, NY',
    address: '10 Broad St, Kinderhook, NY 12106',
    phone: '+1 518-217-2192',
    hours: 'Fri 11a–6p; Sat 11a–5p; Sun 11a–4p; closed Mon–Thu',
    schedule: {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [at('11:00', '18:00')],
      sat: [at('11:00', '17:00')],
      sun: [at('11:00', '16:00')],
    },
    placeId: 'ChIJPW1DG6fv3YkRQ9dQYX9NcLs',
    lat: 42.3952406,
    lng: -73.6987936,
    googleRating: '4.8 (23)',
    notes: '',
  },
  {
    slug: 'broad-street-bagel',
    schemaType: 'Bakery',
    name: 'Broad Street Bagel Co.',
    category: 'Food — bagels / café',
    town: 'Kinderhook, NY',
    address: '1 Broad St, Kinderhook, NY 12106',
    phone: '+1 518-758-8084',
    hours: 'Mon–Thu & Sun 7a–3p; Fri–Sat 7a–4p',
    schedule: {
      mon: [at('07:00', '15:00')],
      tue: [at('07:00', '15:00')],
      wed: [at('07:00', '15:00')],
      thu: [at('07:00', '15:00')],
      fri: [at('07:00', '16:00')],
      sat: [at('07:00', '16:00')],
      sun: [at('07:00', '15:00')],
    },
    placeId: 'ChIJ0ck9pH3u3YkRjAYmojIbHtw',
    lat: 42.3949716,
    lng: -73.6987424,
    googleRating: '4.6 (390)',
    notes: '',
  },
  {
    slug: 'kinderhook-library',
    schemaType: 'Library',
    name: 'Kinderhook Memorial Library',
    category: 'Civic — public library / kids programs',
    town: 'Kinderhook, NY',
    address: '18 Hudson St, Kinderhook, NY 12106',
    phone: '+1 518-758-6192',
    hours: 'Tue–Thu 10a–8p; Fri 10a–5p; Sat 10a–4p; Sun 12–4p; closed Mon',
    schedule: {
      mon: [],
      tue: [at('10:00', '20:00')],
      wed: [at('10:00', '20:00')],
      thu: [at('10:00', '20:00')],
      fri: [at('10:00', '17:00')],
      sat: [at('10:00', '16:00')],
      sun: [at('12:00', '16:00')],
    },
    placeId: 'ChIJW8QLNnzu3YkR4lU8ysp7m7E',
    lat: 42.3939770,
    lng: -73.6972856,
    googleRating: '4.7 (21)',
    notes: '',
  },
  {
    slug: 'jack-shainman',
    schemaType: 'ArtGallery',
    name: 'The School — Jack Shainman Gallery',
    category: 'Arts — contemporary art gallery',
    town: 'Kinderhook, NY',
    address: '25 Broad St, Kinderhook, NY 12106',
    phone: '+1 518-758-1628',
    hours: 'By appointment / show schedule (check site)',
    schedule: {
      mon: 'appt',
      tue: 'appt',
      wed: 'appt',
      thu: 'appt',
      fri: 'appt',
      sat: 'appt',
      sun: 'appt',
    },
    placeId: 'ChIJDVp2tIDu3YkRU5K0jvZoX2k',
    lat: 42.3929896,
    lng: -73.7013068,
    googleRating: '4.8 (94)',
    notes: '',
  },
  {
    slug: 'saisonnier',
    schemaType: 'BarOrPub',
    name: 'Saisonnier',
    category: 'Food — beer bar / grilled cheese / tinned fish',
    town: 'Kinderhook, NY',
    address: '11 Chatham St, Kinderhook, NY 12106',
    phone: '+1 518-610-8100',
    hours: 'Mon 11:30a–9p; Thu 11:30a–9p; Fri–Sat 11:30a–10p; Sun 11:30a–7p; closed Tue–Wed',
    schedule: {
      mon: [at('11:30', '21:00')],
      tue: [],
      wed: [],
      thu: [at('11:30', '21:00')],
      fri: [at('11:30', '22:00')],
      sat: [at('11:30', '22:00')],
      sun: [at('11:30', '19:00')],
    },
    placeId: 'ChIJ2yyF9aDv3YkRTSeckEd05VA',
    lat: 42.3960020,
    lng: -73.6976420,
    googleRating: '4.9 (204)',
    notes: '',
  },
  {
    slug: 'super-stories',
    schemaType: 'LocalBusiness',
    name: 'Super-Stories',
    category: "Arts — kids' art studio / Saturday drop-ins",
    town: 'Kinderhook, NY',
    address: '2 Chatham St, Kinderhook, NY 12106',
    phone: '+1 508-353-3918',
    hours: 'Hours by program — check site',
    schedule: {
      mon: 'appt',
      tue: 'appt',
      wed: 'appt',
      thu: 'appt',
      fri: 'appt',
      sat: 'appt',
      sun: 'appt',
    },
    placeId: 'ChIJ3z4tao3v3YkRUPdQsySpvHs',
    lat: 42.3955207,
    lng: -73.6976052,
    googleRating: '5.0 (6)',
    notes: '',
  },
  {
    slug: 'tierra-farm',
    schemaType: 'Store',
    name: 'Tierra Farm',
    category: 'Market — coffee roastery / nuts & dried fruit',
    town: 'Valatie, NY',
    address: '2424 NY-203, Valatie, NY 12184',
    phone: '+1 888-674-6887',
    hours: 'Daily 9a–5p',
    schedule: {
      mon: [at('09:00', '17:00')],
      tue: [at('09:00', '17:00')],
      wed: [at('09:00', '17:00')],
      thu: [at('09:00', '17:00')],
      fri: [at('09:00', '17:00')],
      sat: [at('09:00', '17:00')],
      sun: [at('09:00', '17:00')],
    },
    placeId: 'ChIJR1S0Tjfu3YkRbueY-YzWKds',
    lat: 42.3819113,
    lng: -73.6391366,
    googleRating: '4.5 (62)',
    notes: '',
  },
  {
    slug: 'hannaford',
    schemaType: 'GroceryStore',
    name: 'Hannaford Supermarket',
    category: 'Market — full grocery',
    town: 'Valatie, NY',
    address: '2967 US-9 Suite 400, Valatie, NY 12184',
    phone: '+1 518-758-8800',
    hours: 'Daily 6a–11p',
    schedule: {
      mon: [at('06:00', '23:00')],
      tue: [at('06:00', '23:00')],
      wed: [at('06:00', '23:00')],
      thu: [at('06:00', '23:00')],
      fri: [at('06:00', '23:00')],
      sat: [at('06:00', '23:00')],
      sun: [at('06:00', '23:00')],
    },
    placeId: 'ChIJF3U0nq3v3YkRzGyv6kIK7zU',
    lat: 42.4279556,
    lng: -73.6904449,
    googleRating: '4.3 (864)',
    notes: '',
  },
  {
    slug: 'ocean-state-job-lot',
    schemaType: 'Store',
    name: 'Ocean State Job Lot',
    category: 'Shopping — discount / household / garden',
    town: 'Valatie, NY',
    address: '2827 US-9, Valatie, NY 12184',
    phone: '+1 518-758-2292',
    hours: 'Mon–Thu 9a–8p; Fri 9a–9p; Sat 8a–9p; Sun 8a–7p',
    schedule: {
      mon: [at('09:00', '20:00')],
      tue: [at('09:00', '20:00')],
      wed: [at('09:00', '20:00')],
      thu: [at('09:00', '20:00')],
      fri: [at('09:00', '21:00')],
      sat: [at('08:00', '21:00')],
      sun: [at('08:00', '19:00')],
    },
    placeId: 'ChIJOePyR7Dv3YkRTBkisuPQwtA',
    lat: 42.4195898,
    lng: -73.6856350,
    googleRating: '4.2 (698)',
    notes: '',
  },
  {
    slug: 'john-doe-records',
    schemaType: 'Store',
    name: 'John Doe Records and Books',
    category: 'Shopping — records / books / curiosities',
    town: 'Hudson, NY',
    address: '434 Warren St, Hudson, NY 12534',
    phone: '+1 518-212-7653',
    hours: 'Mon, Wed–Sun 12–6p; closed Tue',
    schedule: {
      mon: [at('12:00', '18:00')],
      tue: [],
      wed: [at('12:00', '18:00')],
      thu: [at('12:00', '18:00')],
      fri: [at('12:00', '18:00')],
      sat: [at('12:00', '18:00')],
      sun: [at('12:00', '18:00')],
    },
    placeId: 'ChIJW-2u_yeU3YkRM1_JYS-T390',
    lat: 42.2503775,
    lng: -73.7874750,
    googleRating: '4.4 (85)',
    notes: '',
  },
  {
    slug: 'mel-the-bakery',
    schemaType: 'Bakery',
    name: 'Mel The Bakery',
    category: 'Food — bakery / pastries / sandwiches',
    town: 'Hudson, NY',
    address: '324 Warren St, Hudson, NY 12534',
    phone: null,
    hours: 'Wed–Sun 9a–3p; closed Mon–Tue',
    schedule: {
      mon: [],
      tue: [],
      wed: [at('09:00', '15:00')],
      thu: [at('09:00', '15:00')],
      fri: [at('09:00', '15:00')],
      sat: [at('09:00', '15:00')],
      sun: [at('09:00', '15:00')],
    },
    placeId: 'ChIJc02IiFhbwokRdX1i0AMmWB0',
    lat: 42.2526644,
    lng: -73.7900282,
    googleRating: '4.8 (288)',
    notes: '',
  },
  {
    slug: 'kinderhook-farmers-market',
    schemaType: 'LocalBusiness',
    name: 'Kinderhook Farmers Market',
    category: 'Market — farmers market / Saturday',
    town: 'Kinderhook, NY',
    address: 'Village Green, Broad Street & Albany Avenue, Kinderhook, NY 12106',
    phone: null,
    hours: 'Sat 8:30a–12:30p (May–Oct)',
    schedule: {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [at('08:30', '12:30')],
      sun: [],
    },
    placeId: null,
    lat: 42.3953,
    lng: -73.6984,
    googleRating: '',
    notes: '',
  },
];

export function googleMapsUrl(place: Place): string {
  if (place.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

import type { APIRoute } from 'astro';
import { places } from '../data/places';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ? site.toString().replace(/\/$/, '') : 'https://field-guide.feed-and-seed.com';

  const payload = {
    name: 'Field Guide — Kinderhook, NY',
    description:
      'A curated field guide to Kinderhook, NY and the small places nearby — kept by Feed & Seed, a barn in Kinderhook.',
    url: `${base}/`,
    license: 'CC BY 4.0',
    updated: new Date().toISOString().slice(0, 10),
    places: places.map((p) => ({
      slug: p.slug,
      url: `${base}/${p.slug}/`,
      name: p.name,
      category: p.category,
      schemaType: p.schemaType,
      town: p.town,
      address: p.address,
      phone: p.phone,
      hours: p.hours,
      schedule: p.schedule,
      coordinates: { lat: p.lat, lng: p.lng },
      googlePlaceId: p.placeId,
      googleRating: p.googleRating,
      notes: p.notes,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

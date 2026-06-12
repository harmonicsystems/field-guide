import type { APIRoute } from 'astro';
import { places, type Place } from '../data/places';
import { placeMarkdown } from '../data/placeMarkdown';

export const prerender = true;

export function getStaticPaths() {
  return places.map((place) => ({ params: { slug: place.slug }, props: { place } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const place = props.place as Place;
  const base = (site ?? new URL('https://field-guide.feed-and-seed.com'))
    .toString()
    .replace(/\/$/, '');

  const body = [
    placeMarkdown(place, base),
    '',
    '---',
    '',
    'Field Guide to Kinderhook, NY — kept by Feed & Seed.',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

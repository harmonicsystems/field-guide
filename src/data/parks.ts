/**
 * Public parks worth pointing a visitor to. Same curation principle as
 * places.ts — only entries David can personally vouch for. Coordinates
 * sourced from OpenStreetMap (ODbL).
 */
export interface Park {
  slug: string;
  name: string;
  /** A sentence or two in the field-guide voice. Empty until curated. */
  description: string;
  lat: number;
  lng: number;
}

export const parks: Park[] = [
  {
    slug: 'village-green',
    name: 'Village Green',
    description: '',
    lat: 42.3953,
    lng: -73.6984,
  },
  {
    slug: 'rothermel-park',
    name: 'Rothermel Park',
    description: '',
    lat: 42.3963724,
    lng: -73.7044831,
  },
  {
    slug: 'mills-park',
    name: 'Mills Park',
    description: '',
    lat: 42.3989436,
    lng: -73.7009024,
  },
];

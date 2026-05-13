/**
 * Public landmarks — parks and historic sites — worth pointing a visitor
 * to. Same curation principle as places.ts: only entries David vouches
 * for. Coordinates sourced from OpenStreetMap (ODbL).
 */
export type LandmarkKind = 'park' | 'historic';

export interface Landmark {
  slug: string;
  name: string;
  kind: LandmarkKind;
  /** A sentence or two in the field-guide voice. Empty until curated. */
  description: string;
  lat: number;
  lng: number;
}

export const landmarks: Landmark[] = [
  // --- Parks ---
  {
    slug: 'village-green',
    name: 'Village Green',
    kind: 'park',
    description: '',
    lat: 42.3953,
    lng: -73.6984,
  },
  {
    slug: 'rothermel-park',
    name: 'Rothermel Park',
    kind: 'park',
    description: '',
    lat: 42.3963724,
    lng: -73.7044831,
  },
  {
    slug: 'mills-park',
    name: 'Mills Park',
    kind: 'park',
    description: '',
    lat: 42.3989436,
    lng: -73.7009024,
  },

  // --- Historic sites ---
  {
    slug: 'martin-van-buren-nhs',
    name: 'Martin Van Buren National Historic Site',
    kind: 'historic',
    description: '',
    lat: 42.3692512,
    lng: -73.7037322,
  },
  {
    slug: 'ichabod-crane-schoolhouse',
    name: 'Ichabod Crane Schoolhouse',
    kind: 'historic',
    description: '',
    lat: 42.3803603,
    lng: -73.6909742,
  },
  {
    slug: 'luykas-van-alen-house',
    name: 'Luykas Van Alen House',
    kind: 'historic',
    description: '',
    lat: 42.3811481,
    lng: -73.6914287,
  },
];

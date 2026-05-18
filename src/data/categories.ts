import type { Place, SchemaType } from './places';

export type IconName =
  | 'utensils'
  | 'coffee'
  | 'cookie'
  | 'wine'
  | 'shopping-bag'
  | 'shopping-cart'
  | 'book-open'
  | 'palette'
  | 'library'
  | 'sprout'
  | 'phone'
  | 'map-pin';

export type UxCategory = 'food' | 'shopping' | 'arts';

export const uxCategoryOrder: UxCategory[] = ['food', 'shopping', 'arts'];

export const uxCategoryLabels: Record<UxCategory, string> = {
  food: 'Food & drink',
  shopping: 'Shopping',
  arts: 'Arts & culture',
};

const iconLabels: Record<IconName, string> = {
  utensils: 'Restaurant',
  coffee: 'Café',
  cookie: 'Bakery',
  wine: 'Bar & wine',
  'shopping-bag': 'Shop',
  'shopping-cart': 'Grocery',
  'book-open': 'Bookstore',
  palette: 'Art',
  library: 'Library',
  sprout: 'Farm & market',
};

const fromSchema: Record<SchemaType, { icon: IconName; uxCategory: UxCategory }> = {
  Restaurant: { icon: 'utensils', uxCategory: 'food' },
  CafeOrCoffeeShop: { icon: 'coffee', uxCategory: 'food' },
  Bakery: { icon: 'cookie', uxCategory: 'food' },
  BarOrPub: { icon: 'wine', uxCategory: 'food' },
  Winery: { icon: 'wine', uxCategory: 'food' },
  Store: { icon: 'shopping-bag', uxCategory: 'shopping' },
  GroceryStore: { icon: 'shopping-cart', uxCategory: 'shopping' },
  BookStore: { icon: 'book-open', uxCategory: 'shopping' },
  ArtGallery: { icon: 'palette', uxCategory: 'arts' },
  Library: { icon: 'library', uxCategory: 'arts' },
  LocalBusiness: { icon: 'sprout', uxCategory: 'shopping' },
};

/** Per-place overrides where the schema.org type is too coarse or misleading. */
const slugOverrides: Record<string, { icon: IconName; uxCategory: UxCategory }> = {
  samascotts: { icon: 'sprout', uxCategory: 'shopping' },
  'chatham-berry-farm': { icon: 'sprout', uxCategory: 'shopping' },
  'kinderhook-farmers-market': { icon: 'sprout', uxCategory: 'shopping' },
  'tierra-farm': { icon: 'coffee', uxCategory: 'shopping' },
  'super-stories': { icon: 'palette', uxCategory: 'arts' },
};

export function placeCategoryInfo(p: Place): {
  icon: IconName;
  iconLabel: string;
  uxCategory: UxCategory;
} {
  const base = slugOverrides[p.slug] ?? fromSchema[p.schemaType];
  return { ...base, iconLabel: iconLabels[base.icon] };
}

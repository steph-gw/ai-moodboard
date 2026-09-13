import {
  Armchair,
  BookOpen,
  Cake,
  CalendarHeart,
  Camera,
  Car,
  Church,
  Cloud,
  Coffee,
  ConciergeBell,
  Crown,
  Feather,
  Flower2,
  Gem,
  Gift,
  Heart,
  Landmark,
  Leaf,
  Mail,
  MapPin,
  Moon,
  Music,
  Palette,
  PartyPopper,
  Scissors,
  Shirt,
  Sofa,
  Sparkles,
  Star,
  Sun,
  Tent,
  Utensils,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** Icon keys a Section can carry. `icon` on Section is a string for data compat. */
const ICONS: Record<string, (size: number) => ReactNode> = {
  flower: (s) => <Flower2 size={s} strokeWidth={1.4} />,
  leaf: (s) => <Leaf size={s} strokeWidth={1.4} />,
  utensils: (s) => <UtensilsCrossed size={s} strokeWidth={1.4} />,
  catering: (s) => <Utensils size={s} strokeWidth={1.4} />,
  shirt: (s) => <Shirt size={s} strokeWidth={1.4} />,
  mail: (s) => <Mail size={s} strokeWidth={1.4} />,
  cake: (s) => <Cake size={s} strokeWidth={1.4} />,
  music: (s) => <Music size={s} strokeWidth={1.4} />,
  camera: (s) => <Camera size={s} strokeWidth={1.4} />,
  drinks: (s) => <Wine size={s} strokeWidth={1.4} />,
  venue: (s) => <MapPin size={s} strokeWidth={1.4} />,
  transport: (s) => <Car size={s} strokeWidth={1.4} />,
  gift: (s) => <Gift size={s} strokeWidth={1.4} />,
  rings: (s) => <Gem size={s} strokeWidth={1.4} />,
  furniture: (s) => <Armchair size={s} strokeWidth={1.4} />,
  // Tablescapes and lounge furniture each get their own, because a board that has one
  // usually has both — tables over here, the seating plan over there — and sharing the
  // dinner icon between them made two sections that look like the same section.
  tablescape: (s) => <ConciergeBell size={s} strokeWidth={1.4} />,
  lounge: (s) => <Sofa size={s} strokeWidth={1.4} />,
  timeline: (s) => <CalendarHeart size={s} strokeWidth={1.4} />,
  sparkles: (s) => <Sparkles size={s} strokeWidth={1.4} />,
  ceremony: (s) => <Church size={s} strokeWidth={1.4} />,
  heart: (s) => <Heart size={s} strokeWidth={1.4} />,
  star: (s) => <Star size={s} strokeWidth={1.4} />,
  palette: (s) => <Palette size={s} strokeWidth={1.4} />,
  sun: (s) => <Sun size={s} strokeWidth={1.4} />,
  moon: (s) => <Moon size={s} strokeWidth={1.4} />,
  cloud: (s) => <Cloud size={s} strokeWidth={1.4} />,
  tent: (s) => <Tent size={s} strokeWidth={1.4} />,
  party: (s) => <PartyPopper size={s} strokeWidth={1.4} />,
  coffee: (s) => <Coffee size={s} strokeWidth={1.4} />,
  book: (s) => <BookOpen size={s} strokeWidth={1.4} />,
  feather: (s) => <Feather size={s} strokeWidth={1.4} />,
  scissors: (s) => <Scissors size={s} strokeWidth={1.4} />,
  crown: (s) => <Crown size={s} strokeWidth={1.4} />,
  landmark: (s) => <Landmark size={s} strokeWidth={1.4} />,
};

/** Every key the icon picker offers, in grid order. */
export const SECTION_ICON_KEYS = Object.keys(ICONS);

/**
 * Keyword → icon key, checked in order so more specific words win
 * (e.g. "cocktail hour" reads as drinks before "hour" reads as timeline).
 */
const KEYWORD_ICONS: [RegExp, string][] = [
  [/floral|flower|bloom|bouquet|posy|petal/i, 'flower'],
  [/greener|foliage|garden|botanic|leaf|branch/i, 'leaf'],
  [/cake|dessert|sweet|patisserie|pastry/i, 'cake'],
  [/cocktail|bar|drink|wine|champagne|toast|aperitif/i, 'drinks'],
  [/tablescape|table ?scape|table setting|place setting|centrepiece|centerpiece|tabletop|table decor|china|glassware|linen/i, 'tablescape'],
  [/dinner|menu|food|cater|feast|banquet/i, 'utensils'],
  [/reception|breakfast|lunch|brunch/i, 'catering'],
  [/attire|dress|gown|suit|tux|outfit|wardrobe|style|groom|bridal/i, 'shirt'],
  [/stationer|invit|paper|signage|sign|menu card|place card|calligraph/i, 'mail'],
  [/music|band|dj|dance|playlist|entertain/i, 'music'],
  [/photo|film|video|portrait|shot list/i, 'camera'],
  [/venue|location|site|space|estate|chapel|church|barn/i, 'venue'],
  [/transport|car|shuttle|travel|arrival|departure/i, 'transport'],
  [/gift|favour|favor|welcome bag|registry/i, 'gift'],
  [/ring|jewel|band|heirloom|accessor/i, 'rings'],
  [/lounge|sofa|settee|soft seating/i, 'lounge'],
  [/furnitur|rental|seating|chair|decor|drapery/i, 'furniture'],
  [/timeline|schedule|run ?sheet|itinerary|day-of|hour/i, 'timeline'],
  [/ceremony|vow|aisle|altar/i, 'flower'],
  [/light|candle|glow|ambien|mood/i, 'sparkles'],
];

export const DEFAULT_SECTION_ICON = 'sparkles';

/** Picks an icon from a section's name; falls back to a neutral sparkle. */
export function inferSectionIcon(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return DEFAULT_SECTION_ICON;
  for (const [pattern, key] of KEYWORD_ICONS) {
    if (pattern.test(trimmed)) return key;
  }
  return DEFAULT_SECTION_ICON;
}

export function sectionIcon(key: string, size = 14): ReactNode {
  return (ICONS[key] ?? ICONS[DEFAULT_SECTION_ICON])(size);
}

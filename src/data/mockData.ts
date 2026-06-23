import type { Board } from '../types';
import { buildSlidesForSection } from './slideHelpers';

const images = [
  {
    id: 'img-1',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=450&fit=crop',
    tags: ['Garden', 'Arches', 'Natural light'],
  },
  {
    id: 'img-2',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=450&fit=crop',
    tags: ['Aisle', 'Candles', 'Ivory'],
    clientVote: 'up' as const,
  },
  {
    id: 'img-3',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1522673606160-9513b0a93bf8?w=600&h=450&fit=crop',
    tags: ['Seating', 'Linen', 'Minimal'],
  },
  {
    id: 'img-4',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=450&fit=crop',
    tags: ['Outdoor', 'Mist', 'Romantic'],
  },
  {
    id: 'img-5',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=450&fit=crop',
    tags: ['Tablescape', 'Gold', 'Candlelight'],
  },
  {
    id: 'img-6',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=450&fit=crop',
    tags: ['Tent', 'Draping', 'Evening'],
  },
  {
    id: 'img-7',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=450&fit=crop',
    tags: ['Dance floor', 'Lighting', 'Warm'],
  },
  {
    id: 'img-8',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=450&fit=crop',
    tags: ['Bar', 'Botanical', 'Signature'],
  },
  {
    id: 'img-9',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486cfe3?w=600&h=450&fit=crop',
    tags: ['Bouquet', 'Garden roses', 'Sage'],
  },
  {
    id: 'img-10',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=450&fit=crop',
    tags: ['Centerpiece', 'Low', 'Organic'],
  },
  {
    id: 'img-11',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1561181286-d3fee7d14736?w=600&h=450&fit=crop',
    tags: ['Installation', 'Hanging', 'Greenery'],
  },
  {
    id: 'img-12',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1594552072235-0fdac2905b06?w=600&h=450&fit=crop',
    tags: ['Bridal', 'Lace', 'Classic'],
  },
  {
    id: 'img-13',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=450&fit=crop',
    tags: ['Groom', 'Linen', 'Neutral'],
  },
];

const sectionDefs = [
  { id: 'ceremony', name: 'Ceremony', icon: 'flower', status: 'approved' as const, approvedDate: '3 Jun', imageCount: 4 },
  { id: 'reception', name: 'Reception', icon: 'utensils', status: 'open' as const, threadCount: 3, imageCount: 5 },
  { id: 'florals', name: 'Florals', icon: 'leaf', status: 'pending' as const, imageCount: 3 },
  { id: 'attire', name: 'Attire', icon: 'shirt', status: 'none' as const, imageCount: 2 },
  { id: 'stationery', name: 'Stationery', icon: 'mail', status: 'none' as const, imageCount: 0 },
];

export const mockBoard: Board = {
  weddingName: 'The Ashworth–Linden Wedding',
  weddingDate: '14 Jun 2025',
  visionBrief:
    'An intimate garden celebration rooted in organic elegance — soft ivory linens, trailing greenery, and warm candlelight against weathered stone. The palette leans warm neutrals with touches of sage and blush.',
  palette: ['#f2ede6', '#c4a35a', '#8a9a7b', '#d4b5a0', '#5c4a3a'],
  viewers: [
    { id: '1', initials: 'SC', name: 'Sophie Clarke' },
    { id: '2', initials: 'AL', name: 'Anna Linden' },
  ],
  sections: sectionDefs.map((s) => ({
    ...s,
    slides: buildSlidesForSection(s.id, s.name, images),
  })),
  images,
  suggestions: [
    {
      id: 's1',
      url: 'https://images.unsplash.com/photo-1606800052052-a08af8348861?w=300&h=220&fit=crop',
      alt: 'Garden ceremony setup',
    },
    {
      id: 's2',
      url: 'https://images.unsplash.com/photo-1520854221256-1748510a6a18?w=300&h=220&fit=crop',
      alt: 'Floral arrangement detail',
    },
    {
      id: 's3',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&h=220&fit=crop',
      alt: 'Outdoor reception table',
    },
    {
      id: 's4',
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=300&h=220&fit=crop',
      alt: 'Wedding invitation suite',
    },
  ],
};

export const AI_VISION_BRIEF =
  'A refined garden wedding aesthetic blending English countryside romance with modern minimalism — ivory and sage tones, organic florals, and candlelit warmth throughout the day-to-evening transition.';

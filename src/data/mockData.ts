import type { Board } from '../types';
import { buildSlidesForSection } from './slideHelpers';

const images = [
  // ── Ceremony ──
  {
    id: 'img-1',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&h=450&fit=crop',
    tags: ['Garden', 'Arches', 'Natural light'],
  },
  {
    id: 'img-2',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=450&fit=crop',
    tags: ['Aisle', 'Bouquet', 'Ivory'],
    clientVote: 'up' as const,
  },
  {
    id: 'img-3',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&h=450&fit=crop',
    tags: ['Seating', 'Linen', 'Minimal'],
  },
  {
    id: 'img-4',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&h=450&fit=crop',
    tags: ['Outdoor', 'Golden hour', 'Romantic'],
  },
  {
    id: 'img-14',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600&h=450&fit=crop',
    tags: ['Signage', 'Rustic', 'Details'],
  },
  {
    id: 'img-15',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=450&fit=crop',
    tags: ['Rings', 'Close-up', 'Florals'],
  },
  {
    id: 'img-16',
    sectionId: 'ceremony',
    url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&h=450&fit=crop',
    tags: ['Couple', 'Candid', 'Portrait'],
  },

  // ── Reception ──
  {
    id: 'img-5',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=450&fit=crop',
    tags: ['Tablescape', 'Linen', 'Candlelight'],
  },
  {
    id: 'img-6',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=600&h=450&fit=crop',
    tags: ['Tent', 'Draping', 'Evening'],
  },
  {
    id: 'img-8',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=450&fit=crop',
    tags: ['Banquet', 'Botanical', 'Glassware'],
  },
  {
    id: 'img-7',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=450&fit=crop',
    tags: ['Celebration', 'Outdoor', 'Warm'],
  },
  {
    id: 'img-17',
    sectionId: 'reception',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&h=450&fit=crop',
    tags: ['Toast', 'Guests', 'Joy'],
  },

  // ── Florals ──
  {
    id: 'img-9',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=450&fit=crop',
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
    url: 'https://images.unsplash.com/photo-1457089328109-e5d9bd499191?w=600&h=450&fit=crop',
    tags: ['Arrangement', 'Color', 'Moody'],
  },
  {
    id: 'img-19',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1495231916356-a86217efff12?w=600&h=450&fit=crop',
    tags: ['Ivory rose', 'Classic', 'Close-up'],
  },
  {
    id: 'img-20',
    sectionId: 'florals',
    url: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=450&fit=crop',
    tags: ['Tulips', 'Spring', 'Garden'],
  },

  // ── Attire ──
  {
    id: 'img-12',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1521467752200-3bccf80f16ed?w=600&h=450&fit=crop',
    tags: ['Bridal', 'Lace', 'Classic'],
  },
  {
    id: 'img-25',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600&h=450&fit=crop',
    tags: ['Veil', 'Romantic', 'Editorial'],
  },
  {
    id: 'img-27',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&h=450&fit=crop',
    tags: ['Gown', 'Movement', 'Soft'],
  },
  {
    id: 'img-13',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=450&fit=crop',
    tags: ['Groom', 'Linen', 'Neutral'],
  },
  {
    id: 'img-26',
    sectionId: 'attire',
    url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=450&fit=crop',
    tags: ['Suit', 'Tailoring', 'Formal'],
  },

  // ── Stationery ──
  {
    id: 'img-21',
    sectionId: 'stationery',
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=450&fit=crop',
    tags: ['Script', 'Ink', 'Paper'],
  },
  {
    id: 'img-22',
    sectionId: 'stationery',
    url: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=600&h=450&fit=crop',
    tags: ['Pen', 'Notebook', 'Craft'],
  },
  {
    id: 'img-23',
    sectionId: 'stationery',
    url: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=600&h=450&fit=crop',
    tags: ['Lettering', 'Quote', 'Modern'],
  },
  {
    id: 'img-24',
    sectionId: 'stationery',
    url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=450&fit=crop',
    tags: ['Writing', 'Hands', 'Suite'],
  },
];

const sectionDefs = [
  { id: 'ceremony', name: 'Ceremony', icon: 'flower', status: 'approved' as const, approvedDate: '3 Jun', imageCount: 7 },
  { id: 'reception', name: 'Reception', icon: 'utensils', status: 'open' as const, threadCount: 3, imageCount: 5 },
  { id: 'florals', name: 'Florals', icon: 'leaf', status: 'pending' as const, imageCount: 5 },
  { id: 'attire', name: 'Attire', icon: 'shirt', status: 'none' as const, imageCount: 5 },
  { id: 'stationery', name: 'Stationery', icon: 'mail', status: 'none' as const, imageCount: 4 },
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
      url: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=300&h=220&fit=crop',
      alt: 'Garden ceremony signage',
    },
    {
      id: 's2',
      url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&h=220&fit=crop',
      alt: 'Floral arrangement detail',
    },
    {
      id: 's3',
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=300&h=220&fit=crop',
      alt: 'Outdoor wedding celebration',
    },
    {
      id: 's4',
      url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=300&h=220&fit=crop',
      alt: 'Wedding stationery and writing',
    },
  ],
};

export const AI_VISION_BRIEF =
  'A refined garden wedding aesthetic blending English countryside romance with modern minimalism — ivory and sage tones, organic florals, and candlelit warmth throughout the day-to-evening transition.';

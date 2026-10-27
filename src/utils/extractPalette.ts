/**
 * Finds the main colors in an image, as hex codes, most prominent first.
 *
 * Runs entirely in the browser: the image is drawn small onto a canvas and its pixels are
 * grouped. A 128px copy has every color a palette needs — the detail a full-size photo
 * adds is texture, not new colors — and it keeps the work to a few milliseconds.
 *
 * Grouping happens in Lab rather than RGB, because Lab distance is close to how different
 * two colors look. In RGB, two greens a planner would call the same can be further apart
 * than a green and a grey, and the palette fills with near-duplicates.
 */
const SAMPLE_EDGE = 128;
/** Candidate groups refined before picking. More than asked for, so small accents survive. */
const CANDIDATES = 16;
const ITERATIONS = 8;
/** Lab distance below which two colors read as the same one. */
const SEED_SPREAD = 12;
const DISTINCT = 15;
/** Fallback when an image is too uniform to give enough colors at DISTINCT. */
const DISTINCT_RELAXED = 7;
/** A group smaller than this share of the image is noise, not a color in it. */
const MIN_SHARE = 0.004;

export const PALETTE_FROM_IMAGE_COUNT = 6;

type Lab = [number, number, number];

interface Bin {
  count: number;
  lab: Lab;
  rgb: [number, number, number];
}

interface Group {
  weight: number;
  lab: Lab;
  rgb: [number, number, number];
}

/** Loads an image the canvas is allowed to read: a local file, or a URL fetched with CORS. */
export async function loadImageForPalette(source: File | string): Promise<ImageBitmap> {
  if (typeof source !== 'string') return createImageBitmap(source);
  // Fetched rather than set as an <img src>: an image already on the slide was loaded
  // without CORS, and reusing that cached copy would leave the canvas unreadable.
  const response = await fetch(source, { mode: 'cors' });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return createImageBitmap(await response.blob());
}

export function extractPalette(bitmap: ImageBitmap, count = PALETTE_FROM_IMAGE_COUNT): string[] {
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  // Pixels are binned first (5 bits a channel) so the grouping runs over a few thousand
  // distinct colors rather than every pixel.
  const bins = new Map<number, Bin>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Transparent areas of a PNG are not part of the picture.
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let bin = bins.get(key);
    if (!bin) {
      bin = { count: 0, lab: [0, 0, 0], rgb: [0, 0, 0] };
      bins.set(key, bin);
    }
    bin.count += 1;
    bin.rgb[0] += r;
    bin.rgb[1] += g;
    bin.rgb[2] += b;
    total += 1;
  }
  if (total === 0) return [];

  const list = [...bins.values()].map((bin) => {
    const rgb: [number, number, number] = [
      bin.rgb[0] / bin.count,
      bin.rgb[1] / bin.count,
      bin.rgb[2] / bin.count,
    ];
    return { count: bin.count, rgb, lab: rgbToLab(rgb) };
  });
  list.sort((a, b) => b.count - a.count);

  // Seeds are the most common colors that are not near one already taken. Deterministic,
  // so the same image always gives the same palette.
  const seeds: Lab[] = [];
  for (const bin of list) {
    if (seeds.every((s) => distance(s, bin.lab) > SEED_SPREAD)) seeds.push(bin.lab);
    if (seeds.length === CANDIDATES) break;
  }

  let groups: Group[] = seeds.map((lab) => ({ weight: 0, lab, rgb: [0, 0, 0] }));
  for (let pass = 0; pass < ITERATIONS; pass += 1) {
    const next = groups.map(() => ({
      weight: 0,
      lab: [0, 0, 0] as Lab,
      rgb: [0, 0, 0] as [number, number, number],
    }));
    for (const bin of list) {
      let best = 0;
      let bestDist = Infinity;
      for (let g = 0; g < groups.length; g += 1) {
        const d = distance(groups[g].lab, bin.lab);
        if (d < bestDist) {
          bestDist = d;
          best = g;
        }
      }
      const into = next[best];
      into.weight += bin.count;
      for (let c = 0; c < 3; c += 1) {
        into.lab[c] += bin.lab[c] * bin.count;
        into.rgb[c] += bin.rgb[c] * bin.count;
      }
    }
    groups = next
      .filter((g) => g.weight > 0)
      .map((g) => ({
        weight: g.weight,
        lab: g.lab.map((v) => v / g.weight) as Lab,
        rgb: g.rgb.map((v) => v / g.weight) as [number, number, number],
      }));
  }

  groups = groups.filter((g) => g.weight / total >= MIN_SHARE);
  groups.sort((a, b) => b.weight - a.weight);

  const pick = (spread: number, from: Group[]) => {
    for (const g of groups) {
      if (from.length === count) break;
      if (from.includes(g)) continue;
      if (from.every((p) => distance(p.lab, g.lab) >= spread)) from.push(g);
    }
    return from;
  };
  const chosen = pick(DISTINCT_RELAXED, pick(DISTINCT, []));

  return chosen.map((g) => toHex(g.rgb));
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function distance(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function rgbToLab([r, g, b]: [number, number, number]): Lab {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  // sRGB to XYZ (D65), normalised by the white point.
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

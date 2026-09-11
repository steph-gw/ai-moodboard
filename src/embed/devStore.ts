import { BubbleApi, K, TYPE, type BubbleRow, type Constraint } from './bubbleApi';
import { mockBoard } from '../data/mockData';
import { serializeSlideContent } from './serialize';

/**
 * A stand-in for Bubble's Data API, backed by localStorage, for the dev harness.
 *
 * It subclasses the real client rather than faking the repo, so everything above it —
 * the row/board mapping, the dirty diffing, the version guard — is the same code that
 * runs against Bubble. Only the transport changes.
 */
/**
 * Versioned, because the seed is example content that keeps changing. Without the suffix a
 * harness that has been opened once keeps the board it first saw, and new seed data looks
 * like it was never written.
 */
// v3: the slide rows' section pointer changed key when K.slide.section was corrected
// against the real schema, so a v2 store has slides that belong to no section.
const STORAGE_KEY = 'gw-moodboard-dev-store-v3';
const LATENCY_MS = 120;

type Store = Record<string, BubbleRow[]>;

export const DEV_MOODBOARD_ID = 'dev-moodboard';

export class DevBubbleApi extends BubbleApi {
  constructor() {
    super({ base: '' });
    if (!localStorage.getItem(STORAGE_KEY)) this.reset();
  }

  /**
   * Who the fake is acting as. Bubble stamps `Created By` server-side from the session, and
   * the drawer decides whether to offer Edit and Delete by comparing it to the current user
   * — so without this the harness silently hides controls that work in the real app.
   */
  actingUserId = '';

  reset(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed()));
  }

  private read(): Store {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Store;
    } catch {
      return {};
    }
  }

  private write(store: Store): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  /** Counts calls so the harness can measure write volume rather than guess at it. */
  calls: { list: number; get: number; create: number; patch: number; remove: number } = {
    list: 0, get: 0, create: 0, patch: 0, remove: 0,
  };

  get totalCalls(): number {
    return Object.values(this.calls).reduce((a, b) => a + b, 0);
  }

  private async settle<T>(value: T): Promise<T> {
    // Real latency, so the debounce and the "saving" state behave as they will in Bubble.
    await new Promise((r) => setTimeout(r, LATENCY_MS));
    return value;
  }

  override async list(type: string, constraints: Constraint[] = []): Promise<BubbleRow[]> {
    this.calls.list++;
    const rows = (this.read()[type] ?? []).filter((row) =>
      constraints.every((c) => {
        const actual = row[c.key];
        if (c.constraint_type === 'in') return Array.isArray(c.value) && c.value.includes(actual);
        return actual === c.value;
      })
    );
    return this.settle(rows);
  }

  override async get(type: string, id: string): Promise<BubbleRow> {
    this.calls.get++;
    const row = (this.read()[type] ?? []).find((r) => r._id === id);
    if (!row) throw new Error(`dev store: no ${type}/${id}`);
    return this.settle(row);
  }

  override async create(type: string, fields: Record<string, unknown>): Promise<string> {
    this.calls.create++;
    const store = this.read();
    const now = new Date().toISOString();
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    store[type] = [
      ...(store[type] ?? []),
      { _id: id, 'Created Date': now, 'Modified Date': now, 'Created By': this.actingUserId, ...fields },
    ];
    this.write(store);
    return this.settle(id);
  }

  override async patch(type: string, id: string, fields: Record<string, unknown>): Promise<void> {
    this.calls.patch++;
    const store = this.read();
    store[type] = (store[type] ?? []).map((row) =>
      row._id === id ? { ...row, ...fields, 'Modified Date': new Date().toISOString() } : row
    );
    this.write(store);
    await this.settle(undefined);
  }

  override async remove(type: string, id: string): Promise<void> {
    this.calls.remove++;
    const store = this.read();
    store[type] = (store[type] ?? []).filter((row) => row._id !== id);
    this.write(store);
    await this.settle(undefined);
  }

  /** Simulates another user saving a slide, to exercise the conflict path. */
  bumpSlideExternally(slideId: string): void {
    const store = this.read();
    store[TYPE.slide] = (store[TYPE.slide] ?? []).map((row) =>
      row._id === slideId ? { ...row, 'Modified Date': new Date().toISOString() } : row
    );
    this.write(store);
  }
}

/** Reshapes the seed board into rows, so dev starts with something worth looking at. */
function seed(): Store {
  const now = new Date().toISOString();
  const stamp = { 'Created Date': now, 'Modified Date': now };

  const images: BubbleRow[] = mockBoard.images.map((img) => ({
    _id: img.id,
    ...stamp,
    [K.image.moodboard]: DEV_MOODBOARD_ID,
    [K.image.image]: img.url,
    [K.image.inUse]: true,
  }));

  const sections: BubbleRow[] = [];
  const slides: BubbleRow[] = [];
  mockBoard.sections.forEach((section, i) => {
    sections.push({
      _id: section.id,
      ...stamp,
      [K.section.moodboard]: DEV_MOODBOARD_ID,
      [K.section.name]: section.name,
      [K.section.icon]: section.icon,
      [K.section.status]: section.status,
      [K.section.order]: i,
      ...(section.visionBrief ? { [K.section.visionBrief]: section.visionBrief } : {}),
    });
    section.slides.forEach((slide, j) => {
      slides.push({
        _id: slide.id,
        ...stamp,
        [K.slide.section]: section.id,
        [K.slide.name]: slide.name,
        [K.slide.order]: j,
        [K.slide.elementsJson]: serializeSlideContent({ elements: slide.elements, background: slide.background }),
      });
    });
  });

  return {
    [TYPE.moodboard]: [
      {
        _id: DEV_MOODBOARD_ID,
        ...stamp,
        [K.moodboard.name]: mockBoard.weddingName,
        [K.moodboard.visionBrief]: mockBoard.visionBrief,
        [K.moodboard.palette]: mockBoard.palette,
      },
    ],
    [TYPE.section]: sections,
    [TYPE.slide]: slides,
    [TYPE.image]: images,
    [TYPE.vote]: [],
    [TYPE.thread]: [],
    [TYPE.comment]: [],
  };
}

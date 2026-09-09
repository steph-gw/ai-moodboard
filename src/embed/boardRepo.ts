import type { Board, BoardImage, Section, SectionStatus, Slide } from '../types';
import { BubbleApi, K, TYPE, type BubbleRow } from './bubbleApi';
import { parseElements, serializeElements } from './serialize';

/**
 * Translates between Bubble rows and the shape the app already works in. Everything that
 * knows a Bubble field key lives here or in bubbleApi.ts — the components never see one.
 */

/** `Modified Date` per slide at the time we read it, for detecting a clobber before we write. */
export type SlideVersions = Map<string, string>;

export interface LoadedBoard {
  board: Board;
  versions: SlideVersions;
  /** Slides frozen by the planner. Client edits are refused on these. */
  lockedSlideIds: Set<string>;
}

export interface BoardIdentity {
  moodboardId: string;
  /** Shown in the top nav. Comes from the host, not the API — the Event type isn't exposed. */
  eventName: string;
  eventDate: string;
}

const STATUSES: readonly SectionStatus[] = ['approved', 'open', 'pending', 'none'];

export class BoardRepo {
  constructor(private readonly api: BubbleApi) {}

  /**
   * Loads a whole board in three queries — sections, slides and images — rather than one per
   * section. Each row carries its parent id, so the tree is assembled here.
   */
  async load({ moodboardId, eventName, eventDate }: BoardIdentity): Promise<LoadedBoard> {
    // Constraint keys are the same field keys the API returns, not the display names.
    const byMoodboard = [
      { key: K.section.moodboard, constraint_type: 'equals' as const, value: moodboardId },
    ];
    const imagesByMoodboard = [
      { key: K.image.moodboard, constraint_type: 'equals' as const, value: moodboardId },
    ];

    const [moodboard, sectionRows, imageRows] = await Promise.all([
      this.api.get(TYPE.moodboard, moodboardId),
      this.api.list(TYPE.section, byMoodboard, K.section.order),
      this.api.list(TYPE.image, imagesByMoodboard),
    ]);

    const sectionIds = sectionRows.map((r) => r._id);
    const slideRows = sectionIds.length
      ? await this.api.list(
          TYPE.slide,
          [{ key: K.slide.section, constraint_type: 'in', value: sectionIds }],
          K.slide.order
        )
      : [];

    const images: BoardImage[] = imageRows
      .filter((r) => r[K.image.inUse] !== false)
      .map((r) => ({
        id: r._id,
        sectionId: '', // images belong to the board, not a section — see PHASE-1-DATA-MODEL
        url: str(r[K.image.image]),
        tags: [],
      }));
    const knownImageIds = new Set(images.map((i) => i.id));

    const versions: SlideVersions = new Map();
    const slidesBySection = new Map<string, Slide[]>();
    for (const row of slideRows) {
      const sectionId = str(row[K.slide.section]);
      const slide: Slide = {
        id: row._id,
        sectionId,
        name: str(row[K.slide.name]) || 'Slide',
        elements: parseElements(row[K.slide.elementsJson], knownImageIds),
        commentPins: [], // merged in from threads/comments in phase 7
      };
      versions.set(row._id, str(row['Modified Date']));
      const list = slidesBySection.get(sectionId);
      if (list) list.push(slide);
      else slidesBySection.set(sectionId, [slide]);
    }

    const lockedSlideIds = new Set<string>();
    const sections: Section[] = sectionRows
      .filter((r) => r[K.section.archived] !== true)
      .map((r) => {
        for (const id of asList(r[K.section.lockedSlides])) lockedSlideIds.add(id);
        return {
          id: r._id,
          name: str(r[K.section.name]) || 'Untitled',
          icon: str(r[K.section.icon]) || 'sparkles',
          visionBrief: str(r[K.section.visionBrief]) || undefined,
          status: readStatus(r[K.section.status]),
          approvedDate: str(r[K.section.approvedDate]) || undefined,
          imageCount: 0, // computed at render; never stored
          slides: slidesBySection.get(r._id) ?? [],
        };
      });

    return {
      board: {
        weddingName: eventName || str(moodboard[K.moodboard.name]),
        weddingDate: eventDate,
        visionBrief: str(moodboard[K.moodboard.visionBrief]),
        palette: asList(moodboard[K.moodboard.palette]),
        sections,
        images,
        suggestions: [],
        viewers: [],
      },
      versions,
      lockedSlideIds,
    };
  }

  /** Writes one slide's canvas. */
  async saveSlide(slideId: string, elements: Slide['elements']): Promise<void> {
    await this.api.patch(TYPE.slide, slideId, { [K.slide.elementsJson]: serializeElements(elements) });
  }

  /**
   * `Modified Date` for several slides in a single query.
   *
   * Used both to check for a clobber before writing and to refresh versions after, so a save
   * cycle costs one query either side however many slides changed — rather than a GET per
   * slide, which is what makes an autosaving canvas expensive on Bubble.
   */
  async versionsOf(slideIds: readonly string[]): Promise<SlideVersions> {
    const versions: SlideVersions = new Map();
    if (!slideIds.length) return versions;
    const rows = await this.api.list(TYPE.slide, [
      { key: '_id', constraint_type: 'in', value: [...slideIds] },
    ]);
    for (const row of rows) versions.set(row._id, str(row['Modified Date']));
    return versions;
  }

  async createImage(moodboardId: string, url: string): Promise<string> {
    return this.api.create(TYPE.image, {
      [K.image.moodboard]: moodboardId,
      [K.image.image]: url,
      [K.image.inUse]: true,
    });
  }

  /** Removing an image from the canvas never deletes the file — undo has to be able to bring it back. */
  async retireImage(imageId: string): Promise<void> {
    await this.api.patch(TYPE.image, imageId, { [K.image.inUse]: false });
  }

  async createSlide(sectionId: string, name: string, order: number): Promise<string> {
    return this.api.create(TYPE.slide, {
      [K.slide.section]: sectionId,
      [K.slide.name]: name,
      [K.slide.order]: order,
      [K.slide.elementsJson]: '[]',
    });
  }

  async deleteSlide(slideId: string): Promise<void> {
    await this.api.remove(TYPE.slide, slideId);
  }

  async createSection(moodboardId: string, name: string, icon: string, order: number): Promise<string> {
    return this.api.create(TYPE.section, {
      [K.section.moodboard]: moodboardId,
      [K.section.name]: name,
      [K.section.icon]: icon,
      [K.section.order]: order,
    });
  }

  async updateSection(sectionId: string, patch: Partial<Record<'name' | 'icon' | 'visionBrief' | 'status' | 'approvedDate', string>>): Promise<void> {
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields[K.section.name] = patch.name;
    if (patch.icon !== undefined) fields[K.section.icon] = patch.icon;
    if (patch.visionBrief !== undefined) fields[K.section.visionBrief] = patch.visionBrief;
    if (patch.status !== undefined) fields[K.section.status] = patch.status;
    if (patch.approvedDate !== undefined) fields[K.section.approvedDate] = patch.approvedDate;
    if (Object.keys(fields).length) await this.api.patch(TYPE.section, sectionId, fields);
  }

  /** Sections are archived rather than deleted, so their slides and comments survive. */
  async archiveSection(sectionId: string): Promise<void> {
    await this.api.patch(TYPE.section, sectionId, { [K.section.archived]: true });
  }

  async setBoardVisionBrief(moodboardId: string, text: string): Promise<void> {
    await this.api.patch(TYPE.moodboard, moodboardId, { [K.moodboard.visionBrief]: text });
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Option sets come back as their display text, so this maps loosely. The `key` attribute we
 * added is the stable identifier, but the Data API returns the display value.
 */
function readStatus(value: unknown): SectionStatus {
  const s = str(value).toLowerCase();
  return (STATUSES as readonly string[]).includes(s) ? (s as SectionStatus) : 'none';
}

/** Re-exported so the row type is available without importing the API module directly. */
export type { BubbleRow };

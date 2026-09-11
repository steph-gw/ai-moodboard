import type {
  Board,
  CanvasElement,
  BoardImage,
  Comment,
  CommentPin,
  ImageVote,
  Section,
  SectionStatus,
  Slide,
  Viewer,
} from '../types';
import { BubbleApi, K, TYPE, type BubbleRow } from './bubbleApi';
import { parseSlideContent, serializeSlideContent } from './serialize';
import { initialsFrom } from '../utils/initials';

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
  /** This viewer's existing vote row per image, so a change patches instead of duplicating. */
  voteRowIds: Map<string, string>;
}

export interface BoardIdentity {
  moodboardId: string;
  /** Everyone with access, keyed by user id. Supplies comment authors and the avatar stack. */
  people?: Map<string, Viewer>;
  /** Forked into this board on first open, when this board is still empty. */
  templateMoodboardId?: string;
  /** Scopes which saved templates this viewer may start from. */
  businessId?: string;
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
  async load(
    { moodboardId, eventName, eventDate, people = new Map<string, Viewer>() }: BoardIdentity,
    currentUserId: string
  ): Promise<LoadedBoard> {
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

    // Threads and their comments: two more queries for the whole board, not per slide.
    const threadRows = await this.api.list(TYPE.thread, [
      { key: K.thread.moodboard, constraint_type: 'equals', value: moodboardId },
    ]);
    const commentRows = threadRows.length
      ? await this.api.list(
          TYPE.comment,
          [{ key: K.comment.thread, constraint_type: 'in', value: threadRows.map((r) => r._id) }],
          'Created Date'
        )
      : [];
    const pinsBySlide = buildPins(threadRows, commentRows, people);

    // Only this viewer's votes. One row per person per image is the point of the type —
    // a single field on the image would let one person's thumbs-up erase another's down.
    const voteRows = await this.api.list(TYPE.vote, [
      { key: 'Created By', constraint_type: 'equals', value: currentUserId },
    ]);
    const myVotes = new Map<string, ImageVote>();
    for (const row of voteRows) {
      const vote = readVote(row[K.vote.vote]);
      if (vote) myVotes.set(str(row[K.vote.image]), vote);
    }
    const voteRowIds = new Map<string, string>();
    for (const row of voteRows) voteRowIds.set(str(row[K.vote.image]), row._id);

    const images: BoardImage[] = imageRows
      .filter((r) => r[K.image.inUse] !== false)
      .map((r) => ({
        id: r._id,
        sectionId: '', // images belong to the board, not a section — see PHASE-1-DATA-MODEL
        url: str(r[K.image.image]),
        tags: [],
        clientVote: myVotes.get(r._id),
      }));
    const knownImageIds = new Set(images.map((i) => i.id));

    const versions: SlideVersions = new Map();
    const slidesBySection = new Map<string, Slide[]>();
    for (const row of slideRows) {
      const sectionId = str(row[K.slide.section]);
      const content = parseSlideContent(row[K.slide.elementsJson], knownImageIds);
      const slide: Slide = {
        id: row._id,
        sectionId,
        name: str(row[K.slide.name]) || 'Slide',
        elements: content.elements,
        background: content.background,
        commentPins: pinsBySlide.get(row._id) ?? [],
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
        // The stack in the top bar is who has access, in a stable order.
        viewers: [...people.values()],
      },
      versions,
      lockedSlideIds,
      voteRowIds,
    };
  }

  /** Writes one slide's canvas: its elements and anything else the slide itself carries. */
  async saveSlide(
    slideId: string,
    elements: Slide['elements'],
    background?: string
  ): Promise<void> {
    await this.api.patch(TYPE.slide, slideId, {
      [K.slide.elementsJson]: serializeSlideContent({ elements: [...elements], background }),
    });
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

  /**
   * Copies a whole moodboard into another one: sections, slides, canvas, images, palette
   * and vision brief. Nothing else comes across — no threads, no comments, no votes, no
   * approval state, no locks. A template is what the board looked like, not what was said
   * about it.
   *
   * The copy is a fork, not a reference. New Image rows are written and every slide's
   * elements JSON is rewritten through an old-id → new-id map, so deleting an image in
   * the copy can never reach the original and editing the original never reaches the copy.
   *
   * The one thing still shared is the file behind each image: Bubble's CDN sends no CORS
   * headers, so the bundle cannot read a file's bytes to re-upload them. Re-hosting has to
   * happen server-side — see bubble/PHASE-11-TEMPLATES.md. Until it runs the rows are
   * independent and the files are shared, which is the right order: the board opens at
   * once and separates behind the scenes.
   */
  async cloneInto(sourceMoodboardId: string, targetMoodboardId: string): Promise<void> {
    const [source, sectionRows, imageRows] = await Promise.all([
      this.api.get(TYPE.moodboard, sourceMoodboardId),
      this.api.list(TYPE.section, [
        { key: K.section.moodboard, constraint_type: 'equals', value: sourceMoodboardId },
      ]),
      this.api.list(TYPE.image, [
        { key: K.image.moodboard, constraint_type: 'equals', value: sourceMoodboardId },
      ]),
    ]);

    // Images first: the slides about to be written reference them.
    const imageIdMap = new Map<string, string>();
    for (const row of imageRows) {
      if (row[K.image.inUse] === false) continue; // retired in the source; don't carry it over
      const newId = await this.createImage(targetMoodboardId, str(row[K.image.image]));
      imageIdMap.set(row._id, newId);
    }

    const ordered = [...sectionRows].sort(
      (a, b) => num(a[K.section.order]) - num(b[K.section.order])
    );
    for (const section of ordered) {
      if (section[K.section.archived] === true) continue;
      const newSectionId = await this.createSection(
        targetMoodboardId,
        str(section[K.section.name]) || 'Section',
        str(section[K.section.icon]),
        num(section[K.section.order])
      );
      // Status deliberately left at its default: a copy has been approved by nobody.
      const brief = str(section[K.section.visionBrief]);
      if (brief) {
        await this.api.patch(TYPE.section, newSectionId, {
          [K.section.visionBrief]: brief,
        });
      }

      const slideRows = await this.api.list(TYPE.slide, [
        { key: K.slide.section, constraint_type: 'equals', value: section._id },
      ]);
      slideRows.sort((a, b) => num(a[K.slide.order]) - num(b[K.slide.order]));
      for (const slide of slideRows) {
        const newSlideId = await this.createSlide(
          newSectionId,
          str(slide[K.slide.name]) || 'Slide',
          num(slide[K.slide.order])
        );
        // Every image the source had is a known id here — the map was just built from
        // exactly those rows — so nothing is dropped for being unrecognised.
        const content = parseSlideContent(
          str(slide[K.slide.elementsJson]),
          new Set(imageIdMap.keys())
        );
        const elements: CanvasElement[] = [];
        for (const el of content.elements) {
          if (el.type !== 'image') {
            elements.push(el);
            continue;
          }
          const mapped = imageIdMap.get(el.imageId);
          // An element pointing at an image that didn't come across would render as a
          // hole. Dropping it is the honest outcome.
          if (mapped) elements.push({ ...el, imageId: mapped });
        }
        await this.saveSlide(newSlideId, elements, content.background);
      }
    }

    const palette = asList(source[K.moodboard.palette]);
    const visionBrief = str(source[K.moodboard.visionBrief]);
    if (palette.length || visionBrief) {
      await this.api.patch(TYPE.moodboard, targetMoodboardId, {
        ...(palette.length ? { [K.moodboard.palette]: palette } : {}),
        ...(visionBrief ? { [K.moodboard.visionBrief]: visionBrief } : {}),
      });
    }
  }

  /**
   * A template the planner can reuse, holding a copy of this board.
   *
   * No Event is set: a template belongs to whoever made it, not to the wedding it happened
   * to be built for. The name is the template's own — `Name` is otherwise unused on a
   * moodboard, since the top bar shows the event's.
   */
  async createTemplate(name: string, businessId: string): Promise<string> {
    return this.api.create(TYPE.moodboard, {
      [K.moodboard.name]: name,
      [K.moodboard.template]: true,
      ...(businessId ? { [K.moodboard.business]: businessId } : {}),
    });
  }

  /**
   * Templates this viewer may start from: their own business's, plus Gatherwise's.
   *
   * Scoped on the business explicitly rather than left to privacy rules. The moodboard
   * types are currently readable by anyone logged in, so an unscoped query would offer a
   * planner every other business's templates — and each one would carry their client's
   * photographs across.
   */
  async listTemplates(businessId: string): Promise<{ id: string; name: string; system: boolean }[]> {
    const [mine, system] = await Promise.all([
      businessId
        ? this.api.list(TYPE.moodboard, [
            { key: K.moodboard.template, constraint_type: 'equals', value: true },
            { key: K.moodboard.business, constraint_type: 'equals', value: businessId },
          ])
        : Promise.resolve([]),
      this.api.list(TYPE.moodboard, [
        { key: K.moodboard.systemTemplate, constraint_type: 'equals', value: true },
      ]),
    ]);
    const byId = new Map<string, { id: string; name: string; system: boolean }>();
    for (const row of system) {
      byId.set(row._id, { id: row._id, name: str(row[K.moodboard.name]) || 'Untitled', system: true });
    }
    // A board flagged both ways is Gatherwise's; listing it twice would be the only harm.
    for (const row of mine) {
      if (byId.has(row._id)) continue;
      byId.set(row._id, { id: row._id, name: str(row[K.moodboard.name]) || 'Untitled', system: false });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Replaces a board's contents with a fork of a template.
   *
   * Nothing is destroyed. The board's existing sections are archived — the same thing
   * deleting a section already does — and its images retired to `In use? = no`, so the
   * slides, comments and files all survive and an archived section can be brought back.
   * Then the template is forked in on top.
   *
   * That matters for a one-click action on a board someone may have spent hours on: the
   * word "replace" should not mean "gone".
   */
  async replaceWithTemplate(templateId: string, targetMoodboardId: string): Promise<void> {
    const [sections, images] = await Promise.all([
      this.api.list(TYPE.section, [
        { key: K.section.moodboard, constraint_type: 'equals', value: targetMoodboardId },
      ]),
      this.api.list(TYPE.image, [
        { key: K.image.moodboard, constraint_type: 'equals', value: targetMoodboardId },
      ]),
    ]);

    for (const section of sections) {
      if (section[K.section.archived] === true) continue;
      await this.archiveSection(section._id);
    }
    for (const image of images) {
      if (image[K.image.inUse] === false) continue;
      await this.retireImage(image._id);
    }

    await this.cloneInto(templateId, targetMoodboardId);
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
      [K.slide.elementsJson]: serializeSlideContent({ elements: [] }),
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
    // Same option-set rule as votes: the display text, not the internal key.
    if (patch.status !== undefined) fields[K.section.status] = writeOption(patch.status);
    if (patch.approvedDate !== undefined) fields[K.section.approvedDate] = patch.approvedDate;
    if (Object.keys(fields).length) await this.api.patch(TYPE.section, sectionId, fields);
  }

  /**
   * Locked slides are a list on the section, so this writes the whole list.
   *
   * Read-modify-write, which two planners locking different slides at the same second could
   * race — the loser's lock is dropped, not corrupted, and re-locking fixes it. Not worth a
   * version check for a control one person uses at a time.
   */
  async setLockedSlides(sectionId: string, slideIds: readonly string[]): Promise<void> {
    await this.api.patch(TYPE.section, sectionId, {
      [K.section.lockedSlides]: [...slideIds],
    });
  }

  /** Sections are archived rather than deleted, so their slides and comments survive. */
  async archiveSection(sectionId: string): Promise<void> {
    await this.api.patch(TYPE.section, sectionId, { [K.section.archived]: true });
  }

  async setPalette(moodboardId: string, colors: readonly string[]): Promise<void> {
    await this.api.patch(TYPE.moodboard, moodboardId, { [K.moodboard.palette]: [...colors] });
  }

  async setBoardVisionBrief(moodboardId: string, text: string): Promise<void> {
    await this.api.patch(TYPE.moodboard, moodboardId, { [K.moodboard.visionBrief]: text });
  }

  /**
   * A thread is created with its first comment, never before it.
   *
   * Dropping a pin and then thinking better of it is a normal thing to do, and if the row
   * were written on pin-drop every abandoned pin would be a permanent empty thread that
   * everyone afterwards has to look at.
   */
  async createThread(
    moodboardId: string,
    slideId: string,
    x: number,
    y: number
  ): Promise<string> {
    return this.api.create(TYPE.thread, {
      [K.thread.moodboard]: moodboardId,
      [K.thread.slide]: slideId,
      [K.thread.x]: Math.round(x),
      [K.thread.y]: Math.round(y),
      [K.thread.resolved]: false,
    });
  }

  async castVote(imageId: string, vote: ImageVote): Promise<string> {
    return this.api.create(TYPE.vote, {
      [K.vote.image]: imageId,
      [K.vote.vote]: writeOption(vote),
    });
  }

  async changeVote(voteRowId: string, vote: ImageVote): Promise<void> {
    await this.api.patch(TYPE.vote, voteRowId, { [K.vote.vote]: writeOption(vote) });
  }

  /** Clearing a vote removes the row: "no opinion" and "never voted" are the same thing. */
  async clearVote(voteRowId: string): Promise<void> {
    await this.api.remove(TYPE.vote, voteRowId);
  }

  /** A pin dragged to a new spot. Geometry only — the discussion is untouched. */
  async moveThread(threadId: string, x: number, y: number): Promise<void> {
    await this.api.patch(TYPE.thread, threadId, {
      [K.thread.x]: Math.round(x),
      [K.thread.y]: Math.round(y),
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.api.remove(TYPE.thread, threadId);
  }

  /** Resolution lives on the thread, which is what the interface has always meant by it. */
  async setThreadResolved(threadId: string, resolved: boolean, userId: string): Promise<void> {
    await this.api.patch(TYPE.thread, threadId, {
      [K.thread.resolved]: resolved,
      // Bubble has no way to clear a field through the Data API, so reopening leaves the
      // previous resolver behind. Harmless: nothing reads it while Resolved? is no.
      ...(resolved
        ? { [K.thread.resolvedBy]: userId, [K.thread.resolvedDate]: new Date().toISOString() }
        : {}),
    });
  }

  async createComment(
    threadId: string,
    text: string,
    authorName: string,
    parentId?: string
  ): Promise<string> {
    return this.api.create(TYPE.comment, {
      [K.comment.thread]: threadId,
      [K.comment.text]: text,
      [K.comment.authorName]: authorName,
      ...(parentId ? { [K.comment.parent]: parentId } : {}),
    });
  }

  async updateComment(commentId: string, text: string): Promise<void> {
    await this.api.patch(TYPE.comment, commentId, {
      [K.comment.text]: text,
      [K.comment.edited]: true,
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.api.remove(TYPE.comment, commentId);
  }
}

/**
 * Rebuilds the pin tree the components expect from two flat lists.
 *
 * The local model puts `resolved` on each comment while Bubble puts it on the thread; the
 * drawer only ever offers resolve on a thread's first comment and treats a pin as resolved
 * when all of them are, so the thread's flag is copied onto every comment in it. Reading
 * it back out is `isPinResolved`, unchanged.
 */
function buildPins(
  threadRows: BubbleRow[],
  commentRows: BubbleRow[],
  people: Map<string, Viewer>
): Map<string, CommentPin[]> {
  const byThread = new Map<string, BubbleRow[]>();
  for (const row of commentRows) {
    const threadId = str(row[K.comment.thread]);
    const list = byThread.get(threadId);
    if (list) list.push(row);
    else byThread.set(threadId, [row]);
  }

  const pinsBySlide = new Map<string, CommentPin[]>();
  for (const thread of threadRows) {
    const slideId = str(thread[K.thread.slide]);
    if (!slideId) continue;
    const resolved = thread[K.thread.resolved] === true;
    const rows = byThread.get(thread._id) ?? [];

    const tops: Comment[] = [];
    const byId = new Map<string, Comment>();
    for (const row of rows) {
      const comment = toComment(row, resolved, people);
      byId.set(row._id, comment);
      if (!str(row[K.comment.parent])) tops.push(comment);
    }
    // Second pass: a reply can be listed before its parent only if Created Date ties, but
    // the walk is cheap and removes the ordering assumption entirely.
    for (const row of rows) {
      const parentId = str(row[K.comment.parent]);
      if (!parentId) continue;
      const parent = byId.get(parentId);
      const child = byId.get(row._id);
      if (!parent || !child) continue; // parent deleted; the reply is dropped rather than orphaned
      parent.replies = [...(parent.replies ?? []), child];
    }

    // A thread whose comments were all deleted has nothing to show. Skip it rather than
    // rendering a pin that opens an empty drawer.
    if (!tops.length) continue;

    // Who closed it, by name. The row stores a user id, which is no use on screen — and
    // reading it only at resolve time meant it was blank for everyone but the resolver.
    const resolvedById = str(thread[K.thread.resolvedBy]);
    if (resolved && resolvedById && tops[0]) {
      tops[0].resolvedBy = people.get(resolvedById)?.name || 'someone';
    }

    const pin: CommentPin = {
      id: thread._id,
      x: num(thread[K.thread.x]),
      y: num(thread[K.thread.y]),
      createdAt: str(thread['Created Date']),
      comments: tops,
    };
    const list = pinsBySlide.get(slideId);
    if (list) list.push(pin);
    else pinsBySlide.set(slideId, [pin]);
  }
  return pinsBySlide;
}

function toComment(
  row: BubbleRow,
  threadResolved: boolean,
  people: Map<string, Viewer>
): Comment {
  const authorId = str(row['Created By']);
  // The host's collaborator list is the source of truth: it has the current name and the
  // photo. `Author name` is the fallback for anyone no longer on the event — a planner who
  // has left should still be credited for what they wrote.
  const person = people.get(authorId);
  const authorName = person?.name || str(row[K.comment.authorName]);
  return {
    id: row._id,
    authorId,
    authorName: authorName || 'Someone',
    authorInitials: person?.initials || initialsFrom(authorName),
    authorPhotoUrl: person?.photoUrl,
    text: str(row[K.comment.text]),
    timestamp: str(row['Created Date']),
    resolved: threadResolved,
    edited: row[K.comment.edited] === true,
  };
}

/** Option sets come back as their display text, so 'Up' and 'up' both have to land. */
function readVote(value: unknown): ImageVote | undefined {
  const v = str(value).toLowerCase();
  return v === 'up' || v === 'down' ? v : undefined;
}

/**
 * An option set is written by its **display** text, not by the lowercase key the app uses
 * internally. Sending 'up' is rejected outright:
 *
 *   INVALID_DATA — could not parse this as a Moodboard Vote OS
 *
 * and the write path answers a failed write by reloading the board from the server, so
 * every thumbs-up visibly reloaded the whole moodboard. Reads still accept either case.
 */
function writeOption(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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

export type UserRole = 'planner' | 'client';

/**
 * Everything off by default is off because it isn't real yet: the Pinterest picker
 * is a static list of Unsplash URLs and "Summarize vision" is a hardcoded string on
 * a timer. The code stays in the bundle — these only decide whether it's reachable.
 */
export interface FeatureFlags {
  /** Pinterest picker + the toolbar button that opens it. */
  pinterest?: boolean;
  /** The "Summarize vision" button in the top nav. */
  summarizeVision?: boolean;
  /** The AI suggestions drawer. */
  suggestions?: boolean;
  present?: boolean;
  exportPdf?: boolean;
  /** Thumbs up/down on canvas images. */
  imageVoting?: boolean;
  comments?: boolean;
}

export interface GWMoodboardProps {
  /** The Moodboard record to open. Without it the app runs on seed data. */
  moodboardId?: string;
  /** Shown in the top nav. Comes from the host — the Event type isn't on the Data API. */
  eventName?: string;
  /** ISO date, e.g. 2026-06-14. */
  eventDate?: string;
  /** Overrides the version-derived API base. Rarely needed. */
  apiBase?: string;
  /** Bearer token. Not needed same-origin — the session cookie authenticates. */
  authToken?: string;

  /**
   * Everyone with access to this event, as three parallel lists zipped by index.
   *
   * The User type isn't on the Data API, so the board cannot look up who wrote a comment.
   * The host knows, and passing the handful of people on one event is both cheaper and
   * narrower than making every user in the app searchable.
   *
   * Three lists rather than one list of `id|name|photo` because Bubble cannot build the
   * second: `:each item's User's unique id` is a list expression it has, and joining
   * three fields per item into one string is not. A field the host cannot bind is no
   * field at all.
   */
  collaboratorIds?: unknown;
  collaboratorNames?: unknown;
  collaboratorPhotos?: unknown;

  /**
   * A moodboard to fork into this one, the first time this one opens empty.
   *
   * Set by the host when the planner picks a template (or, for a brand-new board, the
   * system starter). It is only ever read once: a board with any section already in it
   * ignores this, so a page reload can never re-copy on top of someone's work.
   */
  templateMoodboardId?: string;

  /**
   * The planner business this viewer belongs to. Scopes the template list — without it
   * every template in the app is a candidate, including other businesses'.
   * Empty for a client, who never sees templates anyway.
   */
  businessId?: string;

  currentUserId: string;
  currentUserName: string;
  /** Optional. Derived from currentUserName when blank. */
  currentUserInitials?: string;
  role: UserRole;

  /** Blocks all board mutation regardless of role. */
  readOnly?: boolean;
  /** Absolute URL of the wordmark in the top nav. */
  logoUrl?: string;
  /** CSS height for the wrapper. Default '100%' — needs a sized parent to resolve. */
  height?: string;
  features?: FeatureFlags;

  /** Uploads a file and resolves with a durable URL. Rejecting cancels the insert. */
  uploadFile?: (file: File) => Promise<string>;
  onError?: (message: string) => void;
  /** Fires whenever the host-visible state changes, for publishing to plugin states. */
  onStateChange?: (state: BoardState) => void;
  /** Fires once the board has loaded. */
  onLoaded?: () => void;
}

export interface BoardState {
  activeSectionId: string;
  activeSlideId: string;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
}

export interface GWMoodboardApi {
  version: string;
  /**
   * Mounts into el; mounting twice on the same element replaces the first.
   * `repoOverride` is for the dev harness only — Bubble never passes it.
   */
  mount(el: HTMLElement, props: GWMoodboardProps, repoOverride?: unknown): string;
  /** Shallow-merges props and re-renders. Safe to call on every host update tick. */
  update(instanceId: string, props: Partial<GWMoodboardProps>): void;
  unmount(instanceId: string): void;
}

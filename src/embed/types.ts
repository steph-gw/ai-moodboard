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
   * Everyone with access to this event, as `id|name|photoUrl` (photo optional).
   *
   * The User type isn't on the Data API, so the board cannot look up who wrote a comment.
   * The host knows, and passing the handful of people involved is both cheaper and
   * narrower than exposing every user in the app to be searched.
   */
  collaborators?: string[];

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

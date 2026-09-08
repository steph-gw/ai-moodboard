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
  currentUserId: string;
  currentUserName: string;
  currentUserInitials: string;
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
}

export interface GWMoodboardApi {
  version: string;
  /** Mounts into el; mounting twice on the same element replaces the first. */
  mount(el: HTMLElement, props: GWMoodboardProps): string;
  /** Shallow-merges props and re-renders. Safe to call on every host update tick. */
  update(instanceId: string, props: Partial<GWMoodboardProps>): void;
  unmount(instanceId: string): void;
}

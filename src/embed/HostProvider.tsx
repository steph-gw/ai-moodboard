import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { BubbleApi } from './bubbleApi';
import { BoardRepo, type BoardIdentity } from './boardRepo';
import type { FeatureFlags, GWMoodboardProps, UserRole } from './types';

export interface HostServices {
  currentUserId: string;
  currentUserName: string;
  currentUserInitials: string;
  role: UserRole;
  readOnly: boolean;
  logoUrl: string;
  features: Required<FeatureFlags>;
  /** The mounted root. Keyboard listeners and fullscreen scope to this. */
  rootEl: HTMLElement;
  /** Body-level div that menus, modals and the export sheet portal into. */
  portalHost: HTMLElement;
  uploadFile: (file: File) => Promise<string>;
  onError: (message: string) => void;
  onStateChange?: (state: import('./types').BoardState) => void;
  onLoaded?: () => void;
  /** null when no moodboardId was supplied — the app then runs on seed data. */
  repo: BoardRepo | null;
  identity: BoardIdentity | null;
}

const DEFAULT_FEATURES: Required<FeatureFlags> = {
  pinterest: false,
  summarizeVision: false,
  suggestions: false,
  present: true,
  exportPdf: true,
  imageVoting: true,
  comments: true,
};

const HostContext = createContext<HostServices | null>(null);

export function useHost(): HostServices {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost must be used inside <HostProvider>');
  return host;
}

interface Props extends GWMoodboardProps {
  rootEl: HTMLElement;
  portalHost: HTMLElement;
  /** Lets the dev harness swap in a local store instead of talking to Bubble. */
  repoOverride?: BoardRepo | null;
  children: ReactNode;
}

export function HostProvider({ rootEl, portalHost, repoOverride, children, ...props }: Props) {
  const {
    currentUserId,
    currentUserName,
    currentUserInitials,
    role,
    readOnly,
    logoUrl,
    features,
    uploadFile,
    onError,
    onStateChange,
    onLoaded,
    moodboardId,
    eventName,
    eventDate,
    apiBase,
    authToken,
  } = props;

  const repo = useMemo(() => {
    if (repoOverride !== undefined) return repoOverride;
    if (!moodboardId) return null;
    return new BoardRepo(new BubbleApi({ base: apiBase, authToken }));
  }, [repoOverride, moodboardId, apiBase, authToken]);

  const identity = useMemo<BoardIdentity | null>(
    () => (moodboardId ? { moodboardId, eventName: eventName ?? '', eventDate: eventDate ?? '' } : null),
    [moodboardId, eventName, eventDate]
  );

  const value = useMemo<HostServices>(
    () => ({
      currentUserId,
      currentUserName,
      currentUserInitials: currentUserInitials || initialsFrom(currentUserName),
      role,
      // Clients read the board; they still vote and comment, which don't go
      // through the board state at all.
      readOnly: readOnly ?? role === 'client',
      logoUrl: logoUrl ?? '',
      features: { ...DEFAULT_FEATURES, ...features },
      rootEl,
      portalHost,
      uploadFile:
        uploadFile ??
        (() => Promise.reject(new Error('No upload handler configured for this moodboard'))),
      onError: onError ?? ((message: string) => console.error('[gw-moodboard]', message)),
      repo,
      identity,
      onStateChange,
      onLoaded,
    }),
    [
      currentUserId,
      currentUserName,
      currentUserInitials,
      role,
      readOnly,
      logoUrl,
      features,
      rootEl,
      portalHost,
      uploadFile,
      onError,
      repo,
      identity,
      onStateChange,
      onLoaded,
    ]
  );

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

/**
 * Initials for the avatar, from the name. The host can still pass its own — some people
 * go by initials that their name doesn't spell — but it shouldn't have to store a field
 * whose value is almost always the first letters of the name it already has.
 *
 * Takes the first letter of the first and last words, so "Mary-Jane van der Berg" gives
 * MB rather than MV — the particles in the middle are not what anyone would write down.
 * Falls back to the first two characters of a single word, and to nothing at all when the
 * name is empty: a blank avatar reads better than a stray "?".
 */
function initialsFrom(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return [...words[0]].slice(0, 2).join('').toUpperCase();
  return ([...words[0]][0] + [...words[words.length - 1]][0]).toUpperCase();
}

import { createContext, useContext, useMemo, type ReactNode } from 'react';
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
  children: ReactNode;
}

export function HostProvider({ rootEl, portalHost, children, ...props }: Props) {
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
  } = props;

  const value = useMemo<HostServices>(
    () => ({
      currentUserId,
      currentUserName,
      currentUserInitials,
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
    ]
  );

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

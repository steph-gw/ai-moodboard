import { GWMoodboard } from './index';
import type { UserRole } from './types';

/**
 * Stand-in for the host page. The surrounding chrome in dev/index.html is
 * deliberately unstyled-by-us: if the moodboard's CSS leaks, it shows up there.
 */
const el = document.getElementById('board');
if (!el) throw new Error('dev harness: #board missing');

const PEOPLE: Record<UserRole, { id: string; name: string; initials: string }> = {
  planner: { id: 'u-planner', name: 'Stephanie Chang', initials: 'SC' },
  client: { id: 'u-client', name: 'Alexander Lee', initials: 'AL' },
};

let role: UserRole = 'planner';

// Local stand-in for Bubble's context.uploadContent. Object URLs die on reload,
// which is exactly the behaviour the real host has to replace.
const uploadFile = (file: File) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(URL.createObjectURL(file)), 400));

const id = GWMoodboard.mount(el, {
  ...PEOPLE[role],
  currentUserId: PEOPLE[role].id,
  currentUserName: PEOPLE[role].name,
  currentUserInitials: PEOPLE[role].initials,
  role,
  logoUrl: './gatherwise-logo.png',
  uploadFile,
  onError: (m) => console.error('[host]', m),
});

document.getElementById('role-switch')?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'BUTTON') return;
  role = target.dataset.role as UserRole;
  GWMoodboard.update(id, {
    role,
    currentUserId: PEOPLE[role].id,
    currentUserName: PEOPLE[role].name,
    currentUserInitials: PEOPLE[role].initials,
  });
  document
    .querySelectorAll('#role-switch button')
    .forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.role === role));
});

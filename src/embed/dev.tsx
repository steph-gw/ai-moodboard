import { GWMoodboard } from './index';
import { BoardRepo } from './boardRepo';
import { DevBubbleApi, DEV_MOODBOARD_ID } from './devStore';
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

/**
 * Stand-in for Bubble's context.uploadContent. Returns a data URL rather than an object
 * URL: an object URL dies with the page, so an upload would look fine and then vanish on
 * reload — the exact bug this phase exists to remove, hidden by the harness.
 */
const uploadFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => setTimeout(() => resolve(String(reader.result)), 300);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

// Talks to a localStorage-backed stand-in for Bubble, through the real repo — so the
// save loop, the version guard and the row mapping are all the production code paths.
const devApi = new DevBubbleApi();
const devRepo = new BoardRepo(devApi);
(window as unknown as { gwDev: unknown }).gwDev = {
  api: devApi,
  reset: () => { devApi.reset(); location.reload(); },
};

const id = GWMoodboard.mount(el, {
  ...PEOPLE[role],
  currentUserId: PEOPLE[role].id,
  currentUserName: PEOPLE[role].name,
  currentUserInitials: PEOPLE[role].initials,
  role,
  logoUrl: './gatherwise-logo.png',
  moodboardId: DEV_MOODBOARD_ID,
  eventName: 'The Ashworth–Linden Wedding',
  eventDate: '2026-06-14',
  uploadFile,
  onError: (m) => console.error('[host]', m),
}, devRepo);

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

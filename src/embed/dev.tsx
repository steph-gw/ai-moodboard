import { GWMoodboard } from './index';
import { BoardRepo } from './boardRepo';
import { DevBubbleApi, DEV_MOODBOARD_ID } from './devStore';
import type { UserRole } from './types';

/**
 * Stand-in for the host page. The surrounding chrome in dev/index.html is
 * deliberately unstyled-by-us: if the moodboard's CSS leaks, it shows up there.
 */
/** A flat-colour avatar as a data URI, so the harness pulls nothing off the network. */
function swatch(color: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`
  )}`;
}

/** Stand-in for Bubble's list property object. See collaboratorIds below. */
function bubbleList(values: string[]) {
  return {
    length: () => values.length,
    get: (from: number, count: number) => values.slice(from, from + count),
  };
}

const el = document.getElementById('board');
if (!el) throw new Error('dev harness: #board missing');

// No initials here on purpose: the bundle derives them from the name, and the harness
// should exercise the path Bubble actually uses.
const PEOPLE: Record<UserRole, { id: string; name: string }> = {
  planner: { id: 'u-planner', name: 'Stephanie Chang' },
  client: { id: 'u-client', name: 'Alexander Lee' },
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
devApi.actingUserId = PEOPLE[role].id;
const devRepo = new BoardRepo(devApi);
// Mirrors what the Bubble element publishes as states, so the host-facing contract is
// exercised here rather than first discovered inside the plugin.
const hostView = { state: null as unknown, loadedCount: 0 };
(window as unknown as { gwDev: unknown }).gwDev = {
  api: devApi,
  hostView,
  reset: () => { devApi.reset(); location.reload(); },
};

const id = GWMoodboard.mount(el, {
  ...PEOPLE[role],
  currentUserId: PEOPLE[role].id,
  currentUserName: PEOPLE[role].name,
  role,
  logoUrl: './gatherwise-logo.png',
  moodboardId: DEV_MOODBOARD_ID,
  businessId: 'biz-dev',
  // Deliberately the shape Bubble actually sends, not a plain array. A Bubble list
  // property is an object with .length() and .get(from, count), and passing it through
  // untouched crashed the board on `.join is not a function` the first time a real
  // collaborator list arrived — a failure the harness could not have caught while it
  // handed over tidy arrays. `as never` because the prop type is the array the bundle
  // is supposed to end up with; the point is to prove it survives the wrong thing.
  collaboratorIds: bubbleList(['u-planner', 'u-client']),
  collaboratorNames: bubbleList(['Stephanie Chang', 'Alexander Lee']),
  // Data URIs, not remote images: the harness should make no network calls of its own,
  // and an empty photo list meant the photo-avatar path — where the tooltip bug lived —
  // was never rendered locally at all.
  collaboratorPhotos: bubbleList([swatch('#8a9a7b'), swatch('#c4a35a')]),
  eventName: 'The Ashworth–Linden Wedding',
  eventDate: '2026-06-14',
  uploadFile,
  onError: (m) => console.error('[host]', m),
  onStateChange: (state) => { hostView.state = state; },
  onLoaded: () => { hostView.loadedCount++; },
}, devRepo);

document.getElementById('role-switch')?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'BUTTON') return;
  role = target.dataset.role as UserRole;
  devApi.actingUserId = PEOPLE[role].id;
  GWMoodboard.update(id, {
    role,
    currentUserId: PEOPLE[role].id,
    currentUserName: PEOPLE[role].name,
    });
  document
    .querySelectorAll('#role-switch button')
    .forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.role === role));
});

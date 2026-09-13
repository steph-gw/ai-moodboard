import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MoodboardApp } from '../components/MoodboardApp';
import type { BoardRepo } from './boardRepo';
import type { GWMoodboardApi, GWMoodboardProps } from './types';

declare const __GW_VERSION__: string;

interface Instance {
  root: Root;
  repoOverride?: BoardRepo | null;
  el: HTMLElement;
  portalHost: HTMLElement;
  props: GWMoodboardProps;
  focusOnInteract: () => void;
  /** Tears down the viewport-height listener, when there is one. */
  stopHeight?: () => void;
}

/** Never collapse to nothing, however little room is left. */
const MIN_VIEWPORT_HEIGHT = 320;

/**
 * Sizes the wrapper.
 *
 * `viewport` means "from wherever this element starts, down to the bottom of the window".
 * Measured from the element's offset in the document rather than from the viewport, so the
 * number does not change as the page scrolls — measuring against the viewport would grow
 * the board every time it scrolled out from under the header.
 */
function applyHeight(inst: Instance) {
  inst.stopHeight?.();
  inst.stopHeight = undefined;

  const height = inst.props.height;
  if (!height) return;

  if (height !== 'viewport') {
    inst.el.style.height = height;
    return;
  }

  let frame = 0;
  const measure = () => {
    frame = 0;
    const top = inst.el.getBoundingClientRect().top + window.scrollY;
    inst.el.style.height = `${Math.max(MIN_VIEWPORT_HEIGHT, Math.round(window.innerHeight - top))}px`;
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(measure);
  };

  measure();
  window.addEventListener('resize', schedule);
  // The header above it can change height without the window doing anything — a wrapped
  // title, a banner appearing — and the board has to give back the space.
  const observer = new ResizeObserver(schedule);
  observer.observe(document.body);
  inst.stopHeight = () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    observer.disconnect();
  };
}

const instances = new Map<string, Instance>();
let nextId = 0;

function render(id: string, inst: Instance) {
  inst.root.render(
    createElement(MoodboardApp, {
      ...inst.props,
      key: id,
      rootEl: inst.el,
      portalHost: inst.portalHost,
      repoOverride: inst.repoOverride,
    })
  );
}

export const GWMoodboard: GWMoodboardApi = {
  version: __GW_VERSION__,

  mount(el, props, repoOverride) {
    const repo = repoOverride as BoardRepo | null | undefined;
    // Bubble can re-run initialize on the same node; leaving the old React root
    // attached would leave two apps fighting over the same element.
    for (const [existingId, inst] of instances) {
      if (inst.el === el) GWMoodboard.unmount(existingId);
    }

    const id = `gw-${++nextId}`;
    el.classList.add('gw-mb');
    // Keyboard shortcuts listen on this element rather than the window, so it has to
    // be focusable and take focus when the user interacts with the board.
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
    const focusOnInteract = () => el.focus({ preventScroll: true });
    el.addEventListener('pointerdown', focusOnInteract);
    // Menus and modals portal out of the element to escape its overflow, but must
    // stay inside a .gw-mb ancestor or every rule in the stylesheet stops matching.
    const portalHost = document.createElement('div');
    portalHost.className = 'gw-mb gw-mb-portals';
    portalHost.dataset.gwInstance = id;
    document.body.appendChild(portalHost);

    const inst: Instance = { root: createRoot(el), el, portalHost, props, focusOnInteract, repoOverride: repo };
    applyHeight(inst);
    instances.set(id, inst);
    render(id, inst);
    return id;
  },

  update(id, props) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.props = { ...inst.props, ...props };
    if (props.height !== undefined) applyHeight(inst);
    render(id, inst);
  },

  unmount(id) {
    const inst = instances.get(id);
    if (!inst) return;
    instances.delete(id);
    inst.stopHeight?.();
    inst.el.removeEventListener('pointerdown', inst.focusOnInteract);
    inst.root.unmount();
    inst.portalHost.remove();
    inst.el.classList.remove('gw-mb');
  },
};

declare global {
  interface Window {
    GWMoodboard: GWMoodboardApi;
  }
}

window.GWMoodboard = GWMoodboard;

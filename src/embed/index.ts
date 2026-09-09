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

    if (props.height) el.style.height = props.height;

    const inst: Instance = { root: createRoot(el), el, portalHost, props, focusOnInteract, repoOverride: repo };
    instances.set(id, inst);
    render(id, inst);
    return id;
  },

  update(id, props) {
    const inst = instances.get(id);
    if (!inst) return;
    inst.props = { ...inst.props, ...props };
    if (props.height) inst.el.style.height = props.height;
    render(id, inst);
  },

  unmount(id) {
    const inst = instances.get(id);
    if (!inst) return;
    instances.delete(id);
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

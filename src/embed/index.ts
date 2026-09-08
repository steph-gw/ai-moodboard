import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MoodboardApp } from '../components/MoodboardApp';

declare const __GW_VERSION__: string;

interface Instance {
  root: Root;
  el: HTMLElement;
}

const instances = new Map<string, Instance>();
let nextId = 0;

/**
 * Minimal mount surface. Props, host services and the update path arrive in phase 3 —
 * for now this only proves the app runs outside Next from a single bundled file.
 */
export const GWMoodboard = {
  version: __GW_VERSION__,

  mount(el: HTMLElement): string {
    for (const [id, inst] of instances) {
      if (inst.el === el) {
        inst.root.unmount();
        instances.delete(id);
      }
    }
    const id = `gw-${++nextId}`;
    const root = createRoot(el);
    root.render(createElement(MoodboardApp));
    instances.set(id, { root, el });
    return id;
  },

  unmount(id: string): void {
    const inst = instances.get(id);
    if (!inst) return;
    inst.root.unmount();
    instances.delete(id);
  },
};

declare global {
  interface Window {
    GWMoodboard: typeof GWMoodboard;
  }
}

window.GWMoodboard = GWMoodboard;

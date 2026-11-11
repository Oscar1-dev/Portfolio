// Visitor preferences: colour theme and motion mode. Both start from the
// operating-system setting, can be switched by hand, and persist.
// The first paint is handled by the inline script in Layout.astro; this
// module wires the controls and tells the rest of the site when things change.
export type Theme = 'dark' | 'light';
export type Motion = 'full' | 'reduced';

const root = document.documentElement;
const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the choice simply lasts for this page */
  }
};

export const theme = (): Theme => (root.dataset.theme === 'light' ? 'light' : 'dark');
export const motion = (): Motion => (root.dataset.motion === 'reduced' ? 'reduced' : 'full');

function announce(text: string) {
  const live = document.querySelector<HTMLElement>('[data-prefs-live]');
  if (live) live.textContent = text;
}

export function setTheme(next: Theme, persist = true) {
  root.dataset.theme = next;
  if (persist) store('theme', next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f1eee7' : '#050606');
  sync();
  document.dispatchEvent(new CustomEvent('prefs:theme', { detail: next }));
  if (persist) announce(`${next === 'light' ? 'Light' : 'Dark'} theme on`);
}

export function setMotion(next: Motion, persist = true) {
  root.dataset.motion = next;
  root.classList.toggle('motion-ok', next === 'full');
  if (persist) store('motion', next);
  sync();
  document.dispatchEvent(new CustomEvent('prefs:motion', { detail: next }));
  if (persist) announce(next === 'full' ? 'Full motion on' : 'Reduced motion on: animations and autoplaying video are paused');
}

/** Reflect the current state on every control (header, menu, palette). */
function sync() {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    const light = theme() === 'light';
    b.setAttribute('aria-pressed', String(light));
    b.querySelectorAll<HTMLElement>('[data-label]').forEach((l) => (l.textContent = light ? 'Light theme' : 'Dark theme'));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]').forEach((b) => {
    const reduced = motion() === 'reduced';
    b.setAttribute('aria-pressed', String(reduced));
    b.querySelectorAll<HTMLElement>('[data-label]').forEach((l) => (l.textContent = reduced ? 'Reduced motion' : 'Full motion'));
  });
}

let bound = false;
export function mountPrefs() {
  sync();
  if (bound) return;
  bound = true;
  // Delegated, so controls inside swapped page content keep working.
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-theme-toggle], [data-motion-toggle]');
    if (!t) return;
    if (t.matches('[data-theme-toggle]')) setTheme(theme() === 'light' ? 'dark' : 'light');
    else setMotion(motion() === 'full' ? 'reduced' : 'full');
  });
  // Follow the OS while the visitor has not chosen for themselves.
  const follow = (key: string, fn: () => void) => () => {
    try {
      if (!localStorage.getItem(key)) fn();
    } catch {
      fn();
    }
  };
  const light = matchMedia('(prefers-color-scheme: light)');
  light.addEventListener('change', follow('theme', () => setTheme(light.matches ? 'light' : 'dark', false)));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  reduce.addEventListener('change', follow('motion', () => setMotion(reduce.matches ? 'reduced' : 'full', false)));
}

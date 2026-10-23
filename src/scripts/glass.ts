// Pointer light for glass surfaces: every [data-glass] element gets --mx/--my
// (the pointer position within it, in %) so its specular highlight follows
// the cursor, like light catching a pane. One delegated listener for the page.
let bound = false;

export function mountGlass(): void {
  if (bound || !matchMedia('(hover: hover)').matches) return;
  bound = true;
  let current: HTMLElement | null = null;
  let queued: PointerEvent | null = null;
  const apply = () => {
    const e = queued;
    queued = null;
    if (!e) return;
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-glass]') ?? null;
    if (current && current !== el) current.style.removeProperty('--lit');
    current = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    el.style.setProperty('--lit', '1');
  };
  // Magnetic buttons: a button leans a few pixels toward the cursor.
  let magnet: HTMLElement | null = null;
  const pull = (e: PointerEvent) => {
    const btn = (e.target as Element | null)?.closest<HTMLElement>('.btn') ?? null;
    if (magnet && magnet !== btn) {
      magnet.style.removeProperty('--tx');
      magnet.style.removeProperty('--ty');
    }
    magnet = btn;
    if (!btn || !document.documentElement.classList.contains('motion-ok')) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(1)}px`);
    btn.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(1)}px`);
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!queued) requestAnimationFrame(apply);
      queued = e;
      pull(e);
    },
    { passive: true },
  );
}

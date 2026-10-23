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
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!queued) requestAnimationFrame(apply);
      queued = e;
    },
    { passive: true },
  );
}

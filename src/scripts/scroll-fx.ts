// Scroll progress for foreground content. Native scrolling only: nothing
// here changes how the page scrolls.
//
// Elements with [data-progress] get a CSS custom property --p (0 → 1) every
// frame, and CSS does the rest (transforms, opacity, clip). Two modes:
//   data-progress="pass"  0 when the element enters the bottom of the
//                         viewport, 1 when it leaves the top
//   data-progress="pin"   for a tall container holding a position:sticky
//                         child: 0 when it pins, 1 when it releases
// Foreground only. Background media never subscribes to this: the rendered
// scene loops play on their own clock (scripts/media.ts).

type Mode = 'pass' | 'pin';
interface Target {
  el: HTMLElement;
  mode: Mode;
  last: number;
  top: number;
  height: number;
}

let frame = 0;
let targets: Target[] = [];
let geometryFrame = 0;
let geometryObserver: ResizeObserver | null = null;

function cacheGeometry() {
  const y = window.scrollY;
  for (const t of targets) {
    const r = t.el.getBoundingClientRect();
    t.top = r.top + y;
    t.height = r.height;
  }
}

function scheduleGeometry() {
  cancelAnimationFrame(geometryFrame);
  geometryFrame = requestAnimationFrame(cacheGeometry);
}

function measure(y: number) {
  const vh = window.innerHeight;
  for (const t of targets) {
    const relativeTop = t.top - y;
    // Distant sections cannot produce a visible progress change. Avoid style
    // work until they are near the viewport, while still resolving endpoints.
    if (relativeTop > vh * 1.5 && t.last === 0) continue;
    if (relativeTop + t.height < -vh * 0.5 && t.last === 1) continue;
    let p: number;
    if (t.mode === 'pin') {
      const span = t.height - vh;
      p = span > 0 ? -relativeTop / span : relativeTop < 0 ? 1 : 0;
    } else {
      p = (vh - relativeTop) / (vh + t.height);
    }
    p = Math.min(1, Math.max(0, p));
    if (Math.abs(p - t.last) > 0.0005) {
      t.last = p;
      t.el.style.setProperty('--p', p.toFixed(4));
    }
  }
}

let queued = false;
function onScroll() {
  if (queued) return;
  queued = true;
  frame = requestAnimationFrame(() => {
    queued = false;
    measure(window.scrollY);
  });
}

export function mountScroll(): void {
  destroyScroll();
  const motion = document.documentElement.classList.contains('motion-ok');
  targets = [...document.querySelectorAll<HTMLElement>('[data-progress]')].map((el) => ({
    el,
    mode: (el.dataset.progress === 'pin' ? 'pin' : 'pass') as Mode,
    last: -1,
    top: 0,
    height: 0,
  }));
  if (!motion) {
    // Static resting states: pinned sequences show their finished frame,
    // pass-through effects (tilts, parallax) sit at their neutral midpoint.
    targets.forEach((t) => t.el.style.setProperty('--p', t.mode === 'pin' ? '1' : '0.5'));
    document.documentElement.dataset.static = 'true';
    return;
  }
  delete document.documentElement.dataset.static;
  if (!targets.length) return;
  cacheGeometry();
  measure(window.scrollY);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleGeometry, { passive: true });
  geometryObserver = new ResizeObserver(() => {
    scheduleGeometry();
    onScroll();
  });
  geometryObserver.observe(document.body);
}

export function destroyScroll(): void {
  cancelAnimationFrame(frame);
  queued = false;
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', scheduleGeometry);
  geometryObserver?.disconnect();
  geometryObserver = null;
  cancelAnimationFrame(geometryFrame);
  targets = [];
}

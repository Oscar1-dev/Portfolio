// Scroll engine: Lenis smooth scrolling plus a tiny progress system.
//
// Elements with [data-progress] get a CSS custom property --p (0 → 1) every
// frame, and CSS does the rest (transforms, opacity, clip). Two modes:
//   data-progress="pass"  0 when the element enters the bottom of the
//                         viewport, 1 when it leaves the top
//   data-progress="pin"   for a tall container holding a position:sticky
//                         child: 0 when it pins, 1 when it releases
// This engine is foreground-only. The WebGL atmosphere does not subscribe to
// it and receives no scroll position, velocity or section state.
import Lenis from 'lenis';

type Mode = 'pass' | 'pin';
interface Target {
  el: HTMLElement;
  mode: Mode;
  last: number;
  top: number;
  height: number;
}

let lenis: Lenis | null = null;
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

function tick(time: number) {
  lenis?.raf(time);
  const y = lenis ? lenis.scroll : window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  document.documentElement.style.setProperty('--page-p', max > 0 ? (y / max).toFixed(4) : '0');
  measure(y);
  frame = requestAnimationFrame(tick);
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
  cacheGeometry();
  lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1, anchors: { offset: -80 } });
  window.addEventListener('resize', scheduleGeometry, { passive: true });
  geometryObserver = new ResizeObserver(scheduleGeometry);
  geometryObserver.observe(document.body);
  frame = requestAnimationFrame(tick);
}

export function destroyScroll(): void {
  cancelAnimationFrame(frame);
  lenis?.destroy();
  lenis = null;
  window.removeEventListener('resize', scheduleGeometry);
  geometryObserver?.disconnect();
  geometryObserver = null;
  cancelAnimationFrame(geometryFrame);
  targets = [];
}

/** Scroll to the top on page change (Lenis keeps its own position). */
export function resetScroll(): void {
  lenis?.scrollTo(0, { immediate: true });
}

// Scroll engine: Lenis smooth scrolling plus a tiny progress system.
//
// Elements with [data-progress] get a CSS custom property --p (0 → 1) every
// frame, and CSS does the rest (transforms, opacity, clip). Two modes:
//   data-progress="pass"  0 when the element enters the bottom of the
//                         viewport, 1 when it leaves the top
//   data-progress="pin"   for a tall container holding a position:sticky
//                         child: 0 when it pins, 1 when it releases
// The document also gets --scroll-v (scroll velocity, roughly −1…1) for the
// few effects that respond to speed. Reduced motion: native scroll, and every
// element is given its resting state (--p: 1) so nothing is half-hidden.
import Lenis from 'lenis';

type Mode = 'pass' | 'pin';
interface Target {
  el: HTMLElement;
  mode: Mode;
  last: number;
}

let lenis: Lenis | null = null;
let frame = 0;
let targets: Target[] = [];
let lastY = 0;
let velocity = 0;
const listeners = new Set<(y: number) => void>();

/** Subscribe to scroll ticks (used by the 3D scene and the hero). */
export function onScrollTick(fn: (y: number) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function measure() {
  const vh = window.innerHeight;
  for (const t of targets) {
    const r = t.el.getBoundingClientRect();
    let p: number;
    if (t.mode === 'pin') {
      const span = r.height - vh;
      p = span > 0 ? -r.top / span : r.top < 0 ? 1 : 0;
    } else {
      p = (vh - r.top) / (vh + r.height);
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
  const dy = y - lastY;
  lastY = y;
  velocity += (Math.max(-1, Math.min(1, dy / 60)) - velocity) * 0.12;
  document.documentElement.style.setProperty('--scroll-v', velocity.toFixed(3));
  measure();
  listeners.forEach((fn) => fn(y));
  frame = requestAnimationFrame(tick);
}

export function mountScroll(): void {
  destroyScroll();
  const motion = document.documentElement.classList.contains('motion-ok');
  targets = [...document.querySelectorAll<HTMLElement>('[data-progress]')].map((el) => ({
    el,
    mode: (el.dataset.progress === 'pin' ? 'pin' : 'pass') as Mode,
    last: -1,
  }));
  if (!motion) {
    // Static resting states: pinned sequences show their finished frame,
    // pass-through effects (tilts, parallax) sit at their neutral midpoint.
    targets.forEach((t) => t.el.style.setProperty('--p', t.mode === 'pin' ? '1' : '0.5'));
    document.documentElement.dataset.static = 'true';
    return;
  }
  delete document.documentElement.dataset.static;
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, anchors: { offset: -80 } });
  lastY = lenis.scroll;
  frame = requestAnimationFrame(tick);
}

export function destroyScroll(): void {
  cancelAnimationFrame(frame);
  lenis?.destroy();
  lenis = null;
  targets = [];
}

/** Scroll to the top on page change (Lenis keeps its own position). */
export function resetScroll(): void {
  lenis?.scrollTo(0, { immediate: true });
}

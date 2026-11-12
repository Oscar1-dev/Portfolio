// Site-wide animated background: a quiet piece of line-art space. One ringed
// planet low on the right, two thin orbits with a moon each, and a handful of
// faint stars. Everything turns slowly on its own clock and shifts a little
// with the pointer for depth.
//
// It never reads scroll position. It stops entirely in Reduced motion (a still
// frame stays), when the tab is hidden, and under forced colours.
import { motion } from './prefs';

let raf = 0;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let w = 0;
let h = 0;
let px = 0;
let py = 0;
let tx = 0;
let ty = 0;
let ink = '255 255 255';
let accent = '143 166 184';
let ground = '#050606';
let last = 0;

// Fixed star positions (fractions of the viewport), so they never jump.
const STARS = Array.from({ length: 26 }, (_, i) => {
  const a = Math.sin(i * 127.1) * 43758.5453;
  const b = Math.sin(i * 311.7) * 24634.6345;
  return { x: a - Math.floor(a), y: b - Math.floor(b), s: 0.6 + (i % 3) * 0.35, p: i * 1.7 };
});

function readTheme() {
  const s = getComputedStyle(document.documentElement);
  ink = s.getPropertyValue('--fg-rgb').trim() || ink;
  accent = s.getPropertyValue('--scene-c').trim() || accent;
  ground = s.getPropertyValue('--ink-0').trim() || ground;
}

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!raf) draw(last);
}

function ring(cx: number, cy: number, rx: number, ry: number, rot: number, from: number, to: number) {
  ctx!.beginPath();
  ctx!.ellipse(cx, cy, rx, ry, rot, from, to);
  ctx!.stroke();
}

function draw(time: number) {
  if (!ctx) return;
  const c = ctx;
  c.clearRect(0, 0, w, h);
  const small = w < 760;

  // stars: the far layer, barely moves
  for (const s of STARS) {
    const a = 0.16 + 0.14 * Math.sin(time * 0.4 + s.p);
    c.fillStyle = `rgb(${ink} / ${a})`;
    c.beginPath();
    c.arc(s.x * w - px * 6, s.y * h - py * 6, s.s, 0, Math.PI * 2);
    c.fill();
  }

  // orbits: the middle layer, around a point high on the left
  const ox = w * 0.16 - px * 16;
  const oy = h * 0.2 - py * 16;
  const tilt = -0.32;
  c.lineWidth = 1;
  [0.34, 0.56].forEach((k, i) => {
    const rx = Math.max(w, h) * k;
    const ry = rx * 0.3;
    c.strokeStyle = `rgb(${ink} / 0.07)`;
    ring(ox, oy, rx, ry, tilt, 0, Math.PI * 2);
    const a = time * (0.05 - i * 0.02) + i * 2.4;
    const mx = ox + Math.cos(a) * rx * Math.cos(tilt) - Math.sin(a) * ry * Math.sin(tilt);
    const my = oy + Math.cos(a) * rx * Math.sin(tilt) + Math.sin(a) * ry * Math.cos(tilt);
    c.fillStyle = `rgb(${accent} / 0.7)`;
    c.beginPath();
    c.arc(mx, my, 2.5 + i, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = `rgb(${accent} / 0.25)`;
    ring(mx, my, 7 + i * 2, 7 + i * 2, 0, 0, Math.PI * 2);
  });

  // the ringed planet: the near layer, moves most
  const R = Math.min(w, h) * (small ? 0.2 : 0.24);
  const cx = w * (small ? 0.86 : 0.88) - px * 34;
  const cy = h * 0.8 - py * 34;
  const rot = -0.36 + Math.sin(time * 0.08) * 0.03;
  const rings = [1.5, 1.72, 1.86, 2.12];
  c.lineWidth = 1.2;
  // far half of the rings, behind the body
  rings.forEach((k, i) => {
    c.strokeStyle = `rgb(${i === 1 ? accent : ink} / ${i === 1 ? 0.4 : 0.16})`;
    ring(cx, cy, R * k, R * k * 0.26, rot, Math.PI, Math.PI * 2);
  });
  // body: filled with the page colour so it hides the far rings
  c.fillStyle = ground;
  c.beginPath();
  c.arc(cx, cy, R, 0, Math.PI * 2);
  c.fill();
  const g = c.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.1, cx, cy, R);
  g.addColorStop(0, `rgb(${accent} / 0.2)`);
  g.addColorStop(1, `rgb(${accent} / 0.02)`);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = `rgb(${ink} / 0.3)`;
  c.stroke();
  // bands: three latitude lines that drift, so the planet reads as turning
  c.save();
  c.beginPath();
  c.arc(cx, cy, R, 0, Math.PI * 2);
  c.clip();
  c.strokeStyle = `rgb(${ink} / 0.1)`;
  for (let i = 0; i < 3; i++) {
    const y = cy + (i - 1) * R * 0.42 + Math.sin(time * 0.12 + i) * 4;
    ring(cx, y, R * 1.1, R * 0.16, rot, 0, Math.PI);
  }
  c.restore();
  // near half of the rings, in front; dashes creep round so the rings turn
  rings.forEach((k, i) => {
    c.strokeStyle = `rgb(${i === 1 ? accent : ink} / ${i === 1 ? 0.6 : 0.24})`;
    c.setLineDash(i === 2 ? [2, 10] : []);
    c.lineDashOffset = -time * 6;
    ring(cx, cy, R * k, R * k * 0.26, rot, 0, Math.PI);
  });
  c.setLineDash([]);
}

function frame(t: number) {
  px += (tx - px) * 0.05;
  py += (ty - py) * 0.05;
  last = t / 1000;
  draw(last);
  raf = requestAnimationFrame(frame);
}

function sync() {
  cancelAnimationFrame(raf);
  raf = 0;
  if (!canvas || !ctx) return;
  const forced = matchMedia('(forced-colors: active)').matches;
  canvas.dataset.on = String(!forced);
  if (forced) return ctx.clearRect(0, 0, w, h);
  if (motion() === 'full' && !document.hidden) raf = requestAnimationFrame(frame);
  else draw(last); // Reduced motion: one still frame
}

let bound = false;
export function mountField(): void {
  canvas = document.querySelector<HTMLCanvasElement>('[data-field]');
  ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) return;
  readTheme();
  resize();
  sync();
  if (bound) return;
  bound = true;
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX / w - 0.5;
      ty = e.clientY / h - 0.5;
    },
    { passive: true },
  );
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('prefs:motion', sync);
  document.addEventListener('prefs:theme', () => {
    readTheme();
    if (!raf) draw(last);
  });
}

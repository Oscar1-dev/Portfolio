// Rendered scene loops (SceneMedia.astro).
//
// Each scene is a poster image with a silent looping video over it. In Full
// motion the video loads when its frame nears the viewport, plays while it is
// visible and pauses when it is not. In Reduced motion nothing autoplays: the
// poster stays, and the play button still lets a visitor run a loop on purpose.
// Nothing here reads scroll position; visibility is the only input.
import { motion } from './prefs';

interface Scene {
  root: HTMLElement;
  video: HTMLVideoElement;
  button: HTMLButtonElement | null;
  visible: boolean;
  /** null = follow the motion mode; true/false = the visitor decided. */
  wanted: boolean | null;
}

let scenes: Scene[] = [];
let io: IntersectionObserver | null = null;

const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

function load(s: Scene) {
  if (s.video.dataset.loaded) return;
  s.video.dataset.loaded = 'true';
  const small = window.innerWidth <= 760 && s.video.dataset.small === 'true';
  const base = s.video.dataset.base!;
  for (const [ext, type] of [
    ['webm', 'video/webm; codecs="vp9"'],
    ['mp4', 'video/mp4; codecs="avc1.640028"'],
  ]) {
    const src = document.createElement('source');
    src.src = `${base}${small ? '-sm' : ''}.${ext}`;
    src.type = type;
    s.video.append(src);
  }
  s.video.load();
}

function shouldPlay(s: Scene) {
  if (!s.visible || document.hidden) return false;
  if (s.wanted !== null) return s.wanted;
  return motion() === 'full' && !saveData();
}

function update(s: Scene) {
  const play = shouldPlay(s);
  if (play) {
    load(s);
    s.video.play().catch(() => s.root.classList.remove('is-playing'));
  } else {
    s.video.pause();
  }
  // What the button would do next, as text and as state.
  const playing = s.wanted !== null ? s.wanted : motion() === 'full' && !saveData();
  s.root.classList.toggle('is-stopped', !playing);
  if (s.button) {
    s.button.setAttribute('aria-pressed', String(!playing));
    const label = s.button.querySelector('[data-label]');
    if (label) label.textContent = `${playing ? 'Pause' : 'Play'} animation${s.root.dataset.title ? `: ${s.root.dataset.title}` : ''}`;
  }
}

export function mountMedia(): void {
  io?.disconnect();
  scenes = [...document.querySelectorAll<HTMLElement>('[data-scene-media]')].map((root) => ({
    root,
    video: root.querySelector('video')!,
    button: root.querySelector<HTMLButtonElement>('[data-scene-toggle]'),
    visible: false,
    wanted: null,
  }));
  if (!scenes.length) return;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const s = scenes.find((x) => x.root === e.target);
        if (!s) continue;
        s.visible = e.isIntersecting;
        update(s);
      }
    },
    { rootMargin: '200px 0px', threshold: 0.01 },
  );
  for (const s of scenes) {
    s.video.addEventListener('playing', () => s.root.classList.add('is-playing'));
    s.video.addEventListener('error', () => s.root.classList.remove('is-playing'), true);
    s.button?.addEventListener('click', () => {
      const playing = s.wanted !== null ? s.wanted : motion() === 'full' && !saveData();
      s.wanted = !playing;
      if (!s.wanted) s.root.classList.remove('is-playing');
      update(s);
    });
    io.observe(s.root);
    update(s);
  }
}

// A change of motion mode overrides earlier per-scene choices.
document.addEventListener('prefs:motion', () => {
  for (const s of scenes) {
    s.wanted = null;
    if (motion() === 'reduced') s.root.classList.remove('is-playing');
    update(s);
  }
});
document.addEventListener('visibilitychange', () => scenes.forEach(update));

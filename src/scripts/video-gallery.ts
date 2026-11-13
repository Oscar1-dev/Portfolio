// Scroll-aware playback for the About page's "Inspired by" gallery
// (src/components/VideoGallery.astro).
//
// Policy
//   - Loading: a clip gets its poster + src only when it comes within one
//     viewport of the screen (preload="metadata"), and is unloaded again once
//     it's far away and paused (its position is kept for when it returns).
//   - Active clip: at most one. "Coverage" is how much of a clip is on screen
//     relative to the smaller of its own height and the viewport's, so tall
//     portrait clips on short screens still qualify. A clip becomes active at
//     ≥ ENTER coverage, but only after scrolling settles (so skimming past
//     clips never starts them). When several qualify, the one nearest the
//     middle of the screen wins. The current clip stays active until it drops
//     below EXIT (the gap stops flicker at the viewport edge) or another is
//     clearly nearer the middle — unless the visitor started it themselves.
//     Leaving pauses immediately.
//   - Autoplay: the active clip plays muted, unless the visitor paused it
//     themselves (that sticks until they press play again) or prefers
//     reduced motion (then nothing starts on its own).
//   - Sound: off until the visitor turns it on. After that, clips try to play
//     with sound; if the browser refuses, the clip falls back to muted and
//     the sound button says "Tap for sound".
//   - Every play() carries a token. If anything changed while the promise was
//     pending (scrolled away, another clip took over, tab hidden), the late
//     resolution is paused on arrival — so rapid scrolling can't start two.
//   - UI state follows real media events (playing/pause/waiting/error), never
//     the assumption that play() worked.
const ENTER = 0.6;
const EXIT = 0.3;
const SETTLE_MS = 160;
const SWITCH_MARGIN = 0.2; // of viewport height
// `volume` below is the slider position (0–1). Loudness is not linear in gain,
// so the slider is mapped through a curve: equal steps sound like equal steps,
// instead of everything happening in the bottom fifth of the track.
const DEFAULT_VOLUME = 0.7;
const gain = (position: number) => Math.pow(Math.min(1, Math.max(0, position)), 2.4);

type State = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';

const STATUS: Record<State, string> = {
  idle: 'Paused',
  loading: 'Loading',
  playing: 'Playing',
  paused: 'Paused',
  blocked: 'Tap to play',
  error: 'Unavailable',
};

interface Clip {
  root: HTMLElement;
  video: HTMLVideoElement;
  playBtn: HTMLButtonElement;
  soundBtn: HTMLButtonElement;
  soundText: HTMLElement;
  volume: HTMLInputElement;
  status: HTMLElement;
  error: HTMLElement;
  label: string;
  coverage: number;
  centerOffset: number;
  loaded: boolean;
  resumeAt: number;
  manualPaused: boolean;
  failed: boolean;
}

export function mountVideoGallery(): void {
  const gallery = document.querySelector<HTMLElement>('[data-gallery]');
  if (!gallery) return;

  const clips: Clip[] = [...gallery.querySelectorAll<HTMLElement>('[data-clip]')].map((root) => ({
    root,
    video: root.querySelector('video')!,
    playBtn: root.querySelector('[data-play]')!,
    soundBtn: root.querySelector('[data-sound]')!,
    soundText: root.querySelector('[data-sound-text]')!,
    volume: root.querySelector('[data-volume]')!,
    status: root.querySelector('[data-status]')!,
    error: root.querySelector('[data-error]')!,
    label: root.dataset.label ?? 'clip',
    coverage: 0,
    centerOffset: Infinity,
    loaded: false,
    resumeAt: 0,
    manualPaused: false,
    failed: false,
  }));
  if (!clips.length) return;

  const byElement = new Map(clips.map((c) => [c.root as Element, c]));
  const reduced = !document.documentElement.classList.contains('motion-ok');

  let soundOn = false;
  let volume = DEFAULT_VOLUME;
  let active: Clip | null = null;
  let userChosen: Clip | null = null; // started by the visitor; scrolling won't steal it while visible
  let token = 0;
  let settleTimer = 0;
  let resumeAfterHidden = false;

  // iOS exposes volume as read-only (always 1); hide the slider there.
  const probe = document.createElement('video');
  probe.volume = 0.5;
  if (probe.volume !== 0.5) gallery.setAttribute('data-no-volume', '');

  // ---- UI -----------------------------------------------------------------
  const setState = (c: Clip, s: State) => {
    c.root.dataset.state = s;
    c.status.textContent = STATUS[s];
    const busy = s === 'playing' || s === 'loading';
    c.root.toggleAttribute('data-busy', busy);
    c.playBtn.setAttribute('aria-label', `${busy ? 'Pause' : 'Play'} ${c.label}`);
  };

  const syncSound = (c: Clip) => {
    const audible = !c.video.muted && c.video.volume > 0;
    c.soundBtn.setAttribute('aria-pressed', String(audible));
    c.soundText.textContent = c.root.hasAttribute('data-sound-blocked') ? 'Tap for sound' : audible ? 'Sound on' : 'Sound off';
  };

  const syncVolumeSliders = () => {
    const v = String(soundOn ? volume : 0);
    clips.forEach((c) => (c.volume.value = v));
  };

  // ---- Loading ------------------------------------------------------------
  const load = (c: Clip) => {
    if (c.loaded || c.failed) return;
    const { src, poster } = c.video.dataset;
    if (!src) return;
    if (poster && !c.video.getAttribute('poster')) c.video.poster = poster;
    c.video.preload = 'metadata';
    c.video.src = src;
    c.loaded = true;
    if (c.resumeAt > 0) {
      const at = c.resumeAt;
      c.video.addEventListener('loadedmetadata', () => (c.video.currentTime = at), { once: true });
    }
  };

  const unload = (c: Clip) => {
    if (!c.loaded || c === active || !c.video.paused) return;
    c.resumeAt = c.video.currentTime;
    c.loaded = false;
    c.video.removeAttribute('src');
    c.video.load(); // releases the buffered media
    if (!c.failed) setState(c, c.manualPaused ? 'paused' : 'idle');
  };

  // ---- Playback -----------------------------------------------------------
  const play = (c: Clip) => {
    if (c.failed) return;
    const mine = ++token;
    const stale = () => mine !== token || active !== c || document.hidden;
    load(c);
    c.video.volume = gain(volume);
    c.video.muted = !soundOn;
    setState(c, 'loading');

    const attempt = () => {
      let p: Promise<void> | undefined;
      try {
        p = c.video.play();
      } catch (err) {
        return Promise.reject(err);
      }
      return Promise.resolve(p).then(() => {
        if (stale()) c.video.pause();
      });
    };

    attempt().catch((err: unknown) => {
      if (stale()) return;
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') return; // superseded by pause()/load(); events carry the state
      if (name === 'NotAllowedError' && !c.video.muted) {
        // Sound was refused without a fresh gesture — keep playing silently.
        c.video.muted = true;
        c.root.setAttribute('data-sound-blocked', '');
        syncSound(c);
        attempt().catch(() => {
          if (!stale()) setState(c, 'blocked');
        });
        return;
      }
      setState(c, 'blocked');
    });
  };

  const halt = (c: Clip) => {
    token++; // invalidates any pending play() for this or any clip
    c.video.pause();
    if (!c.failed && c.root.dataset.state === 'loading') setState(c, 'paused');
  };

  const deactivate = (c: Clip) => {
    c.root.removeAttribute('data-active');
    halt(c);
    if (active === c) active = null;
    if (userChosen === c) userChosen = null;
  };

  const activate = (c: Clip) => {
    if (active === c) return;
    if (active) deactivate(active);
    active = c;
    c.root.setAttribute('data-active', '');
  };

  // Observer entries only arrive at threshold crossings, so a clip sitting
  // fully on screen keeps stale geometry while the page scrolls. Re-measure
  // the on-screen clips directly when it's time to decide.
  const measure = (c: Clip) => {
    const r = c.root.getBoundingClientRect();
    const vh = window.innerHeight;
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    c.coverage = r.height > 0 ? visible / Math.min(r.height, vh) : 0;
    c.centerOffset = Math.abs(r.top + r.height / 2 - vh / 2);
  };

  const choose = () => {
    if (document.hidden) return;
    clips.forEach((c) => c.coverage > 0 && measure(c));
    if (active && active.coverage < EXIT) deactivate(active);
    const best = clips
      .filter((c) => !c.failed && c.coverage >= ENTER)
      .sort((a, b) => a.centerOffset - b.centerOffset || b.coverage - a.coverage)[0];
    if (!best || best === active) return;
    if (active) {
      // Keep the current clip while it's still reasonably on screen, unless
      // another is clearly nearer the middle — and never take over from a
      // clip the visitor started themselves.
      if (userChosen === active) return;
      if (best.centerOffset > active.centerOffset - window.innerHeight * SWITCH_MARGIN) return;
    }
    activate(best);
    if (!best.manualPaused && !reduced) play(best);
  };

  const settle = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(choose, SETTLE_MS);
  };

  // ---- Observers ----------------------------------------------------------
  const nearObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const c = byElement.get(e.target);
        if (!c) return;
        if (e.isIntersecting) load(c);
        else unload(c);
      });
    },
    { rootMargin: '100% 0px' }
  );

  const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
  const viewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const c = byElement.get(e.target);
        if (!c) return;
        const rootH = e.rootBounds?.height ?? window.innerHeight;
        const h = e.boundingClientRect.height;
        c.coverage = h > 0 ? e.intersectionRect.height / Math.min(h, rootH) : 0;
        c.centerOffset = Math.abs(e.boundingClientRect.top + h / 2 - rootH / 2);
      });
      if (active && active.coverage < EXIT) deactivate(active); // leaving stops at once
      settle();
    },
    { threshold: thresholds }
  );

  // ---- Per-clip wiring ----------------------------------------------------
  const toggle = (c: Clip) => {
    if (c.failed) return;
    if (c.root.hasAttribute('data-busy')) {
      c.manualPaused = true;
      halt(c);
      return;
    }
    c.manualPaused = false;
    activate(c);
    userChosen = c;
    play(c);
  };

  clips.forEach((c) => {
    const v = c.video;
    setState(c, 'idle');
    syncSound(c);

    v.addEventListener('play', () => {
      // Belt and braces: whatever started, nothing else keeps playing.
      clips.forEach((o) => {
        if (o !== c && !o.video.paused) o.video.pause();
      });
      if (active !== c) v.pause();
    });
    v.addEventListener('playing', () => setState(c, 'playing'));
    v.addEventListener('waiting', () => {
      if (!v.paused) setState(c, 'loading');
    });
    v.addEventListener('pause', () => {
      if (!c.failed) setState(c, 'paused');
    });
    v.addEventListener('volumechange', () => syncSound(c));
    v.addEventListener('error', () => {
      if (!c.loaded) return; // unload() clearing src is not a failure
      c.failed = true;
      setState(c, 'error');
      c.error.hidden = false;
      [c.playBtn, c.soundBtn, c.volume].forEach((el) => (el.disabled = true));
      if (active === c) {
        deactivate(c);
        settle();
      }
    });

    c.playBtn.addEventListener('click', () => toggle(c));
    c.root.querySelector('[data-surface]')?.addEventListener('click', () => toggle(c));

    c.soundBtn.addEventListener('click', () => {
      const turningOn = v.muted || v.volume === 0;
      soundOn = turningOn;
      clips.forEach((o) => o.root.removeAttribute('data-sound-blocked'));
      if (turningOn) {
        if (volume === 0) volume = DEFAULT_VOLUME;
        v.volume = gain(volume);
        v.muted = false; // inside the click, so the browser allows it
        if (v.paused && !c.manualPaused) {
          activate(c);
          userChosen = c;
          play(c);
        }
      } else {
        clips.forEach((o) => (o.video.muted = true));
      }
      clips.forEach(syncSound);
      syncVolumeSliders();
    });

    c.volume.addEventListener('input', () => {
      volume = Number(c.volume.value);
      soundOn = volume > 0;
      clips.forEach((o) => {
        o.video.volume = gain(volume);
        if (!soundOn) o.video.muted = true;
        o.root.removeAttribute('data-sound-blocked');
      });
      if (soundOn) v.muted = false; // explicit interaction on this clip
      clips.forEach(syncSound);
      syncVolumeSliders();
    });

    nearObserver.observe(c.root);
    viewObserver.observe(c.root);
  });
  syncVolumeSliders();

  // Clips that stay fully on screen produce no observer entries while the
  // page moves, so re-decide whenever scrolling comes to rest.
  window.addEventListener('scroll', settle, { passive: true });

  // ---- Page lifecycle -----------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeAfterHidden = !!active && !active.video.paused;
      clips.forEach(halt);
      return;
    }
    // Only resume what we paused ourselves; a visitor's pause stays put.
    if (active && resumeAfterHidden && !active.manualPaused && active.coverage >= EXIT) play(active);
    resumeAfterHidden = false;
    settle();
  });

  window.addEventListener('pagehide', () => clips.forEach(halt));
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) settle();
  });
}

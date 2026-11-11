// Animated project cards ([data-flowcard]): FlowCard.astro and MiniCard.astro.

// Live state: hover or focus on pointer devices, visibility on touch
// devices, and the button always wins. The walk-through restarts each time.
const LOOP = 9000;
let cleanups: Array<() => void> = [];
export function mountCards(): void {
  cleanups.forEach((f) => f());
  cleanups = [];
  for (const card of document.querySelectorAll<HTMLElement>('[data-flowcard]')) {
    const media = card.querySelector<HTMLElement>('[data-tilt]')!;
    const btn = card.querySelector<HTMLButtonElement>('[data-flow-toggle]')!;
    const label = btn.querySelector<HTMLElement>('[data-label]')!;
    const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const motionOk = () => document.documentElement.classList.contains('motion-ok');
    let pinned: boolean | null = null; // the button's decision
    let auto = false;
    let timer = 0;
    const apply = () => {
      const live = pinned ?? (auto && motionOk());
      if ((card.dataset.live === 'true') !== live) {
        card.dataset.live = 'false';
        void card.offsetWidth; // restart the CSS timeline
        card.dataset.live = String(live);
      }
      clearInterval(timer);
      if (live)
        timer = window.setInterval(() => {
          card.dataset.live = 'false';
          void card.offsetWidth;
          card.dataset.live = 'true';
        }, LOOP);
      btn.setAttribute('aria-pressed', String(live));
      label.textContent = live ? 'Pause walk-through' : 'Play walk-through';
    };
    const on = () => ((auto = true), apply());
    const off = () => ((auto = false), apply());
    if (hover) {
      card.addEventListener('pointerenter', on);
      card.addEventListener('pointerleave', off);
      card.addEventListener('focusin', on);
      card.addEventListener('focusout', off);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!hover) e.isIntersecting ? on() : off();
        else if (!e.isIntersecting) off();
        if (!e.isIntersecting) pinned = pinned ? null : pinned;
      },
      { threshold: 0.6 },
    );
    io.observe(media);
    const click = () => {
      pinned = card.dataset.live !== 'true';
      apply();
    };
    btn.addEventListener('click', click);
    // Tilt: at most 4 degrees, eased, media only. Text never moves.
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const tick = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      media.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
      media.style.setProperty('--ry', `${(x * 4).toFixed(2)}deg`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      if (!hover || !motionOk()) return;
      const r = media.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const leave = () => {
      tx = ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    media.addEventListener('pointermove', move);
    media.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      io.disconnect();
      clearInterval(timer);
      cancelAnimationFrame(raf);
    });
  }
}

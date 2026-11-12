// Small pointer effects shared by every page. All are decoration on top of
// working links and buttons, need a mouse, and switch off in Reduced motion.
//   .btn                      leans a few pixels towards the pointer
//   [data-lit] / known cards  a soft light follows the pointer across the surface
//   [data-tilt]               tilts up to 5 degrees (cards with their own script are skipped)
const LIT = '[data-lit], .tile a, .mcard, .fcard, .contact-card, .badge, .role, .me-frame';
const TILT = '.tile a, .badge';

let bound = false;
export function mountFx(): void {
  if (bound) return;
  bound = true;
  const ok = () => document.documentElement.classList.contains('motion-ok');
  let lastBtn: HTMLElement | null = null;
  let lastTilt: HTMLElement | null = null;

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target as HTMLElement;
      if (!t.closest) return;

      const lit = t.closest<HTMLElement>(LIT);
      if (lit) {
        const r = lit.getBoundingClientRect();
        lit.style.setProperty('--lx', `${e.clientX - r.left}px`);
        lit.style.setProperty('--ly', `${e.clientY - r.top}px`);
      }
      if (!ok()) return;

      const btn = t.closest<HTMLElement>('.btn');
      if (btn !== lastBtn && lastBtn) {
        lastBtn.style.removeProperty('--tx');
        lastBtn.style.removeProperty('--ty');
      }
      lastBtn = btn;
      if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * 8}px`);
        btn.style.setProperty('--ty', `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
      }

      const tilt = t.closest<HTMLElement>(TILT);
      if (tilt !== lastTilt && lastTilt) lastTilt.style.removeProperty('transform');
      lastTilt = tilt;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    lastBtn?.style.removeProperty('--tx');
    lastBtn?.style.removeProperty('--ty');
    lastTilt?.style.removeProperty('transform');
  });
}

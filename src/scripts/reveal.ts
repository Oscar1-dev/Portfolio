// Entrance reveals for [data-reveal]. Content is visible by default; CSS only
// hides it under `.motion-ok`, and every target is shown within 2.5 s even if
// the observer never fires (the v1 bug that left pages blank).
let observer: IntersectionObserver | null = null;

export function mountReveal(): void {
  observer?.disconnect();
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')];
  if (!targets.length) return;
  if (!document.documentElement.classList.contains('motion-ok')) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty('--reveal-delay', `${Math.min(i * 70, 420)}ms`);
          el.classList.add('is-in');
          observer?.unobserve(el);
        });
    },
    { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
  );
  targets.forEach((el) => observer!.observe(el));
  // Safety net: nothing stays hidden.
  window.setTimeout(() => {
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && !el.classList.contains('is-in')) el.classList.add('is-in');
    }
  }, 2500);
}

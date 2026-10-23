// Split-flap text: [data-flap="a|b|c"] cycles through phrases like an
// airport board. The phrases live in the element's aria-label so screen
// readers get all of them at once; reduced motion shows the first, static.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@&/·-';
const timers = new Set<number>();

function render(el: HTMLElement, text: string, width: number) {
  el.replaceChildren(
    ...text.padEnd(width, ' ').split('').map((ch) => {
      const cell = document.createElement('span');
      cell.className = 'flap-cell';
      cell.textContent = ch === ' ' ? ' ' : ch;
      if (ch === ' ') cell.dataset.space = '';
      return cell;
    }),
  );
}

function flipTo(el: HTMLElement, target: string, width: number) {
  const cells = [...el.children] as HTMLElement[];
  const goal = target.padEnd(width, ' ');
  cells.forEach((cell, i) => {
    const final = goal[i] ?? ' ';
    let steps = 3 + Math.floor(Math.random() * 6) + i % 4;
    const tick = () => {
      if (steps-- <= 0) {
        cell.textContent = final === ' ' ? ' ' : final;
        if (final === ' ') cell.dataset.space = '';
        else delete cell.dataset.space;
        return;
      }
      delete cell.dataset.space;
      cell.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
      cell.classList.remove('is-flipping');
      void cell.offsetWidth;
      cell.classList.add('is-flipping');
      timers.add(window.setTimeout(tick, 55));
    };
    timers.add(window.setTimeout(tick, i * 18));
  });
}

export function mountSplitFlaps(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  for (const el of document.querySelectorAll<HTMLElement>('[data-flap]')) {
    const phrases = (el.dataset.flap ?? '').split('|').map((p) => p.trim().toUpperCase()).filter(Boolean);
    if (!phrases.length) continue;
    const width = Math.max(...phrases.map((p) => p.length));
    el.setAttribute('aria-label', phrases.join(', '));
    render(el, phrases[0]!, width);
    if (!document.documentElement.classList.contains('motion-ok') || phrases.length < 2) continue;
    let index = 0;
    const next = () => {
      index = (index + 1) % phrases.length;
      flipTo(el, phrases[index]!, width);
      timers.add(window.setTimeout(next, 3600));
    };
    timers.add(window.setTimeout(next, 3000));
  }
}

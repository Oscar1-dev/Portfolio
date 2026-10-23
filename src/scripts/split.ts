// Splits [data-split] headings into masked words for kinetic reveals.
// Keeps inline elements (e.g. <span class="foil">, <br>) intact: words inside
// them are split too, so gradients and line breaks survive. The element keeps
// an aria-label with its original text for assistive tech.
export function mountSplit(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-split]:not([data-split-done])')) {
    el.setAttribute('aria-label', el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    let i = 0;
    const walk = (node: Node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = (child.textContent ?? '').split(/(\s+)/);
          const fragment = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              fragment.append(document.createTextNode(' '));
              continue;
            }
            const outer = document.createElement('span');
            outer.className = 'w';
            outer.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.textContent = part;
            outer.style.setProperty('--i', String(i++));
            outer.append(inner);
            fragment.append(outer);
          }
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName !== 'BR') {
          walk(child);
        }
      }
    };
    walk(el);
    el.dataset.splitDone = '';
  }
}

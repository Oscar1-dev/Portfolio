// Header: current page, current home-page section, and an accessible menu.
let cleanup: (() => void) | null = null;

export function mountHeader(): void {
  cleanup?.();
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const main = document.querySelector<HTMLElement>('main');
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const here = location.pathname;
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[data-nav]')];

  // Current page: the most specific matching link wins.
  const score = (a: HTMLAnchorElement) => {
    const url = new URL(a.href);
    if (url.hash) return -1;
    return here === url.pathname ? 10_000 : here.startsWith(url.pathname) && url.pathname.split('/').length > 2 ? url.pathname.length : -1;
  };
  const best = Math.max(...navLinks.map(score));
  const markPage = () => navLinks.forEach((a) => (best > 0 && score(a) === best ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  markPage();

  // Current section (home page only): whichever spied section crosses the
  // middle band of the viewport. An observer, not a scroll listener.
  let spy: IntersectionObserver | null = null;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-spy-section]')];
  if (sections.length) {
    const visible = new Set<string>();
    spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.spySection!;
          if (e.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const current = sections.map((s) => s.dataset.spySection!).filter((id) => visible.has(id)).pop();
        navLinks.forEach((a) => (a.dataset.spy && a.dataset.spy === current ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    sections.forEach((s) => spy!.observe(s));
  }

  const setOpen = (open: boolean, returnFocus = false) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.dataset.open = String(open);
    document.body.style.overflow = open ? 'hidden' : '';
    // While the menu covers the page, the page behind it is out of reach.
    for (const el of [main, footer]) if (el) el.inert = open;
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (returnFocus) toggle.focus();
  };
  const isOpen = () => toggle?.getAttribute('aria-expanded') === 'true';
  const onToggle = () => setOpen(!isOpen(), true);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, true);
  };
  const onClick = (e: MouseEvent) => (e.target as HTMLElement).closest('a') && setOpen(false);
  const wide = matchMedia('(min-width: 1021px)');
  const onWide = () => wide.matches && setOpen(false);
  toggle?.addEventListener('click', onToggle);
  window.addEventListener('keydown', onKey);
  menu?.addEventListener('click', onClick);
  wide.addEventListener('change', onWide);
  setOpen(false);
  cleanup = () => {
    spy?.disconnect();
    window.removeEventListener('keydown', onKey);
    toggle?.removeEventListener('click', onToggle);
    menu?.removeEventListener('click', onClick);
    wide.removeEventListener('change', onWide);
  };
}

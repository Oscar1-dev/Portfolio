// Header: active section, condensed state on scroll, accessible mobile menu.
let cleanup: (() => void) | null = null;

export function mountHeader(): void {
  cleanup?.();
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  // The most specific matching link wins (so /projects/kush/ marks KUSH, not Work).
  const here = location.pathname;
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[data-nav]')];
  const score = (a: HTMLAnchorElement) => {
    const url = new URL(a.href);
    if (url.hash) return -1;
    return here === url.pathname ? 10_000 : here.startsWith(url.pathname) && url.pathname.split('/').length > 2 ? url.pathname.length : -1;
  };
  const best = Math.max(...navLinks.map(score));
  navLinks.forEach((a) => (best > 0 && score(a) === best ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const onScroll = () => header.classList.toggle('is-condensed', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setOpen = (open: boolean) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.dataset.open = String(open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
  };
  const onToggle = () => setOpen(toggle?.getAttribute('aria-expanded') !== 'true');
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
  const onClick = (e: MouseEvent) => (e.target as HTMLElement).closest('a') && setOpen(false);
  toggle?.addEventListener('click', onToggle);
  window.addEventListener('keydown', onKey);
  menu?.addEventListener('click', onClick);
  setOpen(false);
  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('keydown', onKey);
    toggle?.removeEventListener('click', onToggle);
    menu?.removeEventListener('click', onClick);
  };
}

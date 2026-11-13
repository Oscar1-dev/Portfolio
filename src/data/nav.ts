// One source for the site's navigation: header, mobile menu, footer and the
// command palette all read this. `spy` names a home-page section id whose
// visibility marks the link as current while you are on the home page.
export interface NavLink {
  href: string;
  label: string;
  /** What a visitor finds there (command palette, footer). */
  hint: string;
  spy?: string;
}

export const navLinks = (base: string): NavLink[] => [
  { href: `${base}about/`, label: 'About', hint: 'Who I am, off the clock included' },
  { href: `${base}projects/`, label: 'Projects', hint: 'Every project, searchable by technology', spy: 'projects' },
  { href: `${base}#experience`, label: 'Experience', hint: 'Current roles and study', spy: 'experience' },
  { href: `${base}learning-log/`, label: 'Journal', hint: 'Development journal: dated project milestones' },
  { href: `${base}credentials/`, label: 'Cybersecurity', hint: 'Security practice and TryHackMe record', spy: 'security' },
  { href: `${base}quotes/`, label: 'Quotes', hint: 'One fresh thought each day' },
  { href: `${base}apis/`, label: 'APIs', hint: 'Search the public API catalogue' },
  { href: `${base}#contact`, label: 'Contact', hint: 'Email, GitHub and TryHackMe', spy: 'contact' },
];

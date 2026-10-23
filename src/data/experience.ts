// Professional experience. Only what's true today: no invented duties,
// audits or results. Update entries as responsibilities are confirmed.

export interface Role {
  id: string;
  title: string;
  short: string;
  organisation: string;
  period: string;
  current: boolean;
  kind?: 'Founder' | 'Education';
  summary: string;
  focus: string[];
  note?: string;
  link?: { href: string; label: string };
}

export const roles: Role[] = [
  {
    id: 'velnqo',
    title: 'Chief Security Officer',
    short: 'CSO',
    organisation: 'Velnqo',
    period: 'October 2026 – Present',
    current: true,
    summary:
      "Velnqo is a hosting and infrastructure business in development, built around hosting management (WHMCS), server provisioning and Pterodactyl/Wings-based game and application hosting. I'm its Chief Security Officer.",
    focus: [
      'Security engineering',
      'Application & API security',
      'Backend & infrastructure security',
      'Security architecture',
      'Vulnerability management & security testing',
      'Internal security policy',
      'Data protection & access control',
    ],
  },
  {
    id: 'kush',
    title: 'Founder & Developer',
    short: 'Founder',
    organisation: 'KUSH',
    period: '2026 – Present',
    current: true,
    kind: 'Founder',
    summary:
      'My independent software and digital-services business (formerly Veyrix). I design and build all of it: the website, the platform API and database, the Discord server and its bot, and internal tools. In development and preparing for launch.',
    focus: ['Full-stack engineering', 'Authentication & 2FA', 'API & database design', 'Discord platform engineering', 'Security-conscious architecture'],
    link: { href: 'projects/kush/', label: 'KUSH case study' },
  },
  {
    id: 'disc',
    title: 'Student, Cybersecurity & IT',
    short: 'Student',
    organisation: 'DISC',
    period: 'Final year',
    current: true,
    kind: 'Education',
    summary: 'Final-year student specialising in cybersecurity and IT, practising offensive and defensive security on TryHackMe alongside project work.',
    focus: ['Cybersecurity', 'IT', 'Networking', 'Linux'],
    link: { href: 'credentials/', label: 'Security record' },
  },
];

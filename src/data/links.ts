// Project links, presented honestly. The original NopsFR GitHub account no
// longer exists, so its repository links are kept (they're part of each
// project's record) but shown as offline rather than as working links.
import type { CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

export const isOffline = (url: string) => /^https:\/\/github\.com\/NopsFR\//i.test(url);

export interface ProjectLink {
  kind: 'live' | 'github' | 'documentation';
  label: string;
  url: string;
  offline: boolean;
}

const labels = { live: 'Live demo', github: 'Source', documentation: 'Docs' } as const;

export function linksOf(project: Project): ProjectLink[] {
  const links = project.data.links ?? {};
  return (['live', 'github', 'documentation'] as const).flatMap((kind) => {
    const url = links[kind];
    return url ? [{ kind, label: labels[kind], url, offline: isOffline(url) }] : [];
  });
}

/** One line on where the code lives, for projects with no working source link. */
export function sourceNote(project: Project) {
  const links = linksOf(project);
  if (links.some((l) => l.kind === 'github' && !l.offline)) return null;
  if (links.some((l) => l.kind === 'github' && l.offline)) return 'Original repository was under the old NopsFR GitHub account, which is no longer online.';
  return 'Private repository: not published.';
}

export const byOrder = (a: Project, b: Project) => a.data.order - b.data.order;

/** Groups the free-text project types into a few browsable areas. */
export function areaOf(type: string) {
  const t = type.toLowerCase();
  if (/security|cyber/.test(t)) return 'Security';
  if (/bot|integration/.test(t)) return 'Discord & bots';
  if (/desktop/.test(t)) return 'Desktop apps';
  if (/\bai\b/.test(t)) return 'AI';
  if (/design|ux/.test(t)) return 'Web & design';
  return 'Platforms';
}

// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Vercel is the primary host (served from the domain root). The old GitHub
 * Pages copy still builds under /Portfolio until it's retired, so both work.
 */
const onVercel = Boolean(process.env.VERCEL);
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

/** Links into the deleted NopsFR GitHub account stay in the content, labelled as offline. */
function markOfflineLinks() {
  /** @param {any} node */
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'a' && typeof node.properties?.href === 'string') {
      if (/^https:\/\/github\.com\/NopsFR\//i.test(node.properties.href)) {
        node.properties.className = [...(node.properties.className ?? []), 'link-offline'];
        node.properties.title = 'Original repository — the NopsFR GitHub account is no longer online';
      } else if (/^https?:\/\//.test(node.properties.href)) {
        node.properties.target = '_blank';
        node.properties.rel = 'noopener noreferrer';
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  return () => (/** @type {any} */ tree) => visit(tree);
}

export default defineConfig({
  site: onVercel && vercelHost ? `https://${vercelHost}` : 'https://oscar1-dev.github.io',
  base: onVercel ? '/' : '/Portfolio',
  trailingSlash: 'always',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: 'github-dark' },
    rehypePlugins: [markOfflineLinks()],
  },
});

// End-to-end QA for the portfolio, driven through a real browser.
//   node tests/qa.mjs [baseUrl] [--shots]
// Default base: http://localhost:4321/Portfolio/ (astro dev) — pass the preview
// URL to test a production build. Uses the installed Edge (or CHROME_PATH).
// Writes tests/out/report.json and, with --shots, screenshots to tests/out/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:4321/Portfolio/').replace(/\/?$/, '/');
const SHOTS = args.includes('--shots');
const OUT = path.resolve('tests/out');
fs.mkdirSync(OUT, { recursive: true });
const exe =
  process.env.CHROME_PATH ??
  ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));

const PAGES = ['', 'projects/', 'projects/kush/', 'projects/feedback/', 'projects/nops-cyber-intelligence/', 'credentials/', 'learning-log/', 'about/'];
const report = { base: BASE, date: new Date().toISOString(), checks: [], axe: {}, failures: 0 };
const check = (name, pass, detail = '') => {
  report.checks.push({ name, pass: !!pass, detail: String(detail).slice(0, 600) });
  if (!pass) report.failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 220) : ''}`);
};

const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] });

async function open(route, { w = 1440, h = 900, theme, motion, media = [], mobile = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
  if (media.length) await page.emulateMediaFeatures(media);
  await page.evaluateOnNewDocument(
    (t, m) => {
      try {
        if (t) localStorage.setItem('theme', t);
        if (m) localStorage.setItem('motion', m);
      } catch {}
    },
    theme,
    motion,
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => !/\/videos\//.test(r.url()) && errors.push(`request failed: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
  return { page, ctx, errors };
}
const settle = (page, ms = 600) => new Promise((r) => setTimeout(r, ms));
/** Scroll through the page once so every reveal has fired, then return to the top. */
async function walk(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await settle(page, 400);
}

// ------------------------------------------------------------ 1. axe, both themes
for (const theme of ['dark', 'light']) {
  for (const route of PAGES) {
    const { page, ctx, errors } = await open(route, { theme, motion: 'reduced' });
    await walk(page);
    await page.evaluate(axeSource);
    const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
    const v = res.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.length, sample: x.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} :: ${(n.any[0]?.message ?? n.failureSummary ?? '').slice(0, 160)}`) }));
    report.axe[`${theme}:/${route}`] = { violations: v, incomplete: res.incomplete.map((x) => `${x.id} (${x.nodes.length})`) };
    check(`axe ${theme} /${route}`, v.length === 0, v.map((x) => `${x.id}×${x.nodes} [${x.sample[0]}]`).join(' | '));
    if (theme === 'dark') check(`no console/network errors /${route}`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}

// ------------------------------------------------------------ 2. reflow, target size, headings, landmarks
for (const route of PAGES) {
  const { page, ctx } = await open(route, { w: 320, h: 720, motion: 'reduced', mobile: true });
  await walk(page);
  const r = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - innerWidth;
    const wide = [...document.querySelectorAll('main *, header *, footer *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[data-scene-media], .kscreens, [style*="overflow"]'))
      .slice(0, 4)
      .map((el) => el.tagName + '.' + el.className);
    return { overflow, wide };
  });
  check(`reflow at 320px (400% zoom) /${route}`, r.overflow <= 0, `overflow ${r.overflow}px ${r.wide.join(', ')}`);
  await ctx.close();
}
for (const route of PAGES) {
  const { page, ctx } = await open(route, { motion: 'reduced' });
  await walk(page);
  const r = await page.evaluate(() => {
    const vis = (el) => {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, input, select, summary, [role="button"]')) {
      if (!vis(el)) continue;
      const b = el.getBoundingClientRect();
      // WCAG 2.5.8: 24×24 minimum; links inside a sentence are exempt.
      const inline = el.tagName === 'A' && getComputedStyle(el).display.startsWith('inline') && el.closest('p, li, dd, .prose, figcaption, .event, .eng-what');
      if ((b.width < 24 || b.height < 24) && !inline) small.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(b.width)}×${Math.round(b.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`);
    }
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map((h) => +h.tagName[1]);
    const skips = hs.filter((l, i) => i && l - hs[i - 1] > 1).length;
    return {
      small,
      h1: hs.filter((l) => l === 1).length,
      skips,
      landmarks: ['header', 'main', 'footer', 'nav'].filter((t) => !document.querySelector(t)),
      unnamed: [...document.querySelectorAll('a[href], button')].filter((el) => vis(el) && !(el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.querySelector('img[alt]:not([alt=""])'))).length,
      imgNoAlt: document.querySelectorAll('img:not([alt])').length,
      lang: document.documentElement.lang,
    };
  });
  check(`target size ≥ 24px /${route}`, r.small.length === 0, r.small.slice(0, 6).join(' | '));
  check(`one h1, no skipped heading levels /${route}`, r.h1 === 1 && r.skips === 0, `h1=${r.h1} skips=${r.skips}`);
  check(`landmarks, names, alt, lang /${route}`, !r.landmarks.length && !r.unnamed && !r.imgNoAlt && r.lang, JSON.stringify(r).slice(0, 200));
  await ctx.close();
}

// ------------------------------------------------------------ 3. keyboard, palette, menu
{
  const { page, ctx } = await open('', { motion: 'reduced' });
  await page.keyboard.press('Tab');
  let f = await page.evaluate(() => ({ cls: document.activeElement.className, top: document.activeElement.getBoundingClientRect().top, text: document.activeElement.textContent.trim() }));
  check('first Tab lands on a visible skip link', f.cls.includes('skip-link') && f.top >= 0, JSON.stringify(f));
  await page.keyboard.press('Enter');
  await settle(page, 200);
  check('skip link moves focus to main', await page.evaluate(() => document.activeElement.id === 'main' || location.hash === '#main'));
  // Every focus stop has a visible indicator and is not hidden under the sticky header.
  await page.evaluate(() => scrollTo(0, 0));
  await page.focus('body');
  const bad = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const header = document.querySelector('.site-header-inner').getBoundingClientRect();
      const inHeader = !!el.closest('.site-header');
      return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, obscured: !inHeader && b.bottom > 0 && b.top < header.bottom - 2 && b.bottom <= header.bottom + 2, offscreen: b.bottom < 0 || b.top > innerHeight };
    });
    if (r && (!r.outline || r.obscured || r.offscreen)) bad.push(JSON.stringify(r));
  }
  check('60 Tab stops: visible focus ring, not obscured by header', bad.length === 0, bad.slice(0, 4).join(' | '));

  // Command palette
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await settle(page, 300);
  check('Ctrl+K opens the palette with focus in the search field', await page.evaluate(() => document.querySelector('[data-palette]').open && document.activeElement.id === 'palette-input'));
  await page.keyboard.type('rust');
  await settle(page, 200);
  const res = await page.evaluate(() => ({ n: document.querySelectorAll('[role=option]:not([hidden])').length, active: document.querySelector('#palette-input').getAttribute('aria-activedescendant'), status: document.querySelector('[data-palette-status]').textContent }));
  check('palette filters and announces results', res.n > 0 && res.n < 12 && res.active && /result/.test(res.status), JSON.stringify(res));
  await page.keyboard.press('Escape');
  await settle(page, 200);
  check('Esc closes the palette', await page.evaluate(() => !document.querySelector('[data-palette]').open));
  await page.click('[data-palette-open]');
  await page.keyboard.type('feedback');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.pathname.includes('/projects/feedback'), { timeout: 8000 }).catch(() => {});
  check('palette Enter navigates to the project', (await page.url()).includes('/projects/feedback/'), await page.url());
  await ctx.close();
}
{
  const { page, ctx } = await open('', { w: 390, h: 844, motion: 'reduced', mobile: true });
  await page.click('[data-menu-toggle]');
  await settle(page, 900);
  const m = await page.evaluate(() => ({ open: document.querySelector('[data-menu]').dataset.open, expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), focusInMenu: !!document.activeElement.closest('[data-menu]'), inert: document.querySelector('main').inert, links: document.querySelectorAll('[data-menu] a').length }));
  check('mobile menu opens, moves focus in, makes the page inert', m.open === 'true' && m.expanded === 'true' && m.focusInMenu && m.inert && m.links >= 7, JSON.stringify(m));
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'mobile-menu.png') });
  await page.keyboard.press('Escape');
  await settle(page, 300);
  const c = await page.evaluate(() => ({ open: document.querySelector('[data-menu]').dataset.open, focusOnToggle: document.activeElement.matches('[data-menu-toggle]'), inert: document.querySelector('main').inert }));
  check('Esc closes the menu and returns focus to its button', c.open === 'false' && c.focusOnToggle && !c.inert, JSON.stringify(c));
  await ctx.close();
}

// ------------------------------------------------------------ 4. theme + motion preferences, video behaviour
{
  const { page, ctx } = await open('', { media: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await settle(page, 2500);
  const v0 = await page.evaluate(async () => {
    const v = document.querySelector('.hero video');
    const t0 = v.currentTime;
    await new Promise((r) => setTimeout(r, 1200));
    return { paused: v.paused, moved: v.currentTime > t0, muted: v.muted, inline: v.playsInline, loop: v.loop, hasAudioAttr: v.hasAttribute('controls'), src: v.currentSrc.split('/').pop(), posterOk: document.querySelector('.hero .sm-poster').naturalWidth > 0, theme: document.documentElement.dataset.theme, motion: document.documentElement.dataset.motion };
  });
  check('hero film autoplays: muted, inline, looping, poster present', !v0.paused && v0.moved && v0.muted && v0.inline && v0.loop && v0.posterOk, JSON.stringify(v0));
  check('default with no saved choice: dark theme, full motion', v0.theme === 'dark' && v0.motion === 'full');
  const off = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('[data-scene-media] video')];
    return vids.map((v) => ({ loaded: !!v.dataset.loaded, paused: v.paused, top: Math.round(v.getBoundingClientRect().top) }));
  });
  check('off-screen films are neither loaded nor playing', off.filter((v) => v.top > 1400).every((v) => !v.loaded && v.paused), JSON.stringify(off));
  await page.click('.hero [data-scene-toggle]');
  await settle(page, 300);
  const p = await page.evaluate(() => ({ paused: document.querySelector('.hero video').paused, pressed: document.querySelector('.hero [data-scene-toggle]').getAttribute('aria-pressed'), label: document.querySelector('.hero [data-scene-toggle] [data-label]').textContent }));
  check('pause control stops the hero film and relabels itself', p.paused && p.pressed === 'true' && /^Play/.test(p.label), JSON.stringify(p));
  // Motion toggle → reduced, persisted across reload
  await page.click('.header-end [data-motion-toggle]');
  await settle(page, 300);
  await page.reload({ waitUntil: 'networkidle2' });
  await settle(page, 1500);
  const r = await page.evaluate(() => ({ motion: document.documentElement.dataset.motion, ok: document.documentElement.classList.contains('motion-ok'), paused: [...document.querySelectorAll('[data-scene-media] video')].every((v) => v.paused), pressed: document.querySelector('.header-end [data-motion-toggle]').getAttribute('aria-pressed'), hidden: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity === '0').length }));
  check('Reduced motion persists; no film plays; no content left hidden', r.motion === 'reduced' && !r.ok && r.paused && r.pressed === 'true' && r.hidden === 0, JSON.stringify(r));
  await page.click('.hero [data-scene-toggle]');
  await settle(page, 2000);
  check('in Reduced motion a film can still be played on purpose', await page.evaluate(() => !document.querySelector('.hero video').paused));
  await page.click('.header-end [data-theme-toggle]');
  await settle(page, 300);
  await page.reload({ waitUntil: 'networkidle2' });
  const t = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor, live: document.querySelector('[data-prefs-live]') !== null }));
  check('Light theme persists across reload', t.theme === 'light' && t.bg === 'rgb(241, 238, 231)', JSON.stringify(t));
  await ctx.close();
}
{
  const { page, ctx } = await open('', { media: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });
  await settle(page, 1200);
  const r = await page.evaluate(() => ({ motion: document.documentElement.dataset.motion, theme: document.documentElement.dataset.theme, paused: [...document.querySelectorAll('[data-scene-media] video')].every((v) => v.paused) }));
  check('OS reduced-motion and light-scheme settings are honoured by default', r.motion === 'reduced' && r.theme === 'light' && r.paused, JSON.stringify(r));
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'os-reduced-light.png') });
  await ctx.close();
}
{
  // Media failure: block every video; the posters must still carry the page.
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (q) => (/\.(webm|mp4)(\?|$)/.test(q.url()) ? q.abort() : q.continue()));
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await settle(page, 1500);
  const r = await page.evaluate(() => ({ poster: document.querySelector('.hero .sm-poster').naturalWidth > 0, playing: document.querySelector('.hero [data-scene-media]').classList.contains('is-playing'), h1: !!document.querySelector('h1').offsetHeight }));
  check('with video blocked the poster and content still show', r.poster && !r.playing && r.h1, JSON.stringify(r));
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'video-blocked.png') });
  await ctx.close();
}
{
  const { page, ctx } = await open('about/', {});
  await walk(page);
  const r = await page.evaluate(() => {
    const clips = [...document.querySelectorAll('.clip video, [data-clip] video')];
    return { clips: clips.length, allMuted: clips.every((v) => v.muted), withSrc: clips.filter((v) => v.currentSrc || v.querySelector('source') || v.dataset.src).length };
  });
  check('About: all 33 credited clips are present and start muted', r.clips === 33 && r.allMuted, JSON.stringify(r));
  await ctx.close();
}

// ------------------------------------------------------------ 5. links
{
  const { page, ctx } = await open('', { motion: 'reduced' });
  const internal = new Set();
  const external = new Set();
  for (const route of PAGES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
    for (const h of hrefs) (h.startsWith(new URL(BASE).origin) ? internal : /^https?:/.test(h) ? external : new Set()).add(h);
  }
  const broken = [];
  for (const h of internal) {
    const u = new URL(h);
    const res = await fetch(u.origin + u.pathname).catch(() => null);
    if (!res || res.status !== 200) broken.push(`${res?.status} ${h}`);
    else if (u.hash) {
      const html = await res.text();
      if (!html.includes(`id="${u.hash.slice(1)}"`)) broken.push(`missing anchor ${h}`);
    }
  }
  check(`${internal.size} internal links resolve (and their #anchors exist)`, broken.length === 0, broken.slice(0, 5).join(' | '));
  report.externalLinks = [];
  for (const h of external) {
    const res = await fetch(h, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(12000) }).catch((e) => ({ status: e.name }));
    report.externalLinks.push({ url: h, status: res.status });
  }
  console.log('INFO  external links:', report.externalLinks.map((l) => `${l.status} ${l.url}`).join('\n      '));
  await ctx.close();
}

// ------------------------------------------------------------ 6. screenshots
if (SHOTS) {
  const sizes = { desktop: [1440, 900, false], tablet: [820, 1180, true], mobile: [390, 844, true] };
  for (const [name, [w, h, mobile]] of Object.entries(sizes)) {
    for (const theme of ['dark', 'light']) {
      const { page, ctx } = await open('', { w, h, theme, mobile });
      await settle(page, 3500);
      await page.screenshot({ path: path.join(OUT, `home-${name}-${theme}-full-motion.png`) });
      await ctx.close();
      const s = await open('', { w, h, theme, motion: 'reduced', mobile });
      await walk(s.page);
      await s.page.screenshot({ path: path.join(OUT, `home-${name}-${theme}-reduced-fullpage.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
      await s.ctx.close();
    }
  }
  for (const route of ['projects/', 'credentials/', 'about/', 'learning-log/', 'projects/kush/', 'missing-page/']) {
    for (const theme of ['dark', 'light']) {
      const { page, ctx } = await open(route, { theme, motion: 'reduced' });
      await walk(page);
      await page.screenshot({ path: path.join(OUT, `${route.replace(/\W+/g, '-') || 'x'}${theme}.png`) });
      await ctx.close();
    }
  }
  const fc = await open('', { media: [{ name: 'forced-colors', value: 'active' }], motion: 'reduced' });
  await walk(fc.page);
  await fc.page.screenshot({ path: path.join(OUT, 'home-forced-colors.png') });
  await fc.page.evaluate(() => document.querySelector('#security').scrollIntoView());
  await fc.page.screenshot({ path: path.join(OUT, 'security-forced-colors.png') });
  await fc.ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const passed = report.checks.filter((c) => c.pass).length;
console.log(`\n${passed}/${report.checks.length} checks passed. Report: tests/out/report.json`);
process.exit(report.failures ? 1 : 0);

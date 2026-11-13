import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const BASE = process.env.SPOTIFY_TEST_BASE || 'http://localhost:4322/Portfolio/about/';
const fixture = { title: 'TEST FIXTURE — not live music', artists: 'Test artist', album: 'Test album', duration: 200000, url: 'https://open.spotify.com/track/fixture', image: null, progress: 1000, observedAt: Date.now() };
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage(); await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(() => { localStorage.setItem('motion', 'reduced'); localStorage.setItem('theme', 'dark'); });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('[data-listening]')?.getAttribute('aria-busy') === 'false');
    const details = await page.evaluate(() => ({ frames: [...document.querySelectorAll('[data-spotify] iframe')].map(f => ({ src: f.getAttribute('src'), title: f.getAttribute('title'), lazy: f.getAttribute('loading') })), overflow: document.documentElement.scrollWidth - innerWidth, status: document.querySelector('[data-listening-status]').textContent }));
    assert.equal(details.frames.length, 3); assert.equal(details.overflow, 0); assert.match(details.status, /not connected/);
    for (const [i, id] of ['37UM9wxbOSNKMcbNmCQbeI', '2L81QkDl0dH8NEihcrtz9Z', '1Ikwne5uReBFXHnvIIF8YN'].entries()) { assert.ok(details.frames[i].src.includes(id)); assert.ok(details.frames[i].title); assert.equal(details.frames[i].lazy, 'lazy'); }
    await page.addScriptTag({ content: fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8') });
    const issues = await page.evaluate(async () => (await axe.run('[data-spotify]', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => v.id));
    assert.deepEqual(issues, []); console.log(`PASS ${width}px: layout, embeds, honest disconnected state, accessibility`);
    if (width === 1440) { await page.evaluate(() => document.querySelector('[data-spotify]').scrollIntoView()); await page.screenshot({ path: 'tests/out/spotify-disconnected-desktop.png' }); }
    await page.close();
  }
  for (const status of ['playing', 'recent', 'idle', 'rate_limited', 'authorization_required', 'http_error']) {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/spotify/data')) {
        const data = { status, current: status === 'playing' ? fixture : null, recent: status === 'recent' ? [{ ...fixture, playedAt: '2026-11-12T12:00:00Z' }] : [], topTracks: [], topArtists: [], retryAfter: 120 };
        return request.respond({ status: status === 'http_error' ? 502 : 200, contentType: 'application/json', body: JSON.stringify(data) });
      }
      return request.continue();
    });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelector('[data-listening]')?.getAttribute('aria-busy') === 'false');
    const text = await page.$eval('[data-listening-status]', el => el.textContent);
    assert.match(text, status === 'playing' ? /Listening now/ : status === 'recent' ? /Most recently played/ : status === 'idle' ? /Nothing is playing/ : status === 'authorization_required' ? /not connected/ : /unavailable/);
    console.log(`PASS browser ${status}`); await page.close();
  }
} finally { await browser.close(); }

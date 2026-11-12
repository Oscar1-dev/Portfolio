// Full-page screenshots of the inner pages: node tests/shots.mjs [theme]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const theme = process.argv[2] ?? 'dark';
const BASE = 'http://localhost:4321/Portfolio/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
fs.mkdirSync('tests/out', { recursive: true });
for (const r of ['projects/', 'projects/feedback/', 'projects/kush/', 'credentials/', 'learning-log/', 'about/']) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument((t) => { localStorage.setItem('theme', t); localStorage.setItem('motion', 'reduced'); }, theme);
  await p.goto(BASE + r, { waitUntil: 'networkidle2' });
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); });
  await p.screenshot({ path: `tests/out/inner-${r.replace(/\W+/g, '-')}${theme}.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
  await p.close();
}
await b.close();

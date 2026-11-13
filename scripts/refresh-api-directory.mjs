// Refresh the complete attributed catalogue; no build-time network dependency.
import fs from 'node:fs/promises';
const source = 'https://public-api-lists.github.io/public-api-lists/api/all.json';
const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Catalogue HTTP ${response.status}`);
const data = await response.json();
if (!Array.isArray(data.entries) || data.entries.length < 500) throw new Error('Unexpected catalogue response');
const entries = data.entries.map(item => {
  const url = new URL(item.url);
  if (!['http:','https:'].includes(url.protocol)) throw new Error('Invalid catalogue link');
  for (const key of ['name','description','category','auth','cors']) if (typeof item[key] !== 'string') throw new Error('Invalid catalogue row');
  return { name: item.name, url: url.href, description: item.description, category: item.category, auth: item.auth, https: item.https === true, cors: item.cors };
});
await fs.writeFile('src/data/public-apis.json', JSON.stringify({ source, retrieved: new Date().toISOString().slice(0,10), entries }, null, 2) + '\n');
const license = await fetch('https://raw.githubusercontent.com/public-api-lists/public-api-lists/master/LICENSE.md');
if (!license.ok) throw new Error('License retrieval failed');
await fs.writeFile('docs/public-api-lists-LICENSE.md', await license.text());
console.log(`Saved all ${entries.length} catalogue entries and upstream license.`);

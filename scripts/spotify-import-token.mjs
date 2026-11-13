// Run locally: node --env-file=.env.local scripts/spotify-import-token.mjs
import { createDecipheriv, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
if (!process.env.SPOTIFY_SETUP_SECRET) throw new Error('Load the setup secret from .env.local first.');
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const blob = Buffer.from((await prompt.question('Encrypted handoff: ')).trim(), 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(process.env.SPOTIFY_SETUP_SECRET).digest(), blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  const token = Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString('utf8');
  if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid token');
  const existing = await readFile('.env.local', 'utf8');
  const next = existing.replace(/^SPOTIFY_REFRESH_TOKEN=.*\r?\n?/m, '');
  await writeFile('.env.local', `${next.trimEnd()}\nSPOTIFY_REFRESH_TOKEN=${token}\n`, { mode: 0o600 });
  console.log('Saved to ignored .env.local. No token was printed. Copy it directly to hosting settings, then disable setup.');
} finally { prompt.close(); }

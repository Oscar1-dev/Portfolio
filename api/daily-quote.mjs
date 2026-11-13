import { createDailyQuote } from '../server/daily-quote.mjs';
const read = createDailyQuote();
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('{}'); }
  const data = await read();
  const midnight = Date.parse(new Date().toISOString().slice(0,10)) + 86400000;
  const seconds = Math.max(0, Math.min(300, Math.floor((midnight - Date.now()) / 1000)));
  res.setHeader('Cache-Control', data.status === 'ok' ? `public, max-age=0, s-maxage=${seconds}` : 'no-store');
  res.end(JSON.stringify(data));
}

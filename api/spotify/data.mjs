import { createSpotifyService } from '../../server/spotify.mjs';
const service = createSpotifyService();
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; return res.end('{}'); }
  const data = await service.read();
  res.setHeader('Cache-Control', data.status === 'playing' || data.status === 'recent' || data.status === 'idle' ? 'public, max-age=0, s-maxage=30' : 'no-store');
  if (data.retryAfter) res.setHeader('Retry-After', String(data.retryAfter));
  return res.end(JSON.stringify(data));
}

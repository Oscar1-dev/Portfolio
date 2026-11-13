import { setupEnabled, authorizedSetup, setupState, SCOPES } from '../../server/spotify.mjs';
export function secure(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
}
export default async function handler(req, res) {
  secure(res);
  if (!setupEnabled(process.env)) { res.statusCode = 404; return res.end('Setup disabled.'); }
  if (req.method === 'GET') return res.end('<!doctype html><html lang="en"><title>Owner Spotify setup</title><meta name="robots" content="noindex"><h1>Owner Spotify setup</h1><p>Enter the temporary setup password, never your Spotify password.</p><form method="post"><label>Setup password <input name="secret" type="password" autocomplete="off" required></label><button>Authorize Spotify</button></form></html>');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }
  if (req.headers.origin && req.headers.origin !== new URL(process.env.SPOTIFY_REDIRECT_URI).origin) { res.statusCode = 403; return res.end('Forbidden'); }
  let body = req.body;
  if (body == null) { body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) { res.statusCode = 413; return res.end('Too large'); } } }
  const password = typeof body === 'object' ? body.secret : new URLSearchParams(body).get('secret');
  if (!authorizedSetup(password, process.env.SPOTIFY_SETUP_SECRET)) { res.statusCode = 403; return res.end('Forbidden'); }
  const state = setupState(process.env.SPOTIFY_SETUP_SECRET);
  const secureCookie = process.env.SPOTIFY_REDIRECT_URI.startsWith('https:') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `spotify_setup=${state}; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=600${secureCookie}`);
  const params = new URLSearchParams({ client_id: process.env.SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: process.env.SPOTIFY_REDIRECT_URI, scope: SCOPES, state, show_dialog: 'true' });
  res.statusCode = 303; res.setHeader('Location', `https://accounts.spotify.com/authorize?${params}`); res.end();
}

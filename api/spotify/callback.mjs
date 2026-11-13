import { secure } from './authorize.mjs';
import { OWNER, setupEnabled, validState, tokenRequest, encryptToken } from '../../server/spotify.mjs';
// Never writes server configuration or automatically replaces the owner's grant.
export default async function handler(req, res) {
  secure(res);
  if (!setupEnabled(process.env)) { res.statusCode = 404; return res.end('Setup disabled.'); }
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('Method not allowed'); }
  const url = new URL(req.url, 'https://local.invalid');
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('spotify_setup='))?.slice(14);
  res.setHeader('Set-Cookie', 'spotify_setup=; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=0; Secure');
  if (!validState(url.searchParams.get('state'), cookie, process.env.SPOTIFY_SETUP_SECRET)) { console.warn(JSON.stringify({ service: 'spotify', event: 'owner_session_invalid_or_expired' })); res.statusCode = 403; return res.end('Invalid or expired owner session. Start setup again.'); }
  if (url.searchParams.has('error') || !url.searchParams.get('code')) { res.statusCode = 400; return res.end('Authorization cancelled.'); }
  try {
    const tokens = await tokenRequest(process.env, { grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: process.env.SPOTIFY_REDIRECT_URI });
    const response = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(8000) });
    if (!response.ok || (await response.json())?.id !== OWNER || typeof tokens.refresh_token !== 'string') { console.warn(JSON.stringify({ service: 'spotify', event: 'owner_authorization_rejected', status: response.status })); res.statusCode = 403; return res.end('Wrong Spotify account or missing refresh grant. Nothing was saved.'); }
    const payload = encryptToken(tokens.refresh_token, process.env.SPOTIFY_SETUP_SECRET);
    return res.end(`<!doctype html><html lang="en"><title>Spotify setup complete</title><meta name="robots" content="noindex"><h1>Owner account verified</h1><p>Copy the encrypted handoff into the local import script. Then remove SPOTIFY_SETUP_SECRET from hosting settings to disable setup.</p><label>Encrypted handoff <textarea readonly rows="8" cols="50">${payload}</textarea></label></html>`);
  } catch { console.warn(JSON.stringify({ service: 'spotify', event: 'owner_token_exchange_failed' })); res.statusCode = 502; return res.end('Spotify authorization could not be completed. Start setup again.'); }
}

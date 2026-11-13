import { randomBytes, createHmac, timingSafeEqual, createCipheriv, createHash } from 'node:crypto';
export const OWNER = '3135pu6uanknbgqv6i6zdgzssci4';
export const SCOPES = 'user-read-currently-playing user-read-playback-state user-read-recently-played user-top-read';
export class SpotifyError extends Error {
  constructor(kind, retry = 60) { super(kind); this.kind = kind; this.retry = retry; }
}
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function setupEnabled(env) { return typeof env.SPOTIFY_SETUP_SECRET === 'string' && env.SPOTIFY_SETUP_SECRET.length >= 32 && env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET && env.SPOTIFY_REDIRECT_URI; }
export function sign(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url'); }
export function setupState(secret, now = Date.now()) { const value = `${now}.${randomBytes(32).toString('base64url')}`; return `${value}.${sign(value, secret)}`; }
export function validState(value, cookie, secret, now = Date.now()) {
  if (!equal(value, cookie)) return false;
  const parts = value.split('.');
  const time = Number(parts[0]);
  return parts.length === 3 && time <= now && now - time < 600000 && equal(parts[2], sign(parts.slice(0, 2).join('.'), secret));
}
export function encryptToken(token, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function authorizedSetup(input, secret) { return equal(input, secret); }
export async function tokenRequest(env, params, fetcher = fetch) {
  const response = await fetcher('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params), signal: AbortSignal.timeout(8000),
  });
  if (response.status === 429) throw new SpotifyError('rate_limited', Math.max(30, Number(response.headers.get('retry-after')) || 60));
  if (!response.ok) throw new SpotifyError(response.status === 400 || response.status === 401 ? 'authorization_required' : 'unavailable');
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new SpotifyError('unavailable');
  return data;
}
const text = x => typeof x === 'string' ? x.slice(0, 300) : '';
export function spotifyUrl(value, type) { return typeof value === 'string' && new RegExp(`^https://open\\.spotify\\.com/${type}/[A-Za-z0-9]+$`).test(value) ? value : null; }
const artwork = images => {
  if (!Array.isArray(images)) return null;
  const url = images.find(x => typeof x?.url === 'string')?.url;
  try { const u = new URL(url); return u.protocol === 'https:' && (u.hostname.endsWith('.scdn.co') || u.hostname.endsWith('.spotifycdn.com')) ? u.href : null; } catch { return null; }
};
export function track(item) {
  if (!item || item.type !== 'track' || !text(item.name) || !Array.isArray(item.artists)) return null;
  const url = spotifyUrl(item.external_urls?.spotify, 'track');
  if (!url || !Number.isFinite(item.duration_ms) || item.duration_ms < 0) return null;
  return { title: text(item.name), artists: item.artists.map(a => text(a?.name)).filter(Boolean).join(', '), album: text(item.album?.name), image: artwork(item.album?.images), url, duration: item.duration_ms };
}
export function createSpotifyService(env = process.env, fetcher = fetch, clock = Date.now, logger = event => console.info(JSON.stringify(event))) {
  const diagnostic = (event, details = {}) => logger({ service: 'spotify', event, ...details });
  let access = null, accessUntil = 0, refreshing = null, blockedUntil = 0;
  let refresh = env.SPOTIFY_REFRESH_TOKEN;
  const cache = new Map();
  const flights = new Map();
  async function accessToken() {
    if (access && clock() < accessUntil) return access;
    if (!refresh || !env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      diagnostic('missing_credentials', { missing: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'].filter(k => !env[k]) });
      throw new SpotifyError('not_configured');
    }
    if (!refreshing) refreshing = tokenRequest(env, { grant_type: 'refresh_token', refresh_token: refresh }, fetcher).then(data => {
      if (typeof data.scope === 'string') {
        const granted = new Set(data.scope.split(' '));
        const missing = SCOPES.split(' ').filter(scope => !granted.has(scope));
        if (missing.length) diagnostic('missing_scopes', { missing });
      } else diagnostic('scopes_not_reported');
      diagnostic('token_refresh_succeeded');
      access = data.access_token; accessUntil = clock() + Math.max(1, data.expires_in - 60) * 1000;
      // A rotated token remains server-only. Persist the new token via owner setup
      // before a future cold start if Spotify retires the original grant.
      if (typeof data.refresh_token === 'string') refresh = data.refresh_token;
      return access;
    }).finally(() => { refreshing = null; });
    return refreshing;
  }
  async function api(path, ttl = 30000, retry = true) {
    const cached = cache.get(path);
    if (cached && clock() < cached.until) return cached.value;
    if (clock() < blockedUntil) throw new SpotifyError('rate_limited', Math.ceil((blockedUntil - clock()) / 1000));
    if (flights.has(path)) return flights.get(path);
    const request = (async () => {
      const token = await accessToken();
      const response = await fetcher(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
      if (response.status === 401 && retry) { accessUntil = 0; flights.delete(path); return api(path, ttl, false); }
      if (response.status === 429) {
        diagnostic('rate_limited', { endpoint: path, status: 429 });
        const delay = Math.max(30, Number(response.headers.get('retry-after')) || 60);
        blockedUntil = clock() + delay * 1000; throw new SpotifyError('rate_limited', delay);
      }
      if (response.status === 403 || response.status === 404) {
        const denied = await response.json().catch(() => ({}));
        const missingScope = response.status === 403 && /scope/i.test(String(denied?.error?.message || '') + String(response.headers.get('www-authenticate') || ''));
        diagnostic(missingScope ? 'missing_scopes' : response.status === 403 ? 'forbidden' : 'unsupported_endpoint', { endpoint: path, status: response.status });
        cache.set(path, { value: null, until: clock() + 300000 }); return null;
      }
      if (!response.ok && response.status !== 204) throw new SpotifyError(response.status === 401 ? 'authorization_required' : 'unavailable');
      if (response.status === 204) diagnostic('no_active_playback', { endpoint: path });
      const value = response.status === 204 ? null : await response.json();
      cache.set(path, { value, until: clock() + ttl }); return value;
    })();
    flights.set(path, request);
    try { return await request; } finally { flights.delete(path); }
  }
  async function data() {
    await accessToken();
    const failures = [];
    const feature = async (path, ttl) => { try { return await api(path, ttl); } catch (error) { failures.push(error); return null; } };
    const playback = await feature('/me/player/currently-playing', 30000);
    const recentResult = await feature('/me/player/recently-played?limit=8', 60000);
    const recent = (Array.isArray(recentResult?.items) ? recentResult.items : []).map(x => ({ ...track(x?.track), playedAt: typeof x?.played_at === 'string' && Number.isFinite(Date.parse(x.played_at)) ? x.played_at : null })).filter(x => x.url && x.playedAt);
    const current = playback?.is_playing === true ? track(playback.item) : null;
    if (playback && playback.is_playing !== true) diagnostic('no_active_playback', { paused: true });
    const topTracks = await feature('/me/top/tracks?limit=6&time_range=short_term', 900000);
    const topArtists = await feature('/me/top/artists?limit=6&time_range=short_term', 900000);
    if (failures.length === 4) throw failures[0];
    return {
      retryAfter: failures.find(e => e.kind === 'rate_limited')?.retry,
      status: current ? 'playing' : recent.length ? 'recent' : 'idle', updatedAt: new Date(clock()).toISOString(),
      current: current ? { ...current, progress: Math.min(current.duration, Math.max(0, Number(playback.progress_ms) || 0)), observedAt: Number.isFinite(playback.timestamp) ? playback.timestamp : clock() } : null,
      recent,
      topTracks: (Array.isArray(topTracks?.items) ? topTracks.items : []).map(track).filter(Boolean),
      topArtists: (Array.isArray(topArtists?.items) ? topArtists.items : []).map(x => ({ name: text(x?.name), image: artwork(x?.images), url: spotifyUrl(x?.external_urls?.spotify, 'artist') })).filter(x => x.name && x.url),
      availability: { current: playback !== null, recent: recentResult !== null, topTracks: topTracks !== null, topArtists: topArtists !== null },
    };
  }
  let snapshot = null, snapshotUntil = 0, pending = null;
  return { async read() {
    if (snapshot && clock() < snapshotUntil) return snapshot;
    if (!pending) pending = data().then(value => { snapshot = value; snapshotUntil = clock() + 30000; return value; }).catch(error => {
      diagnostic(error.kind === 'authorization_required' ? 'invalid_or_expired_authorization' : error.kind || 'upstream_unavailable');
      snapshotUntil = clock() + (error.retry || 60) * 1000;
      snapshot = { status: error.kind || 'unavailable', retryAfter: error.retry || 60 };
      return snapshot;
    }).finally(() => { pending = null; });
    return pending;
  } };
}

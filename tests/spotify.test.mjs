import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotifyService, setupState, validState, tokenRequest, track, OWNER } from '../server/spotify.mjs';
import callback from '../api/spotify/callback.mjs';
import authorize from '../api/spotify/authorize.mjs';
const env = { SPOTIFY_CLIENT_ID: 'test-id', SPOTIFY_CLIENT_SECRET: 'test-secret', SPOTIFY_REFRESH_TOKEN: 'test-refresh' };
const song = { type: 'track', name: 'Test fixture', artists: [{ name: 'Fixture artist' }], album: { name: 'Fixture album', images: [{ url: 'https://i.scdn.co/image/test' }] }, external_urls: { spotify: 'https://open.spotify.com/track/fixture' }, duration_ms: 200000 };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
function fixture({ playing = true, recent = true, denial = '', invalid = false } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options]);
    if (url.includes('/api/token')) return json({ access_token: 'test-access', expires_in: 3600 });
    if (denial && url.includes(denial)) return json({}, 403);
    if (url.includes('currently-playing')) return playing ? json({ is_playing: true, item: invalid ? {} : song, progress_ms: 4000, timestamp: 1000 }) : new Response(null, { status: 204 });
    if (url.includes('recently-played')) return json({ items: recent ? [{ track: song, played_at: '2026-11-12T12:00:00Z' }] : [] });
    return json({ items: [] });
  };
  return { calls, fetcher };
}
test('OAuth state binds session, rejects tampering, absent state and expiry', () => {
  const state = setupState('test-setup', 1000);
  assert.ok(validState(state, state, 'test-setup', 2000));
  assert.equal(validState(state, state, 'wrong', 2000), false);
  assert.equal(validState(state, 'wrong', 'test-setup', 2000), false);
  assert.equal(validState(null, undefined, 'test-setup', 2000), false);
  assert.equal(validState(state, state, 'test-setup', 700000), false);
});
test('playing response is sanitized, refreshed server-side and cached', async () => {
  const f = fixture(); const service = createSpotifyService(env, f.fetcher, () => 1000);
  const result = await service.read(); assert.equal(result.status, 'playing'); assert.equal(result.current.title, 'Test fixture');
  const n = f.calls.length; await service.read(); assert.equal(f.calls.length, n);
  assert.equal(JSON.stringify(result).includes('test-access'), false);
  assert.equal(JSON.stringify(result).includes('test-refresh'), false);
  assert.match(f.calls[0][1].body.toString(), /grant_type=refresh_token/);
});
test('paused/offline falls back to recent, empty stays idle', async () => {
  assert.equal((await createSpotifyService(env, fixture({ playing: false }).fetcher).read()).status, 'recent');
  assert.equal((await createSpotifyService(env, fixture({ playing: false, recent: false }).fetcher).read()).status, 'idle');
});
test('unavailable optional feature leaves live data intact; bad payload filtered', async () => {
  const data = await createSpotifyService(env, fixture({ denial: '/me/top/' }).fetcher).read();
  assert.equal(data.status, 'playing'); assert.equal(data.availability.topTracks, false);
  assert.equal((await createSpotifyService(env, fixture({ invalid: true }).fetcher).read()).status, 'recent');
  assert.equal(track({ ...song, external_urls: { spotify: 'javascript:alert(1)' } }), null);
});
test('missing credentials and expired grants have explicit empty states', async () => {
  assert.equal((await createSpotifyService({}).read()).status, 'not_configured');
  assert.equal((await createSpotifyService(env, async () => json({}, 400)).read()).status, 'authorization_required');
});
test('rate limit respects Retry-After and prevents immediate retry', async () => {
  let calls = 0;
  const service = createSpotifyService(env, async () => { calls++; return new Response(null, { status: 429, headers: { 'Retry-After': '180' } }); });
  const data = await service.read(); assert.equal(data.status, 'rate_limited'); assert.equal(data.retryAfter, 180);
  await service.read(); assert.equal(calls, 1);
});
test('expired access token is refreshed and API 401 retried once', async () => {
  let now = 1000, tokens = 0, unauthorized = true;
  const f = fixture();
  const fetcher = async (url, options) => {
    if (url.includes('/api/token')) { tokens++; return json({ access_token: 'test-access', expires_in: 61 }); }
    if (url.includes('currently-playing') && unauthorized) { unauthorized = false; return json({}, 401); }
    return f.fetcher(url, options);
  };
  const service = createSpotifyService(env, fetcher, () => now);
  assert.equal((await service.read()).status, 'playing'); assert.equal(tokens, 2);
  now += 61000; await service.read(); assert.equal(tokens, 3);
});
function response() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(x = '') { this.body = x; } }; }
test('owner setup is disabled by default and callback rejects missing session', async () => {
  const res = response(); await callback({ method: 'GET', url: '/api/spotify/callback?code=bad', headers: {} }, res); assert.equal(res.statusCode, 404);
});
test('protected setup, callback account binding and encrypted handoff', async () => {
  const previous = { ...process.env }; const fetchBefore = globalThis.fetch;
  Object.assign(process.env, env, { SPOTIFY_REDIRECT_URI: 'https://nopsfrgithub.vercel.app/api/spotify/callback', SPOTIFY_SETUP_SECRET: 'random-test-password-with-32-characters' });
  try {
    const res = response(); await authorize({ method: 'POST', body: { secret: 'wrong' }, headers: {} }, res); assert.equal(res.statusCode, 403);
    const begin = response(); await authorize({ method: 'POST', body: { secret: process.env.SPOTIFY_SETUP_SECRET }, headers: {} }, begin); assert.equal(begin.statusCode, 303);
    assert.match(begin.headers['Set-Cookie'], /HttpOnly/); assert.match(begin.headers['Set-Cookie'], /Secure/);
    const state = new URL(begin.headers.Location).searchParams.get('state');
    const request = { method: 'GET', url: `/api/spotify/callback?code=fixture&state=${state}`, headers: { cookie: `spotify_setup=${state}` } };
    const noSession = response(); await callback({ ...request, headers: {} }, noSession); assert.equal(noSession.statusCode, 403);
    let correct = false;
    globalThis.fetch = async url => url.includes('/api/token') ? json({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600 }) : json({ id: correct ? OWNER : 'wrong-owner' });
    const wrong = response(); await callback(request, wrong); assert.equal(wrong.statusCode, 403);
    correct = true; const ok = response(); await callback(request, ok); assert.equal(ok.statusCode, 200); assert.match(ok.body, /Owner account verified/); assert.equal(ok.body.includes('private-refresh'), false); assert.equal(ok.body.includes('private-access'), false);
  } finally { globalThis.fetch = fetchBefore; for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); }
});
test('token response rejects malformed expiration', async () => {
  await assert.rejects(tokenRequest(env, {}, async () => json({ access_token: 'x', expires_in: 'bad' })));
});
test('diagnostics distinguish scope, forbidden, unsupported and missing credentials without secrets', async () => {
  const events = [];
  const log = e => events.push(e);
  await createSpotifyService({}, undefined, undefined, log).read();
  assert.ok(events.some(e => e.event === 'missing_credentials'));
  const f = fixture();
  const service = createSpotifyService(env, async (url, options) => {
    if (url.includes('/api/token')) return json({ access_token: 'test-access', expires_in: 3600, scope: 'user-read-currently-playing' });
    if (url.includes('recently-played')) return json({ error: { message: 'Insufficient client scope' } }, 403);
    if (url.includes('/me/top/tracks')) return json({}, 404);
    if (url.includes('/me/top/artists')) return json({}, 403);
    return f.fetcher(url, options);
  }, undefined, log);
  await service.read();
  for (const event of ['missing_scopes','unsupported_endpoint','forbidden']) assert.ok(events.some(e => e.event === event));
  assert.ok(!JSON.stringify(events).includes('test-access'));
  assert.ok(!JSON.stringify(events).includes('test-secret'));
  assert.ok(!JSON.stringify(events).includes('test-refresh'));
});

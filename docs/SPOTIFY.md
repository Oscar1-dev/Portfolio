# Spotify integration — owner setup and operations

## What changed

The existing MusicTaste component now contains only the three supplied playlists, the new owner profile, live listening, eight recent tracks, and up to six top tracks/artists (Spotify's short_term range). No listening fixtures or credentials are shipped to visitors. Spotify's official players provide playback; this integration does not stream protected tracks or control the owner's devices.

Astro stays static. Vercel discovers the three Node functions in api/spotify/. server/spotify.mjs is server-only. The Astro development integration runs the same handlers locally. GitHub Pages and plain static preview cannot execute those functions: playlists continue to work, with an unavailable message for live listening. No adapter or new dependency was added.

## Credentials and setup

The client secret shared in chat must be rotated in Spotify Dashboard > your app > Settings > Basic Information > client secret controls. Do not reuse it. No supplied credential has been written into this checkout.

1. Copy .env.example to .env.local (already ignored). Fill SPOTIFY_CLIENT_ID, the rotated SPOTIFY_CLIENT_SECRET and SPOTIFY_REDIRECT_URI. Leave SPOTIFY_REFRESH_TOKEN blank initially.
2. Generate a temporary password with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it as SPOTIFY_SETUP_SECRET in .env.local. Keep this local password private.
3. For local authorization, register `http://127.0.0.1:4322/api/spotify/callback/` in Spotify's Redirect URIs and set SPOTIFY_REDIRECT_URI to exactly that URI. Spotify allows loopback IP HTTP redirects, not localhost. Start `npm run dev -- --background --port 4322`, then open `http://127.0.0.1:4322/api/spotify/authorize/`. Use the temporary setup password. Sign into the owner account `3135pu6uanknbgqv6i6zdgzssci4` and grant the requested read permissions.
4. Alternatively, after you approve a deployment, configure Vercel > Project > Settings > Environment Variables with the same client ID, rotated secret, temporary setup password, and the production redirect URI `https://nopsfrgithub.vercel.app/api/spotify/callback`. Register that exact URI in Spotify, then open `https://nopsfrgithub.vercel.app/api/spotify/authorize`. Redeploy after environment changes. Nothing has been deployed by this task.
5. The callback verifies signed ten-minute state plus an HttpOnly, SameSite cookie, then checks /me against the owner ID. Wrong accounts, missing state, cancelled consent and disabled setup fail closed. It NEVER changes the saved owner's authorization. The page returns only an AES-GCM-encrypted handoff, not a plaintext refresh/access token.
6. Run `node --env-file=.env.local scripts/spotify-import-token.mjs` locally and paste the encrypted handoff at its prompt. It decrypts using SPOTIFY_SETUP_SECRET and writes SPOTIFY_REFRESH_TOKEN only to ignored .env.local. It does not print the token. On Windows, keep the file restricted to your Windows account; POSIX mode flags do not change Windows ACLs.
7. Copy the refresh token directly from .env.local into Vercel's server-only SPOTIFY_REFRESH_TOKEN setting. Set the production SPOTIFY_REDIRECT_URI as above. Remove SPOTIFY_SETUP_SECRET from Vercel and locally and redeploy/restart; both setup routes then return 404. Never prefix secrets with PUBLIC_. Never paste the token into chat or commit .env.local.

Production OAuth must be tested after an approved deployment; it cannot round-trip to a callback URL that has not been deployed. Local setup lets you test before publishing. The refresh grant is not tied to a browser session and can be reused by the server after setup.

## Data, privacy and limits

The public endpoint intentionally publishes the owner's listening data after authorization. It returns a small allowlisted JSON view, never credentials, device identifiers or private playlist contents. Only the four requested read scopes are used; playlist-read-private is unnecessary for official embeds.

Access tokens are refreshed server-side, coalescing simultaneous requests and retrying an API 401 once. Metadata is cached in process (current 30s, recent 60s, top items 15m); the public response has a 30s Vercel CDN cache. Cold serverless instances do not share process caches. 429 responses honor Retry-After, stop upstream calls and back off the client. Optional permission failures produce partial/empty sections. The browser polls every 45s while visible and stops on navigation; progress is estimated between snapshots and stops at track duration. Errors clear live status rather than invent activity.

If Spotify returns a replacement refresh token, the warm process uses it. There is no durable secret store in this static project: if the original grant is retired or expires, repeat owner setup and update the environment variable. Automatic durable rotation would require a private database/secret-store integration. Do not assume tokens last forever; your dashboard currently specifies a refresh-token lifetime. Reauthorize when required.

Development-mode apps require the owner to have Premium and allow up to five allowlisted authenticated Spotify users. Add the owner account in the dashboard's User Management if necessary. Rate/quota limits and endpoint availability can change. Recently played is a limited snapshot, not a lifetime history; private sessions, episodes, local tracks, missing scope, unsupported items, or no recent plays can leave sections empty. Top items use Spotify's approximately four-week range. Official embeds can offer previews or require Spotify login; no full playback guarantee is made.

Artwork is loaded from Spotify's CDN, not cropped or overlaid; titles/artists and artwork attribution remain separate, with links back to Spotify. Music artwork has no scroll animation. The existing portfolio background and approved interactions were not changed in this task.

## Verification

- `node --test tests/spotify.test.mjs` — isolated fixtures for OAuth state/session expiry, setup password, owner mismatch, encrypted callback, refresh, 401 retry, cached live data, offline/empty state, malformed payloads, unsupported features and 429 backoff. These are test fixtures only, never production activity.
- `npm run astro -- check` and `npm run build`.
- Browser checks: three official iframe URLs/titles, profile URL, disconnected/error/live/recent states, mobile layout, contrast and keyboard names.
- Real token exchange, real listening data, Premium/allowlist status and final production callback remain unverified until owner credentials/consent are configured.

Sources checked during implementation:
- https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
- https://developer.spotify.com/documentation/web-api/concepts/quota-modes
- https://developer.spotify.com/documentation/web-api/references/changes/february-2026
- https://developer.spotify.com/documentation/design
- https://vercel.com/docs/functions/runtimes/node-js

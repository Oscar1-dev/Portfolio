# Portfolio additions and current setup blockers

## Spotify diagnosis

Verified in this checkout on 2026-11-12:
- There is only .env.example, not a configured .env.local.
- SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN, SPOTIFY_REDIRECT_URI and SPOTIFY_SETUP_SECRET are absent from the local runtime.
- Local /api/spotify/data/ returns {"status":"not_configured","retryAfter":60}.
- https://portfolio-five-eta-38.vercel.app/api/spotify/data/ returns HTTP 404. The production route is not available there yet; this is separate from missing local credentials.
- No valid owner grant or granted scopes can be verified without a refresh token. No credential was invented, stored or logged.
- Vercel team access was denied with 403; production variable presence has NOT been inspected. Premium status is user-confirmed, not independently queried.

Run `node scripts/spotify-diagnose.mjs` to see configuration presence, sanitized service events and endpoint availability. Never paste credentials into chat. Diagnostic logs contain event codes, fixed endpoint names, HTTP statuses, missing variable names and known scope names only. Spotify 403 without an explicit scope error is logged as forbidden; it is not incorrectly assumed to mean missing scope. 404 is reported as unsupported_endpoint (or unavailable resource), 429 as rate_limited; inactive playback is separate from authorization errors.

### Exact Vercel setup after review

1. Vercel > nopsfrs-projects > the portfolio project > Settings > Environment Variables.
2. Add server-only SPOTIFY_CLIENT_ID, a ROTATED SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI = https://portfolio-five-eta-38.vercel.app/api/spotify/callback, and a random 32+-character SPOTIFY_SETUP_SECRET. Choose Production (and Preview only if deliberately testing there). None use a PUBLIC_ prefix.
3. In Spotify Dashboard > the app > Settings > Redirect URIs, register that exact production callback. In User Management, ensure the owner account is allowed. The scope list remains user-read-currently-playing, user-read-playback-state, user-read-recently-played, user-top-read. These endpoints remain documented for development mode; restrictions and missing scopes are handled explicitly.
4. A reviewed deployment of the API files is needed before the production authorize/callback URLs work. This task does NOT deploy or push. For authorization before deployment use the loopback setup documented in SPOTIFY.md.
5. Visit /api/spotify/authorize on the deployed production domain, enter the temporary setup password and authorize the correct Spotify owner. The callback checks the owner profile and signed state/session, and returns an encrypted handoff only.
6. Import that handoff locally as described in SPOTIFY.md, add the resulting SPOTIFY_REFRESH_TOKEN to Vercel's server-only environment, REMOVE SPOTIFY_SETUP_SECRET and redeploy when approved. Environment changes require a new deployment. Setup returns 404 after disabling it. Do not use the previously exposed client secret.

Do not assume the four scopes are granted until this real authorization succeeds. The setup callback does not silently replace the owner's grant. Full refresh-token rotation across serverless cold starts would require durable private storage; current warm instances retain replacement tokens and expired/retired grants require reauthorization, as documented in SPOTIFY.md.

## TikTok gallery

The existing 33 local entries, file references, dimensions, column positions and numbers 01–33 are unchanged. New remote posts are a separate append-only collection numbered 34–50 after them. Edit src/data/tiktok-clips.ts to add `{ url, title, description? }`. URL normalization accepts full https://www.tiktok.com/@creator/video/ID, /photo/ID and official /player/v1/ID URLs, with optional share query strings. Shortened URLs are rejected rather than followed through unofficial extractors. No video was downloaded or scraped.

Local controls retain their original behavior. TikTok uses its official iframe, loaded only by a visitor click with autoplay=0. The documented mute message runs on player readiness; custom Play/Pause and Mute/Unmute enable only after a genuine ready event. Native TikTok controls handle seeking, volume and slideshow navigation. No custom volume slider is offered: TikTok documents volume events but not a set-volume command. Photo posts use the same player with native image navigation and soundtrack controls.

Message handling checks BOTH the exact TikTok origin and the iframe window. A local play pauses remote players; a remote playing event pauses local players and other ready TikTok players. Offscreen/hidden-page remote players are paused where the API responds. Browser policies or a broken external player can limit cross-player control. No external post can be guaranteed playable in every region/browser.

The user's server-error screenshot was reproduced: iframe HTTP 200 followed by onPlayerError {errorCode:2001,errorType:SERVER_ERROR}. This is TikTok's upstream error, not a successful video response. The failed iframe is now hidden, and an explanatory status/retry plus the original TikTok link remain. A fallback does not bypass TikTok restrictions. Some entries may be unavailable, removed, region-limited or temporarily blocked.

Source: https://developers.tiktok.com/docs/en/embed-player

## Daily Quotes

New /quotes/ tab follows Cybersecurity. API Ninjas' /v2/quoteoftheday returns the same quote all day and replaces it daily, so no database or random-per-visitor selection is needed. The source controls the daily schedule; no unverified London-midnight promise is made. API data is server-side, validated, cached for at most five minutes, and the page checks again every five minutes and on returning to the tab. Failed responses clear the displayed quote instead of retaining yesterday's. CDN cache expires at the next UTC day boundary at the latest.

Add server-only API_NINJAS_KEY under the same Vercel Environment Variables screen. No API Ninjas key was supplied; actual quote retrieval remains blocked until that key and the function deployment are configured. Quota/plan permissions are determined by API Ninjas. Missing-key and error states are explicit; no sample quote is presented as today's quote.

Source: https://api-ninjas.com/api/quotes#v2-quoteoftheday

## Public API directory

New /apis/ tab contains all 837 entries from the linked upstream JSON snapshot retrieved 2026-11-12. It is the full named catalogue, not a claim to list every API on the internet. Search, category and authentication filters, and progressive 50-row display are provided. Without JavaScript all entries are readable. No provider API is called just by browsing the directory.

Source attribution is visible on the page and upstream MIT license retained in public-api-lists-LICENSE.md. Run `node scripts/refresh-api-directory.mjs` to explicitly refresh the snapshot and license. Builds use the local snapshot and do not depend on the catalogue server being online.

Sources: https://github.com/public-api-lists/public-api-lists and https://public-api-lists.github.io/public-api-lists/api/all.json

## Tests

- `node --test tests/spotify.test.mjs tests/additions.test.mjs`
- `node tests/additions.browser.mjs` (existing dev URL localhost:4322/Portfolio/)
- `npm run astro -- check`
- `npm run build`

Browser checks cover 320px and 1440px reflow, new-page accessibility, search and all 33 original videos decoding with real local files. OAuth and API error tests use labelled fixtures only; they do not establish real owner authorization. TikTok's actual upstream failure is reported rather than counted as working playback.

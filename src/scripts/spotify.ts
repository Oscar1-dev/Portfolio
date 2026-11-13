type Track = { title: string; artists: string; album: string; image: string | null; url: string; duration: number; playedAt?: string; progress?: number; observedAt?: number };
type Artist = { name: string; image: string | null; url: string };
let cleanup: (() => void) | undefined;
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
const safeLink = (url: unknown) => typeof url === 'string' && /^https:\/\/open\.spotify\.com\/(track|artist)\/[A-Za-z0-9]+$/.test(url);
function row(item: Track | Artist) {
  const el = node('li'); el.className = 'music-row';
  if (item.image && /^https:\/\/[^/]+\.(scdn\.co|spotifycdn\.com)\//.test(item.image)) {
    const img = node('img'); img.src = item.image; img.alt = ''; img.width = 64; img.height = 64; img.loading = 'lazy'; img.className = 'music-art'; el.append(img);
  }
  const detail = node('div'); detail.className = 'music-detail';
  const link = node('a', 'title' in item ? item.title : item.name); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `${link.textContent} on Spotify (opens in a new tab)`); detail.append(link);
  if ('artists' in item) { detail.append(node('p', item.artists)); if (item.album) detail.append(node('p', item.album)); }
  if ('playedAt' in item && item.playedAt) { const time = node('time', new Date(item.playedAt).toLocaleString()); time.dateTime = item.playedAt; detail.append(time); }
  el.append(detail); return el;
}
export function mountSpotify() {
  cleanup?.();
  const root = document.querySelector<HTMLElement>('[data-spotify]'); if (!root) return;
  const status = root.querySelector<HTMLElement>('[data-listening-status]')!;
  const panel = root.querySelector<HTMLElement>('[data-listening]')!;
  const current = root.querySelector<HTMLElement>('[data-current]')!;
  const recent = root.querySelector<HTMLOListElement>('[data-recent]')!;
  const tracks = root.querySelector<HTMLOListElement>('[data-top-tracks]')!;
  const artists = root.querySelector<HTMLUListElement>('[data-top-artists]')!;
  const recentEmpty = root.querySelector<HTMLElement>('[data-recent-empty]')!;
  const topEmpty = root.querySelector<HTMLElement>('[data-top-empty]')!;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = true;
  let inFlight = false;
  let progressState: { el: HTMLProgressElement; start: number; observed: number; duration: number } | null = null;
  let progressTimer: ReturnType<typeof setInterval> | undefined;
  const cleanTrack = (x: Track) => x && typeof x.title === 'string' && typeof x.artists === 'string' && safeLink(x.url) && Number.isFinite(x.duration);
  root.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
    frame.addEventListener('load', () => { const message = frame.parentElement?.querySelector<HTMLElement>('[data-embed-status]'); if (message) message.hidden = true; }, { signal: controller.signal });
    frame.addEventListener('error', () => { const message = frame.parentElement?.querySelector<HTMLElement>('[data-embed-status]'); if (message) message.textContent = 'Player unavailable. Use the Spotify link below.'; }, { signal: controller.signal });
  });
  async function update() {
    if (!active || document.hidden || inFlight) return;
    inFlight = true; let delay = 45000;
    try {
      const response = await fetch('/api/spotify/data/', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const data = await response.json();
      if (!active) return;
      if (data.retryAfter) delay = Math.max(60000, Math.min(3600000, Number(data.retryAfter) * 1000 || 120000));
      const supported = ['playing', 'recent', 'idle'].includes(data.status);
      if (!supported) {
        delay = Math.max(60000, Math.min(3600000, (Number(data.retryAfter) || 120) * 1000));
        status.textContent = data.status === 'not_configured' || data.status === 'authorization_required' ? 'Live listening is not connected yet. My playlists are available below.' : 'Spotify is temporarily unavailable. My playlists are available below.';
        current.replaceChildren(); recent.replaceChildren(); tracks.replaceChildren(); artists.replaceChildren(); progressState = null;
        recentEmpty.textContent = topEmpty.textContent = 'Listening data is unavailable right now.'; return;
      }
      const history: Track[] = Array.isArray(data.recent) ? data.recent.filter((x: Track) => cleanTrack(x) && x.playedAt && Number.isFinite(Date.parse(x.playedAt))) : [];
      const now: Track | undefined = data.status === 'playing' && cleanTrack(data.current) ? data.current : history[0];
      const isPlaying = data.status === 'playing' && now === data.current;
      status.textContent = isPlaying ? 'Listening now · Spotify' : now ? 'Most recently played · not currently listening' : 'Nothing is playing right now.';
      current.replaceChildren(); progressState = null;
      if (now) {
        const list = node('ul'); list.className = 'music-items'; list.append(row(now)); current.append(list);
        if (isPlaying) {
          const progress = node('progress'); progress.max = now.duration; progress.value = Math.max(0, now.progress || 0); progress.setAttribute('aria-label', 'Track playback progress'); current.append(progress);
          progressState = { el: progress, start: now.progress || 0, observed: now.observedAt || Date.now(), duration: now.duration };
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) progress.value = Math.min(now.duration, (now.progress || 0) + Math.max(0, Date.now() - (now.observedAt || Date.now())));
        }
      }
      recent.replaceChildren(...history.map(row)); recentEmpty.textContent = history.length ? '' : 'No recent listening is available for this account.';
      const topTracks: Track[] = Array.isArray(data.topTracks) ? data.topTracks.filter(cleanTrack) : [];
      const topArtists: Artist[] = Array.isArray(data.topArtists) ? data.topArtists.filter((x: Artist) => x && typeof x.name === 'string' && safeLink(x.url)) : [];
      tracks.replaceChildren(...topTracks.map(row)); artists.replaceChildren(...topArtists.map(row));
      topEmpty.textContent = topTracks.length || topArtists.length ? '' : 'Top items are not available for this account or permission set.';
    } catch { if (active) { status.textContent = 'Spotify is temporarily unavailable. My playlists are available below.'; current.replaceChildren(); recent.replaceChildren(); tracks.replaceChildren(); artists.replaceChildren(); progressState = null; recentEmpty.textContent = topEmpty.textContent = 'Listening data is unavailable right now.'; delay = 120000; } }
    finally { inFlight = false; if (active) { panel.setAttribute('aria-busy', 'false'); timer = setTimeout(update, delay); } }
  }
  const visibility = () => { if (timer) clearTimeout(timer); if (!document.hidden) void update(); };
  document.addEventListener('visibilitychange', visibility);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) progressTimer = setInterval(() => { if (progressState && !document.hidden) progressState.el.value = Math.min(progressState.duration, progressState.start + Math.max(0, Date.now() - progressState.observed)); }, 1000);
  cleanup = () => { active = false; controller.abort(); if (timer) clearTimeout(timer); if (progressTimer) clearInterval(progressTimer); document.removeEventListener('visibilitychange', visibility); };
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  void update();
}

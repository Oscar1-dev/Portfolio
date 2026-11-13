export default function spotifyDev() {
  return { name: 'spotify-local-api', hooks: { 'astro:server:setup': async ({ server }) => {
    const { loadEnv } = await import('vite');
    const env = loadEnv('development', process.cwd(), ['SPOTIFY_', 'API_NINJAS_']);
    for (const [key, value] of Object.entries(env)) if (!process.env[key]) process.env[key] = value;
    const routes = {
      '/api/daily-quote': (await import('../api/daily-quote.mjs')).default,
      '/api/spotify/data': (await import('../api/spotify/data.mjs')).default,
      '/api/spotify/authorize': (await import('../api/spotify/authorize.mjs')).default,
      '/api/spotify/callback': (await import('../api/spotify/callback.mjs')).default,
    };
    server.middlewares.use((req, res, next) => {
      const handler = routes[(req.url || '').split('?')[0].replace(/\/$/, '')];
      if (!handler) return next();
      Promise.resolve(handler(req, res)).catch(() => { res.statusCode = 500; res.end('Spotify unavailable'); });
    });
  } } };
}

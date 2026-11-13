// Prints configuration PRESENCE and sanitized endpoint status, never credentials.
import { loadEnv } from 'vite';
const loaded = loadEnv('development', process.cwd(), 'SPOTIFY_');
for (const [key, value] of Object.entries(loaded)) if (!process.env[key]) process.env[key] = value;
for (const key of ['SPOTIFY_CLIENT_ID','SPOTIFY_CLIENT_SECRET','SPOTIFY_REFRESH_TOKEN','SPOTIFY_REDIRECT_URI','SPOTIFY_SETUP_SECRET']) console.log(`${key}: ${process.env[key] ? 'configured' : 'missing'}`);
const expected = 'https://nopsfrgithub.vercel.app/api/spotify/callback';
console.log(`Production redirect matches requested callback: ${process.env.SPOTIFY_REDIRECT_URI === expected}`);
const { createSpotifyService } = await import('../server/spotify.mjs');
const result = await createSpotifyService().read();
console.log(JSON.stringify({ status: result.status, availability: result.availability, retryAfter: result.retryAfter }));

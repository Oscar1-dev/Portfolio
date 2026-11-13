// Stable daily selection is made by API Ninjas, shared across visitors/instances.
export function createDailyQuote(env = process.env, fetcher = fetch, now = Date.now) {
  let cache, pending;
  return async function read() {
    const date = new Date(now()).toISOString().slice(0, 10);
    if (!env.API_NINJAS_KEY) return { status: 'not_configured', date };
    if (cache && cache.date === date && cache.until > now()) return cache.value;
    if (!pending) pending = (async () => {
      try {
        const response = await fetcher('https://api.api-ninjas.com/v2/quoteoftheday', { headers: { 'X-Api-Key': env.API_NINJAS_KEY }, signal: AbortSignal.timeout(8000) });
        if (!response.ok) return { status: response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'authorization_required' : 'unavailable', date };
        const result = await response.json(); const quote = Array.isArray(result) ? result[0] : result;
        if (typeof quote?.quote !== 'string' || !quote.quote.trim() || quote.quote.length > 10000 || typeof quote.author !== 'string') return { status: 'unavailable', date };
        return { status: 'ok', date, quote: quote.quote, author: quote.author.slice(0, 500), work: typeof quote.work === 'string' ? quote.work.slice(0, 500) : '' };
      } catch { return { status: 'unavailable', date }; }
    })().then(value => { cache = { date, until: now() + 300000, value }; return value; }).finally(() => { pending = null; });
    return pending;
  };
}

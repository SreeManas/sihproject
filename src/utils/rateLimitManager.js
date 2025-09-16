// src/utils/rateLimitManager.js
// Minimal rate limiter with per-endpoint throttling, retries, and simple in-memory caching.
// Endpoints supported: 'huggingface', 'twitter', 'youtube', 'facebook', 'rss'

const DEFAULTS = {
  requestsPerMinute: {
    huggingface: 30,
    twitter: 300, // client-side throttle only
    youtube: 100,
    facebook: 100,
    rss: 60,
  },
  maxRetries: 2,
  retryDelayMs: 800,
  cacheTtlMs: 30_000,
};

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

class RateLimitManager {
  constructor() {
    this.queues = new Map(); // endpoint -> { lastWindowStart, tokens, rpm }
    this.cache = new Map(); // key -> { ts, data }
  }

  configure(config = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  getBucket(endpoint) {
    const rpm = this.config?.requestsPerMinute?.[endpoint] ?? DEFAULTS.requestsPerMinute[endpoint] ?? 60;
    const now = Date.now();
    if (!this.queues.has(endpoint)) {
      this.queues.set(endpoint, { lastWindowStart: now, tokens: rpm, rpm });
    }
    const bucket = this.queues.get(endpoint);
    if (now - bucket.lastWindowStart >= 60_000) {
      bucket.tokens = bucket.rpm;
      bucket.lastWindowStart = now;
    }
    return bucket;
  }

  async takeToken(endpoint) {
    const bucket = this.getBucket(endpoint);
    while (bucket.tokens <= 0) {
      const wait = 60_000 - (Date.now() - bucket.lastWindowStart) + 50;
      await sleep(Math.max(wait, 100));
      this.getBucket(endpoint);
    }
    bucket.tokens -= 1;
  }

  cacheKey(endpoint, request) {
    return JSON.stringify({ endpoint, request });
  }

  getCached(endpoint, request) {
    const key = this.cacheKey(endpoint, request);
    const hit = this.cache.get(key);
    if (!hit) return null;
    const ttl = this.config?.cacheTtlMs ?? DEFAULTS.cacheTtlMs;
    if (Date.now() - hit.ts > ttl) {
      this.cache.delete(key);
      return null;
    }
    return hit.data;
  }

  setCache(endpoint, request, data) {
    const key = this.cacheKey(endpoint, request);
    this.cache.set(key, { ts: Date.now(), data });
  }

  async enqueue(endpoint, request) {
    const cached = this.getCached(endpoint, request);
    if (cached) return cached;

    await this.takeToken(endpoint);

    const maxRetries = this.config?.maxRetries ?? DEFAULTS.maxRetries;
    const retryDelayMs = this.config?.retryDelayMs ?? DEFAULTS.retryDelayMs;
    let attempt = 0;
    while (true) {
      try {
        const res = await this.dispatch(endpoint, request);
        this.setCache(endpoint, request, res);
        return res;
      } catch (err) {
        if (attempt >= maxRetries) throw err;
        attempt += 1;
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  async dispatch(endpoint, request) {
    switch (endpoint) {
      case 'huggingface':
        return this.callHuggingFace(request);
      case 'twitter':
        return this.callTwitter(request);
      case 'youtube':
        return this.callYouTube(request);
      case 'facebook':
        return this.callFacebook(request);
      case 'rss':
        return this.callRSS(request);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  // ---- Endpoint Callers ----
  async callHuggingFace({ model, payload }) {
    const token = import.meta.env.VITE_HF_API_KEY || import.meta.env.REACT_APP_HF_API_KEY || '';
    const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`HF ${resp.status}`);
    return resp.json();
  }

  async callTwitter({ endpoint, headers = {} }) {
    const token = import.meta.env.VITE_TWITTER_BEARER_TOKEN || import.meta.env.REACT_APP_TWITTER_BEARER_TOKEN || '';
    const url = `https://api.twitter.com/2/${endpoint}`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...headers,
      }
    });
    if (!resp.ok) throw new Error(`Twitter ${resp.status}`);
    return resp.json();
  }

  async callYouTube({ endpoint }) {
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`YouTube ${resp.status}`);
    return resp.json();
  }

  async callFacebook({ endpoint }) {
    const url = `https://graph.facebook.com/v18.0/${endpoint}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Facebook ${resp.status}`);
    return resp.json();
  }

  async callRSS({ url }) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`RSS ${resp.status}`);
    return resp.json();
  }
}

const rateLimitManager = new RateLimitManager();
rateLimitManager.configure();
export default rateLimitManager;
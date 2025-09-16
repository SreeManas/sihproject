// src/services/socialMapService.js
// Lightweight social fetcher for map integration with mock fallback.
// Prefer server proxy for real APIs to avoid CORS and rate limit issues.
import { classifyHazard, extractEntities, analyzeSentiment, extractEngagementMetrics, calculatePriorityScore } from '../utils/enhancedHybridNLP.js'

const env = import.meta.env;
const USE_MOCK = (env.VITE_USE_MOCK_SOCIAL || env.REACT_APP_USE_MOCK_SOCIAL || 'true').toLowerCase() === 'true';

function extractKeywords(text) {
  const words = (text || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const stop = new Set(['this','that','with','from','they','been','have','will','would','could','there','their']);
  const counts = {};
  for (const w of words) { if (!stop.has(w)) counts[w] = (counts[w] || 0) + 1; }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
}
function mockPosts(n = 40) {
  const coastal = [
    { lat: 19.076, lon: 72.8777, place: "Mumbai" },
    { lat: 13.0827, lon: 80.2707, place: "Chennai" },
    { lat: 22.5726, lon: 88.3639, place: "Kolkata" },
    { lat: 8.5241, lon: 76.9366, place: "Kochi" },
    { lat: 17.3850, lon: 78.4867, place: "Hyderabad" },
    { lat: 15.2993, lon: 74.1240, place: "Goa" },
  ];
  const hazards = [
    "tsunami warning near coast",
    "flood reports rising in Chennai",
    "cyclone update near Andhra",
    "high waves detected in Goa",
    "heavy rains in Mumbai causing flooding",
    "storm surge alerts in Kolkata",
  ];

  return Array.from({ length: n }, (_, i) => {
    const loc = coastal[i % coastal.length];
    const text = hazards[i % hazards.length];
    return {
      id: `mock_${i}_${Date.now()}`,
      platform: ['twitter','youtube','facebook'][i % 3],
      author: ['userA','channelB','pageC'][i % 3],
      text,
      hazardLabel: 'Other',
      entities: [loc.place],
      sentiment: 'NEUTRAL',
      engagement: { likes: (i*3)%50, shares: (i*2)%20 },
      priorityScore: 0,
      timestamp: new Date(Date.now() - i*600000).toISOString(),
      lat: loc.lat + (Math.random() - 0.5) * 0.2, // jitter
      lon: loc.lon + (Math.random() - 0.5) * 0.2,
      keywords: extractKeywords(text),
    };
  });
}

async function processPosts(posts = []) {
  const out = []
  for (const p of posts) {
    try {
      const cls = await classifyHazard(p.text || '')
      const ents = extractEntities(p.text || '')
      const sent = analyzeSentiment(p.text || '')
      const eng = extractEngagementMetrics(p)
      const priorityScore = calculatePriorityScore(cls, ents, eng)
      out.push({
        ...p,
        hazardLabel: cls.label,
        confidence: cls.confidence,
        entities: ents,
        sentiment: sent,
        engagement: eng,
        priorityScore,
        processedAt: new Date().toISOString(),
      })
    } catch (e) {
      out.push(p)
    }
  }
  return out
}

export async function fetchSocialForMap({ location = 'India', maxResults = 70 } = {}) {
  if (USE_MOCK) {
    const base = mockPosts(Math.min(90, maxResults))
    return await processPosts(base)
  }

  // If a proxy is configured, you can fetch real data here.
  const PROXY = env.VITE_PROXY_URL || env.REACT_APP_PROXY_URL;
  if (PROXY) {
    try {
      const url = `${PROXY}/api/proxy/twitter/search?q=${encodeURIComponent(location)}&max=${Math.min(100, maxResults)}`;
      const resp = await fetch(url);
      const json = await resp.json();
      const users = new Map();
      (json.includes?.users || []).forEach((u) => users.set(u.id, u));
      const places = new Map();
      (json.includes?.places || []).forEach((p) => places.set(p.id, p));

      const normalized = (json.data || []).map((t) => {
        const u = users.get(t.author_id);
        const place = t.geo?.place_id ? places.get(t.geo.place_id) : null;
        let lat, lon;
        if (place?.geo?.bbox && place.geo.bbox.length === 4) {
          const [minLon, minLat, maxLon, maxLat] = place.geo.bbox;
          lon = (minLon + maxLon) / 2; lat = (minLat + maxLat) / 2;
        }
        return {
          id: t.id,
          platform: 'twitter',
          author: u?.username || 'unknown',
          text: t.text,
          hazardLabel: 'Other',
          entities: [],
          sentiment: 'NEUTRAL',
          engagement: { likes: t.public_metrics?.like_count || 0, shares: t.public_metrics?.retweet_count || 0 },
          priorityScore: 0,
          timestamp: t.created_at,
          url: u?.username ? `https://twitter.com/${u.username}/status/${t.id}` : undefined,
          lat, lon,
          keywords: extractKeywords(t.text || ''),
        };
      });
      return await processPosts(normalized);
    } catch (e) {
      console.warn('Proxy fetch failed, falling back to mock', e);
      const base = mockPosts(Math.min(90, maxResults))
      return await processPosts(base)
    }
  }

  // No proxy and mock disabled => still return mock to keep demo running
  const base = mockPosts(Math.min(90, maxResults))
  return await processPosts(base)
}

export default { fetchSocialForMap };

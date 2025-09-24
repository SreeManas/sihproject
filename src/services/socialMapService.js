// src/services/socialMapService.js
// Lightweight social fetcher for map integration with real API support.
import { classifyHazard, extractEntities, analyzeSentiment, extractEngagementMetrics, calculatePriorityScore } from '../utils/enhancedHybridNLP.js'
import geocodingService from './geocodingService.js'
import { TwitterAPI } from './socialMediaAPI.js'

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
    // Using mock data for social posts
    const base = mockPosts(Math.min(90, maxResults))
    // Raw mock posts generated
    // First raw mock post available
    
    // Process posts with NLP (original functionality restored)
    try {
      const processed = await processPosts(base);
      // Posts processed
      // First processed post available
      return processed;
    } catch (processingError) {
      console.error('❌ Error processing posts with NLP:', processingError);
      // Fallback: return raw mock data with basic processing if NLP fails
      // Using fallback processing without NLP
      return base.map(post => ({
        ...post,
        hazardLabel: 'Other',
        confidence: 0.5,
        sentiment: 'NEUTRAL',
        priorityScore: Math.floor(Math.random() * 10) + 1, // Random priority 1-10
        processedAt: new Date().toISOString()
      }));
    }
  }

  // Try to fetch real Twitter data
  try {
    // Fetching real Twitter data for location
    const twitterAPI = new TwitterAPI();
    
    // Fetch hazard-related tweets
    const tweets = await twitterAPI.getHazardTweets(location, maxResults);
    // Real tweets fetched
    
    // Process tweets to add coordinates and geocoding
    const processedTweets = await Promise.all(tweets.map(async (tweet) => {
      let processedTweet = { ...tweet };
      
      // If tweet has direct coordinates, use them
      if (tweet.lat && tweet.lng) {
        processedTweet.lat = tweet.lat;
        processedTweet.lng = tweet.lng;
      }
      // If tweet has geocodedLocation but no coordinates, try to geocode
      else if (tweet.geocodedLocation && !tweet.lat && !tweet.lng) {
        try {
          const geocoded = await geocodingService.geocodePlace(tweet.geocodedLocation);
          processedTweet.lat = geocoded.lat;
          processedTweet.lng = geocoded.lng;
          processedTweet.geocodedAccuracy = geocoded.confidence;
        } catch (geocodeError) {
          // Geocoding failed for location
        }
      }
      // If tweet has location text but no coordinates, try to geocode
      else if (tweet.location && !tweet.lat && !tweet.lng) {
        try {
          const geocoded = await geocodingService.geocodePlace(tweet.location);
          processedTweet.lat = geocoded.lat;
          processedTweet.lng = geocoded.lng;
          processedTweet.geocodedAccuracy = geocoded.confidence;
        } catch (geocodeError) {
          // Geocoding failed for tweet location
        }
      }
      
      return processedTweet;
    }));
    
    // Filter out tweets without coordinates
    const tweetsWithCoordinates = processedTweets.filter(tweet => 
      tweet.lat && tweet.lng && geocodingService.validateCoordinates(tweet.lat, tweet.lng)
    );
    
    // Tweets with valid coordinates counted
    
    // Process with NLP
    const finalPosts = await processPosts(tweetsWithCoordinates);
    return finalPosts;
    
  } catch (error) {
    console.error('❌ Real Twitter API fetch failed:', error);
    // Falling back to mock data
    
    const base = mockPosts(Math.min(90, maxResults));
    return await processPosts(base);
  }
}

export default { fetchSocialForMap };

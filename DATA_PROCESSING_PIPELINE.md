# IndiaGuard Data Processing Pipeline
## Comprehensive Technical Documentation

### 🔄 Overview
The IndiaGuard Data Processing Pipeline is a sophisticated, multi-stage system designed to ingest, process, analyze, and visualize coastal hazard data from diverse sources in real-time. This pipeline combines social media monitoring, citizen reporting, and official data sources with advanced AI/NLP processing to provide comprehensive disaster intelligence.

---

## 📊 Pipeline Architecture

### High-Level Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Social Media  │    │  Citizen Reports│    │  Official Data  │
│   Sources       │    │  (Web/Mobile)   │    │  Sources        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Data Ingestion │    │  Data Ingestion │    │  Data Ingestion │
│   Layer         │    │   Layer         │    │   Layer         │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────┬───────────┴──────────┬───────────┘
                     │                      │
          ┌──────────▼─────────────────────▼──────────┐
          │           Rate Limit Manager              │
          │  (API Throttling & Request Management)   │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │        enhancedHybridNLP Engine           │
          │  (Multi-lingual AI Processing & Analysis) │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           Data Enrichment Layer           │
          │   (Entity Extraction, Scoring, Geocoding) │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           Real-time Processing            │
          │     (Stream Processing & Aggregation)     │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           Storage & Indexing              │
          │    (Firebase Firestore + Real-time Sync)  │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           Visualization Layer              │
          │     (Dashboard, Maps, Analytics, Alerts)  │
          └──────────────────────────────────────────┘
```

---

## 🚪 Stage 1: Data Ingestion Layer

### 1.1 Social Media Data Sources

#### Twitter API Integration
```javascript
// File: src/services/socialMediaAPI.js
class TwitterAPI {
  async searchTweets(query, options = {}) {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en OR lang:hi OR lang:te`,
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,lang,geo',
      'user.fields': 'username,name,location,verified',
      'expansions': 'author_id,geo.place_id',
      'place.fields': 'country,country_code,full_name,geo',
      'max_results': options.maxResults || 100
    });

    const response = await rateLimitManager.enqueue('twitter', {
      endpoint: `tweets/search/recent?${params}`,
      headers: { 'Authorization': `Bearer ${this.bearerToken}` }
    });

    return this.transformTwitterData(response);
  }
}
```

**Hazard Query Patterns:**
```javascript
const hazardQueries = [
  'tsunami OR "tidal wave" OR "sea surge"',
  'cyclone OR hurricane OR typhoon',
  'flood OR flooding OR "heavy rain"',
  'earthquake OR tremor OR seismic',
  'landslide OR "slope failure"',
  'storm OR "storm surge" OR "high waves"'
];
```

**Data Transformation:**
```javascript
transformTwitterData(response) {
  return response.data?.map(tweet => ({
    id: tweet.id,
    platform: 'twitter',
    author: tweet.author_id,
    text: tweet.text,
    timestamp: tweet.created_at,
    lang: tweet.lang,
    location: this.extractLocation(tweet),
    engagement: {
      likes: tweet.public_metrics?.like_count || 0,
      shares: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0
    },
    raw: tweet
  })) || [];
}
```

#### YouTube Integration
```javascript
// Video metadata and comment analysis
async searchHazardVideos(query, maxResults = 50) {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults.toString(),
    relevanceLanguage: 'en'
  });
  
  const response = await rateLimitManager.enqueue('youtube', {
    endpoint: `search?${searchParams}`
  });
  
  return this.transformYouTubeData(response);
}
```

#### RSS Feed Integration
```javascript
// News agency and official source monitoring
async fetchRSSFeeds(feedUrls) {
  const promises = feedUrls.map(url => 
    rateLimitManager.enqueue('rss', { url })
  );
  
  const results = await Promise.allSettled(promises);
  return results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
}
```

### 1.2 Citizen Report Ingestion

#### Web Form Processing
```javascript
// File: src/components/ReportForm.jsx
const handleSubmit = async (formData) => {
  const reportData = {
    hazardType: formData.hazardType,
    description: formData.description,
    location: {
      lat: formData.coordinates.lat,
      lon: formData.coordinates.lng,
      accuracy: formData.coordinates.accuracy
    },
    media: await processMediaFiles(formData.files),
    reporter: {
      userId: currentUser.uid,
      anonymous: formData.anonymous,
      timestamp: new Date().toISOString()
    },
    metadata: {
      deviceInfo: getDeviceInfo(),
      networkInfo: await getNetworkInfo(),
      browserInfo: getBrowserInfo()
    }
  };
  
  const processedReport = await enhancedHybridNLP.processReport(reportData);
  await submitReportToDatabase(processedReport);
};
```

#### Mobile App Integration (Planned)
```javascript
// Future mobile data ingestion
const mobileReportProcessor = {
  // Offline report queuing
  queueOfflineReports: (reports) => {
    return localStorage.setItem('offlineReports', JSON.stringify(reports));
  },
  
  // Sync when online
  syncOfflineReports: async () => {
    const offlineReports = JSON.parse(localStorage.getItem('offlineReports') || '[]');
    for (const report of offlineReports) {
      await submitReportToDatabase(report);
    }
    localStorage.removeItem('offlineReports');
  }
};
```

### 1.3 Official Data Sources

#### Government Agency APIs
```javascript
// IMD (India Meteorological Department)
async fetchIMDAlerts() {
  const response = await fetch('https://mausam.imd.gov.in/imd_latest/temperature.json');
  return this.transformIMDData(response);
}

// INCOIS (Indian National Centre for Ocean Information)
async fetchINCOISData() {
  const tsunamiAlerts = await fetch('https://incois.gov.in/tsunami/bulletins.json');
  const oceanState = await fetch('https://incois.gov.in/oceanstate/forecast.json');
  
  return {
    tsunamiAlerts: await tsunamiAlerts.json(),
    oceanState: await oceanState.json()
  };
}
```

---

## ⚡ Stage 2: Rate Limiting & Request Management

### 2.1 Rate Limit Manager Architecture

```javascript
// File: src/utils/rateLimitManager.js
class RateLimitManager {
  constructor() {
    this.queues = new Map(); // endpoint -> { lastWindowStart, tokens, rpm }
    this.cache = new Map(); // key -> { ts, data }
  }

  configure(config = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  // Token bucket algorithm implementation
  getBucket(endpoint) {
    const rpm = this.config?.requestsPerMinute?.[endpoint] ?? 60;
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
}
```

### 2.2 Rate Limit Configuration

```javascript
const DEFAULTS = {
  requestsPerMinute: {
    huggingface: 30,      // AI model inference
    twitter: 300,        // Twitter API v2
    youtube: 100,        // YouTube Data API
    facebook: 100,       // Graph API
    rss: 60,             // RSS feed fetching
  },
  maxRetries: 2,
  retryDelayMs: 800,
  cacheTtlMs: 30_000,    // 30 seconds cache
};
```

### 2.3 Request Processing Flow

```javascript
async enqueue(endpoint, request) {
  // Check cache first
  const cached = this.getCached(endpoint, request);
  if (cached) return cached;

  // Acquire rate limit token
  await this.takeToken(endpoint);

  // Retry logic with exponential backoff
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
```

---

## 🤖 Stage 3: enhancedHybridNLP Processing

### 3.1 Multi-lingual Language Detection

```javascript
// File: src/utils/enhancedHybridNLP.js
export function detectLanguage(text) {
  const langPatterns = {
    hi: /[ऀ-ॿ]/,           // Hindi Devanagari
    te: /[\u0C00-\u0C7F]/,  // Telugu script
    ta: /[\u0B80-\u0BFF]/,  // Tamil script
    ml: /[\u0D00-\u0D7F]/,  // Malayalam script
    kn: /[\u0C80-\u0CFF]/,  // Kannada script
    gu: /[\u0A80-\u0AFF]/,  // Gujarati script
    bn: /[\u0980-\u09FF]/,  // Bengali script
    pa: /[\u0A00-\u0A7F]/,  // Punjabi script
    or: /[\u0B00-\u0B7F]/   // Odia script
  };
  
  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) return lang;
  }
  return "en";
}
```

### 3.2 Hybrid Hazard Classification Pipeline

```javascript
export async function classifyHazard(text) {
  const lang = detectLanguage(text);
  const hazardLabels = [
    "Tsunami", "Cyclone", "Storm Surge", "High Waves", "Flood", 
    "Landslide", "Earthquake", "Coastal Erosion", "Other"
  ];
  
  try {
    // Multi-lingual processing path
    if (lang !== 'en' && MULTI_ENABLED) {
      return await processMultilingualText(text, hazardLabels);
    } 
    // English processing path
    else if (lang === "en") {
      return await processEnglishText(text, hazardLabels);
    } 
    // Fallback to keyword-based
    else {
      return keywordBasedClassification(text, hazardLabels);
    }
  } catch (error) {
    console.error("Classification error:", error);
    return keywordBasedClassification(text, hazardLabels);
  }
}

async function processMultilingualText(text, hazardLabels) {
  // Try XLM-RoBERTa first
  try {
    const ml = await classifyMultilingualTextXLMR(text);
    if (ml?.label && ml.confidence > 0.7) return ml;
  } catch {}
  
  // Try IndicBART for Indian languages
  try {
    const ml2 = await classifyIndicBARTStub(text);
    if (ml2?.label && ml2.confidence > 0.6) return ml2;
  } catch {}
  
  // Final fallback to keyword-based
  return keywordBasedClassification(text, hazardLabels);
}

async function processEnglishText(text, hazardLabels) {
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
    { 
      inputs: text, 
      parameters: { 
        candidate_labels: hazardLabels,
        multi_label: false
      } 
    },
    { 
      headers: { 
        Authorization: `Bearer ${import.meta.env.VITE_HF_API_KEY || ""}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    }
  );
  
  return {
    label: response.data.labels[0],
    confidence: response.data.scores[0],
    allScores: response.data.labels.map((label, idx) => ({
      label,
      score: response.data.scores[idx]
    }))
  };
}
```

### 3.3 Enhanced Named Entity Recognition

```javascript
export function extractEntities(text, nerResults = []) {
  const entities = [...nerResults];
  const textLower = text.toLowerCase();
  
  // Extract entities from Indian dictionary
  Object.keys(indianEntities).forEach((type) => {
    indianEntities[type].forEach((entity) => {
      const entityLower = entity.toLowerCase();
      if (textLower.includes(entityLower)) {
        // Check for duplicates
        if (!entities.some((e) => e.text.toLowerCase() === entityLower)) {
          entities.push({ 
            text: entity, 
            type,
            confidence: 0.8,
            startIndex: textLower.indexOf(entityLower)
          });
        }
      }
    });
  });
  
  // Extract numbers (coordinates, casualties, measurements)
  const numberRegex = /\b\d+(?:\.\d+)?\b/g;
  const numbers = [...text.matchAll(numberRegex)];
  numbers.forEach((match) => {
    if (!entities.some(e => e.text === match[0])) {
      entities.push({
        text: match[0],
        type: "NUMBER",
        confidence: 0.6,
        startIndex: match.index
      });
    }
  });
  
  // Extract coordinates (lat/lon patterns)
  const coordRegex = /\b(\d{1,3}\.\d+)[°\s]*[NS]?\s*,?\s*(\d{1,3}\.\d+)[°\s]*[EW]?\b/gi;
  const coords = [...text.matchAll(coordRegex)];
  coords.forEach((match) => {
    if (!entities.some(e => e.text === match[0])) {
      entities.push({
        text: match[0],
        type: "COORDINATE",
        confidence: 0.9,
        startIndex: match.index
      });
    }
  });
  
  return entities.sort((a, b) => a.startIndex - b.startIndex);
}
```

### 3.4 Priority Scoring Algorithm

```javascript
export function calculatePriorityScore(classificationResult, entities, engagement) {
  let score = 0;
  
  // 1. Hazard severity weight (0-10 points)
  const severityWeights = {
    "Tsunami": 10,
    "Earthquake": 9,
    "Cyclone": 8,
    "Flood": 7,
    "Storm Surge": 6,
    "Landslide": 5,
    "High Waves": 4,
    "Coastal Erosion": 3,
    "Other": 1
  };
  
  score += severityWeights[classificationResult.label] || 1;
  
  // 2. AI confidence weight (0-5 points)
  score += classificationResult.confidence * 5;
  
  // 3. Location specificity (0-6 points, 2 per location)
  const locationEntities = entities.filter(e => e.type === "LOC");
  score += locationEntities.length * 2;
  
  // 4. Engagement weight (logarithmic scale for viral content)
  const totalEngagement = engagement.likes + engagement.shares + engagement.comments;
  score += Math.log10(totalEngagement + 1);
  
  // 5. Time recency bonus (0-2 points)
  const postAge = (Date.now() - new Date(engagement.timestamp).getTime()) / (1000 * 60 * 60);
  if (postAge < 1) score += 2;      // Less than 1 hour old
  else if (postAge < 6) score += 1; // Less than 6 hours old
  
  // 6. Source credibility bonus (0-3 points)
  const sourceBonus = {
    'official': 3,
    'news': 2,
    'verified': 1,
    'citizen': 0
  };
  score += sourceBonus[engagement.sourceType] || 0;
  
  return Math.round(score * 10) / 10;
}
```

---

## 🔧 Stage 4: Data Enrichment Layer

### 4.1 Geocoding & Location Processing

```javascript
async function enrichLocationData(rawData) {
  const enrichedData = { ...rawData };
  
  // Extract location from text if not provided
  if (!rawData.location && rawData.text) {
    const locations = await extractLocationsFromText(rawData.text);
    if (locations.length > 0) {
      enrichedData.location = locations[0];
    }
  }
  
  // Reverse geocoding for coordinates
  if (rawData.coordinates && !rawData.placeName) {
    const placeName = await reverseGeocode(rawData.coordinates);
    enrichedData.placeName = placeName;
  }
  
  // Coastal proximity calculation
  if (rawData.coordinates) {
    enrichedData.isCoastal = await isCoastalLocation(rawData.coordinates);
    enrichedData.distanceToCoast = await calculateDistanceToCoast(rawData.coordinates);
  }
  
  return enrichedData;
}

async function extractLocationsFromText(text) {
  const entities = extractEntities(text);
  const locations = entities.filter(e => e.type === "LOC");
  
  // Geocode each location
  const geocodedLocations = await Promise.all(
    locations.map(async (loc) => {
      const coords = await geocodeLocation(loc.text);
      return {
        name: loc.text,
        coordinates: coords,
        confidence: loc.confidence
      };
    })
  );
  
  return geocodedLocations.filter(loc => loc.coordinates);
}
```

### 4.2 Temporal Analysis

```javascript
function enrichTemporalData(rawData) {
  const enriched = { ...rawData };
  const timestamp = new Date(rawData.timestamp);
  
  // Time-based categorization
  enriched.timeCategory = categorizeTime(timestamp);
  
  // Seasonal analysis
  enriched.season = getSeason(timestamp);
  
  // Day/night classification
  enriched.isDaytime = isDaytime(timestamp, rawData.coordinates);
  
  // Weekend/weekday
  enriched.isWeekend = isWeekend(timestamp);
  
  // Holiday detection
  enriched.isHoliday = isIndianHoliday(timestamp);
  
  return enriched;
}

function categorizeTime(timestamp) {
  const hour = timestamp.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
```

### 4.3 Source Credibility Assessment

```javascript
function assessSourceCredibility(rawData) {
  let credibilityScore = 0;
  let credibilityFactors = [];
  
  // Platform-based scoring
  const platformScores = {
    'twitter': 0.7,
    'youtube': 0.6,
    'facebook': 0.5,
    'rss': 0.8,
    'official': 0.95,
    'citizen': 0.3
  };
  
  credibilityScore += platformScores[rawData.platform] || 0.5;
  
  // Account verification bonus
  if (rawData.author?.verified) {
    credibilityScore += 0.2;
    credibilityFactors.push('verified_account');
  }
  
  // Follower count influence (with diminishing returns)
  if (rawData.author?.followers) {
    const followerBonus = Math.log10(rawData.author.followers + 1) * 0.1;
    credibilityScore += Math.min(followerBonus, 0.3);
    credibilityFactors.push('follower_influence');
  }
  
  // Historical accuracy (if available)
  if (rawData.author?.accuracyRate) {
    credibilityScore += rawData.author.accuracyRate * 0.2;
    credibilityFactors.push('historical_accuracy');
  }
  
  // Content length bonus (longer posts often more detailed)
  if (rawData.text?.length > 100) {
    credibilityScore += 0.1;
    credibilityFactors.push('detailed_content');
  }
  
  return {
    score: Math.min(credibilityScore, 1.0),
    factors: credibilityFactors,
    level: getCredibilityLevel(credibilityScore)
  };
}

function getCredibilityLevel(score) {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'low';
  return 'unverified';
}
```

---

## ⚡ Stage 5: Real-time Processing

### 5.1 Stream Processing Architecture

```javascript
// Real-time data stream processor
class StreamProcessor {
  constructor() {
    this.processors = new Map();
    this.aggregators = new Map();
    this.alertThresholds = new Map();
  }
  
  async processStream(dataStream) {
    for await (const data of dataStream) {
      // Parallel processing pipeline
      const [processed, aggregated, alerted] = await Promise.all([
        this.processData(data),
        this.updateAggregations(data),
        this.checkAlertConditions(data)
      ]);
      
      // Emit processed data to subscribers
      this.emit('processed', processed);
      this.emit('aggregated', aggregated);
      if (alerted) this.emit('alert', alerted);
    }
  }
  
  async processData(data) {
    // Apply NLP processing
    const nlpResult = await enhancedHybridNLP.process(data);
    
    // Enrich with additional data
    const enriched = await this.enrichData(nlpResult);
    
    // Calculate priority
    const priority = calculatePriorityScore(
      enriched.classification,
      enriched.entities,
      enriched.engagement
    );
    
    return {
      ...enriched,
      priority,
      processedAt: new Date().toISOString(),
      processingTime: Date.now() - data.receivedAt
    };
  }
  
  async updateAggregations(data) {
    const timeWindow = this.getTimeWindow();
    const key = `${data.hazardType}_${timeWindow}`;
    
    if (!this.aggregators.has(key)) {
      this.aggregators.set(key, {
        count: 0,
        locations: new Set(),
        prioritySum: 0,
        sources: new Set(),
        timeWindow,
        lastUpdate: Date.now()
      });
    }
    
    const agg = this.aggregators.get(key);
    agg.count += 1;
    agg.prioritySum += data.priority;
    agg.sources.add(data.source);
    
    if (data.location) {
      agg.locations.add(JSON.stringify(data.location));
    }
    
    agg.lastUpdate = Date.now();
    
    return {
      key,
      aggregation: {
        count: agg.count,
        uniqueLocations: agg.locations.size,
        averagePriority: agg.prioritySum / agg.count,
        sources: Array.from(agg.sources),
        timeWindow: agg.timeWindow
      }
    };
  }
}
```

### 5.2 Alert Generation Engine

```javascript
class AlertEngine {
  constructor() {
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
  }
  
  async evaluateAlertConditions(data) {
    const alerts = [];
    
    // Evaluate each alert rule
    for (const [ruleId, rule] of this.alertRules) {
      if (await this.matchesRule(data, rule)) {
        const alert = await this.createAlert(ruleId, rule, data);
        alerts.push(alert);
      }
    }
    
    return alerts;
  }
  
  async matchesRule(data, rule) {
    const conditions = rule.conditions;
    
    // Check hazard type
    if (conditions.hazardTypes && !conditions.hazardTypes.includes(data.hazardType)) {
      return false;
    }
    
    // Check priority threshold
    if (conditions.minPriority && data.priority < conditions.minPriority) {
      return false;
    }
    
    // Check geographic bounds
    if (conditions.boundingBox && data.location) {
      const { north, south, east, west } = conditions.boundingBox;
      const { lat, lon } = data.location;
      if (lat > north || lat < south || lon > east || lon < west) {
        return false;
      }
    }
    
    // Check temporal conditions
    if (conditions.timeWindow) {
      const now = Date.now();
      const dataTime = new Date(data.timestamp).getTime();
      if (now - dataTime > conditions.timeWindow) {
        return false;
      }
    }
    
    // Check aggregation thresholds
    if (conditions.aggregationThreshold) {
      const agg = await this.getAggregation(data.hazardType, conditions.timeWindow);
      if (agg.count < conditions.aggregationThreshold) {
        return false;
      }
    }
    
    return true;
  }
  
  async createAlert(ruleId, rule, data) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert = {
      id: alertId,
      ruleId,
      severity: rule.severity,
      title: rule.title,
      description: rule.description,
      triggerData: data,
      location: data.location,
      hazardType: data.hazardType,
      priority: data.priority,
      createdAt: new Date().toISOString(),
      status: 'active',
      acknowledged: false,
      resolved: false
    };
    
    // Store alert
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    
    // Send notifications
    await this.sendNotifications(alert);
    
    return alert;
  }
}
```

---

## 💾 Stage 6: Storage & Indexing

### 6.1 Firebase Firestore Schema

```javascript
// Collections Schema Design
const collections = {
  // Raw ingested data
  raw_data: {
    fields: {
      id: 'string',
      source: 'string',           // twitter, youtube, citizen, official
      platform: 'string',         // specific platform name
      rawContent: 'object',       // original API response
      receivedAt: 'timestamp',
      processed: 'boolean'
    }
  },
  
  // Processed and enriched data
  processed_data: {
    fields: {
      id: 'string',
      sourceId: 'string',         // reference to raw_data
      hazardType: 'string',
      classification: 'object',   // { label, confidence, allScores }
      entities: 'array',          // extracted entities
      sentiment: 'string',        // POSITIVE, NEGATIVE, NEUTRAL
      priority: 'number',         // calculated priority score
      location: 'object',         // { lat, lon, accuracy, placeName }
      engagement: 'object',       // { likes, shares, comments, reach }
      credibility: 'object',      // { score, factors, level }
      enrichedAt: 'timestamp',
      processingTime: 'number'    // milliseconds
    }
  },
  
  // Aggregated data for analytics
  aggregations: {
    fields: {
      id: 'string',
      timeWindow: 'string',       // 1h, 6h, 24h, 7d
      hazardType: 'string',
      geographicArea: 'string',   // state, region, country
      metrics: 'object',          // { count, avgPriority, locations, sources }
      sources: 'array',           // contributing source types
      lastUpdated: 'timestamp'
    }
  },
  
  // Real-time alerts
  alerts: {
    fields: {
      id: 'string',
      ruleId: 'string',
      severity: 'string',         // CRITICAL, HIGH, MEDIUM, LOW
      title: 'string',
      description: 'string',
      location: 'object',
      hazardType: 'string',
      priority: 'number',
      status: 'string',           // active, acknowledged, resolved
      createdAt: 'timestamp',
      acknowledgedAt: 'timestamp',
      resolvedAt: 'timestamp',
      acknowledgedBy: 'string',    // user ID
      resolvedBy: 'string',       // user ID
      triggerData: 'object'       // data that triggered the alert
    }
  },
  
  // User reports
  reports: {
    fields: {
      id: 'string',
      userId: 'string',
      hazardType: 'string',
      description: 'string',
      location: 'object',
      mediaUrls: 'array',         // uploaded photos/videos
      status: 'string',           // pending, reviewed, verified, rejected
      verifiedBy: 'string',       // official user ID
      verificationNotes: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp'
    }
  }
};
```

### 6.2 Real-time Data Synchronization

```javascript
// Real-time listeners setup
class RealtimeSync {
  constructor() {
    this.listeners = new Map();
    this.unsubscribeFunctions = new Map();
  }
  
  setupListeners() {
    // Processed data listener
    const processedUnsub = onSnapshot(
      query(collection(db, 'processed_data'), orderBy('enrichedAt', 'desc'), limit(100)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.emit('processed_data', data);
      }
    );
    this.unsubscribeFunctions.set('processed_data', processedUnsub);
    
    // Alerts listener
    const alertsUnsub = onSnapshot(
      query(collection(db, 'alerts'), where('status', '==', 'active')),
      (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.emit('alerts', alerts);
      }
    );
    this.unsubscribeFunctions.set('alerts', alertsUnsub);
    
    // Aggregations listener
    const aggregationsUnsub = onSnapshot(
      query(collection(db, 'aggregations'), orderBy('lastUpdated', 'desc')),
      (snapshot) => {
        const aggregations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.emit('aggregations', aggregations);
      }
    );
    this.unsubscribeFunctions.set('aggregations', aggregationsUnsub);
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  cleanup() {
    this.unsubscribeFunctions.forEach(unsub => unsub());
    this.unsubscribeFunctions.clear();
    this.listeners.clear();
  }
}
```

---

## 📊 Stage 7: Visualization & Analytics Layer

### 7.1 Dashboard Data Processing

```javascript
// Dashboard data aggregation and formatting
class DashboardProcessor {
  constructor() {
    this.cache = new Map();
    this.updateInterval = 30000; // 30 seconds
  }
  
  async getDashboardData(filters = {}) {
    const cacheKey = JSON.stringify(filters);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.updateInterval) {
        return cached.data;
      }
    }
    
    // Fetch fresh data
    const data = await this.fetchDashboardData(filters);
    
    // Update cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  async fetchDashboardData(filters) {
    const [
      processedData,
      alerts,
      aggregations,
      reports
    ] = await Promise.all([
      this.fetchProcessedData(filters),
      this.fetchAlerts(filters),
      this.fetchAggregations(filters),
      this.fetchReports(filters)
    ]);
    
    return {
      summary: this.generateSummary(processedData, alerts, reports),
      mapData: this.formatMapData(processedData, reports),
      charts: this.generateChartData(aggregations, processedData),
      alerts: this.formatAlerts(alerts),
      timeline: this.generateTimeline(processedData, alerts)
    };
  }
  
  generateSummary(processedData, alerts, reports) {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentProcessed = processedData.filter(d => 
      new Date(d.enrichedAt).getTime() > last24h
    );
    
    const activeAlerts = alerts.filter(a => a.status === 'active');
    const pendingReports = reports.filter(r => r.status === 'pending');
    
    return {
      totalReports24h: recentProcessed.length,
      activeAlerts: activeAlerts.length,
      pendingReports: pendingReports.length,
      highPriorityIncidents: recentProcessed.filter(d => d.priority >= 8).length,
      averagePriority: recentProcessed.reduce((sum, d) => sum + d.priority, 0) / recentProcessed.length || 0,
      topHazardTypes: this.getTopHazardTypes(recentProcessed),
      geographicSpread: this.getGeographicSpread(recentProcessed)
    };
  }
  
  formatMapData(processedData, reports) {
    const mapPoints = [];
    
    // Add processed data points
    processedData.forEach(data => {
      if (data.location) {
        mapPoints.push({
          type: 'social',
          coordinates: [data.location.lon, data.location.lat],
          hazardType: data.hazardType,
          priority: data.priority,
          source: data.source,
          timestamp: data.enrichedAt,
          popup: this.generatePopupContent(data)
        });
      }
    });
    
    // Add report points
    reports.forEach(report => {
      if (report.location) {
        mapPoints.push({
          type: 'report',
          coordinates: [report.location.lon, report.location.lat],
          hazardType: report.hazardType,
          status: report.status,
          timestamp: report.createdAt,
          popup: this.generateReportPopup(report)
        });
      }
    });
    
    return mapPoints;
  }
  
  generateChartData(aggregations, processedData) {
    const now = Date.now();
    const timeRanges = {
      '1h': now - (60 * 60 * 1000),
      '6h': now - (6 * 60 * 60 * 1000),
      '24h': now - (24 * 60 * 60 * 1000),
      '7d': now - (7 * 24 * 60 * 60 * 1000)
    };
    
    return {
      hazardDistribution: this.getHazardDistribution(processedData),
      temporalTrends: this.getTemporalTrends(processedData, timeRanges),
      geographicDistribution: this.getGeographicDistribution(processedData),
      sourceAnalysis: this.getSourceAnalysis(processedData),
      priorityDistribution: this.getPriorityDistribution(processedData)
    };
  }
}
```

### 7.2 Analytics Dashboard Processing

```javascript
// Advanced analytics for decision makers
class AnalyticsProcessor {
  async generateAnalyticsReport(timeRange = '24h', filters = {}) {
    const [
      historicalData,
      trends,
      correlations,
      predictions
    ] = await Promise.all([
      this.getHistoricalData(timeRange, filters),
      this.analyzeTrends(timeRange, filters),
      this.calculateCorrelations(timeRange, filters),
      this.generatePredictions(timeRange, filters)
    ]);
    
    return {
      executiveSummary: this.generateExecutiveSummary(historicalData, trends),
      detailedAnalysis: {
        historical: historicalData,
        trends: trends,
        correlations: correlations,
        predictions: predictions
      },
      recommendations: this.generateRecommendations(trends, predictions),
      dataQuality: this.assessDataQuality(historicalData)
    };
  }
  
  async analyzeTrends(timeRange, filters) {
    const data = await this.getTimeSeriesData(timeRange, filters);
    
    return {
      hazardTrends: this.calculateHazardTrends(data),
      geographicTrends: this.calculateGeographicTrends(data),
      sourceTrends: this.calculateSourceTrends(data),
      severityTrends: this.calculateSeverityTrends(data),
      seasonalPatterns: this.detectSeasonalPatterns(data),
      anomalyDetection: this.detectAnomalies(data)
    };
  }
  
  async calculateCorrelations(timeRange, filters) {
    const data = await this.getCorrelationData(timeRange, filters);
    
    return {
      hazardLocationCorrelation: this.calculateHazardLocationCorrelation(data),
      hazardTimeCorrelation: this.calculateHazardTimeCorrelation(data),
      sourceAccuracyCorrelation: this.calculateSourceAccuracyCorrelation(data),
      engagementPriorityCorrelation: this.calculateEngagementPriorityCorrelation(data)
    };
  }
  
  async generatePredictions(timeRange, filters) {
    const historicalData = await this.getHistoricalData(timeRange, filters);
    
    return {
      hazardPrediction: this.predictHazardTypes(historicalData),
      geographicPrediction: this.predictGeographicHotspots(historicalData),
      severityPrediction: this.predictSeverityTrends(historicalData),
      volumePrediction: this.predictReportVolume(historicalData),
      confidenceIntervals: this.calculateConfidenceIntervals(historicalData)
    };
  }
}
```

---

## 📈 Performance Metrics & Optimization

### 8.1 Pipeline Performance Monitoring

```javascript
// Performance tracking system
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }
  
  trackMetric(name, value, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name).push({
      value,
      timestamp: Date.now(),
      metadata
    });
    
    // Check for performance alerts
    this.checkPerformanceAlerts(name, value);
  }
  
  checkPerformanceAlerts(metricName, value) {
    const thresholds = {
      processingTime: { warning: 5000, critical: 10000 },  // milliseconds
      apiLatency: { warning: 2000, critical: 5000 },       // milliseconds
      errorRate: { warning: 0.05, critical: 0.1 },         // 5% and 10%
      memoryUsage: { warning: 0.8, critical: 0.9 },        // 80% and 90%
      queueSize: { warning: 1000, critical: 5000 }         // items in queue
    };
    
    const threshold = thresholds[metricName];
    if (!threshold) return;
    
    if (value >= threshold.critical) {
      this.createPerformanceAlert('critical', metricName, value, threshold);
    } else if (value >= threshold.warning) {
      this.createPerformanceAlert('warning', metricName, value, threshold);
    }
  }
  
  getPerformanceReport() {
    const report = {
      summary: {},
      detailed: {},
      alerts: this.alerts,
      recommendations: []
    };
    
    // Calculate summary statistics
    for (const [name, values] of this.metrics) {
      const recentValues = values.filter(v => 
        Date.now() - v.timestamp < 60 * 60 * 1000  // Last hour
      );
      
      if (recentValues.length > 0) {
        const numericValues = recentValues.map(v => v.value);
        report.summary[name] = {
          current: numericValues[numericValues.length - 1],
          average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          count: numericValues.length
        };
        
        report.detailed[name] = recentValues;
      }
    }
    
    report.recommendations = this.generateRecommendations(report.summary);
    
    return report;
  }
}
```

### 8.2 Optimization Strategies

#### Data Processing Optimization
```javascript
// Batch processing for efficiency
class BatchProcessor {
  constructor(batchSize = 100, maxWaitTime = 5000) {
    this.batchSize = batchSize;
    this.maxWaitTime = maxWaitTime;
    this.currentBatch = [];
    this.timer = null;
  }
  
  async addItem(item) {
    this.currentBatch.push(item);
    
    if (this.currentBatch.length >= this.batchSize) {
      await this.processBatch();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.processBatch(), this.maxWaitTime);
    }
  }
  
  async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.currentBatch.length === 0) return;
    
    const batch = this.currentBatch;
    this.currentBatch = [];
    
    try {
      // Process batch in parallel
      const results = await Promise.all(
        batch.map(item => this.processItem(item))
      );
      
      // Batch database write
      await this.writeBatchToDatabase(results);
      
    } catch (error) {
      console.error('Batch processing error:', error);
      // Handle failed items
      await this.handleFailedBatch(batch, error);
    }
  }
}
```

#### Memory Management
```javascript
// Memory optimization for large datasets
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000; // items
    this.ttl = 30 * 60 * 1000; // 30 minutes
  }
  
  set(key, value) {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update last accessed time
    item.lastAccessed = Date.now();
    return item.value;
  }
  
  evictLeastRecentlyUsed() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, item] of this.cache) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}
```

---

## 🔒 Security & Data Governance

### 9.1 Data Privacy Measures

```javascript
// Data anonymization and privacy protection
class DataPrivacyManager {
  anonymizeUserData(data) {
    const anonymized = { ...data };
    
    // Remove PII (Personally Identifiable Information)
    if (anonymized.user) {
      anonymized.user = {
        id: this.hashUserId(anonymized.user.id),
        type: anonymized.user.type,
        // Remove name, email, phone, etc.
      };
    }
    
    // Anonymize location data (generalize to district level)
    if (anonymized.location) {
      anonymized.location = this.generalizeLocation(anonymized.location);
    }
    
    // Remove exact timestamps (use hour-level granularity)
    if (anonymized.timestamp) {
      anonymized.timestamp = this.generalizeTimestamp(anonymized.timestamp);
    }
    
    return anonymized;
  }
  
  hashUserId(userId) {
    // Use cryptographic hash for user anonymization
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }
  
  generalizeLocation(location) {
    // Convert precise coordinates to district-level approximation
    const districtGrid = this.getDistrictGrid();
    const district = this.findDistrictForCoordinates(location, districtGrid);
    
    return {
      district: district.name,
      state: district.state,
      // Remove precise coordinates
    };
  }
}
```

### 9.2 Audit Trail Implementation

```javascript
// Comprehensive audit logging
class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogSize = 10000;
  }
  
  log(action, data, user = null) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      action,
      data: this.sanitizeData(data),
      user: user ? { id: user.id, role: user.role } : null,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      sessionId: this.getSessionId()
    };
    
    this.logs.push(logEntry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
    
    // Persist to database
    this.persistLog(logEntry);
  }
  
  sanitizeData(data) {
    // Remove sensitive information from audit logs
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'apiKey'];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  async getAuditReport(filters = {}) {
    let filteredLogs = [...this.logs];
    
    // Apply filters
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.user?.id === filters.userId);
    }
    
    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(filters.startTime)
      );
    }
    
    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= new Date(filters.endTime)
      );
    }
    
    return {
      totalLogs: filteredLogs.length,
      logs: filteredLogs,
      summary: this.generateAuditSummary(filteredLogs)
    };
  }
}
```

---

## 🎯 Conclusion

The IndiaGuard Data Processing Pipeline represents a sophisticated, multi-layered architecture designed to handle real-time coastal hazard monitoring at scale. By combining advanced AI/NLP processing, real-time data streaming, and comprehensive analytics, the system provides actionable intelligence for disaster management authorities and citizens alike.

### Key Strengths:
1. **Multi-lingual Processing**: Supports 9 Indian languages + English
2. **Real-time Performance**: Sub-second processing for critical alerts
3. **Scalable Architecture**: Cloud-based design for national deployment
4. **Comprehensive Analytics**: From raw data to predictive insights
5. **Security & Privacy**: Enterprise-grade data protection

### Technical Innovation:
- **Hybrid AI Approach**: Combines transformer models with keyword fallbacks
- **Advanced Rate Limiting**: Intelligent API management across multiple platforms
- **Real-time Stream Processing**: Live data aggregation and alert generation
- **Multi-source Data Fusion**: Social media, citizen reports, and official data

This pipeline demonstrates the potential of modern data processing technologies to address critical societal challenges in disaster management and public safety.

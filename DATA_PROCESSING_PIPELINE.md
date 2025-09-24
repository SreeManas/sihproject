# INCOIS SAMACHAR Data Processing Pipeline
## Actual Implementation Documentation

### 🔄 Overview
The INCOIS SAMACHAR Data Processing Pipeline is a real-time coastal hazard monitoring system that combines social media monitoring, citizen reporting, and AI-powered analysis. The system uses Firebase as the primary database, HuggingFace models for NLP processing, and focuses on tsunami, cyclone, flood, and coastal hazard detection with live GPS coordinates.

---

## 📊 Actual Pipeline Architecture

### Current Implementation Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Twitter API   │    │  Citizen Reports│    │  Mock Data      │
│   (v2)          │    │  (Web Form)     │    │  (Fallback)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ socialMediaAPI  │    │   ReportForm    │    │ socialMapService│
│   Service       │    │   Component     │    │   Service       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────┬───────────┴──────────┬───────────┘
                     │                      │
          ┌──────────▼─────────────────────▼──────────┐
          │        enhancedHybridNLP Engine           │
          │  (HuggingFace Models + Keyword Analysis) │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │        Geocoding & Location Services       │
          │   (Google Maps + OpenCage APIs)           │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           Firebase Firestore               │
          │    (Real-time Database + Storage)         │
          └─────────────────┬─────────────────────────┘
                            │
          ┌─────────────────▼─────────────────────────┐
          │           React Dashboard                 │
          │  (Mapbox Maps + Recharts Analytics)       │
          └──────────────────────────────────────────┘
```

---

## 🚪 Stage 1: Data Ingestion Layer

### 1.1 Social Media Data Sources

#### Twitter API Integration (ACTUAL IMPLEMENTATION)
```javascript
// File: src/services/socialMediaAPI.js
class TwitterAPI {
  constructor() {
    this.bearerToken = import.meta.env.VITE_TWITTER_BEARER_TOKEN || '';
    this.baseURL = 'https://api.twitter.com/2';
  }

  async searchTweets(query, options = {}) {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en OR lang:hi OR lang:te`,
      'tweet.fields': 'created_at,author_id,public_metrics,context_annotations,lang,geo',
      'user.fields': 'username,name,location,verified',
      'expansions': 'author_id,geo.place_id',
      'place.fields': 'country,country_code,full_name,geo',
      'max_results': options.maxResults || 100
    });

    try {
      const response = await rateLimitManager.enqueue('twitter', {
        endpoint: `tweets/search/recent?${params}`,
        headers: { 'Authorization': `Bearer ${this.bearerToken}` }
      });
      return this.transformTwitterData(response);
    } catch (error) {
      console.error('Twitter API error:', error);
      throw error;
    }
  }
}
```

**Hazard Query Patterns (ACTUAL):**
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

### 1.2 Citizen Report Ingestion (ACTUAL IMPLEMENTATION)

#### Web Form Processing with Live GPS
```javascript
// File: src/components/ReportForm.jsx
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  });
};

async function onSubmit(e) {
  e.preventDefault();
  setLoading(true);
  setStatus('Fetching location...');
  
  try {
    // Fetch GPS coordinates only when submitting
    const locationCoords = await getCurrentLocation();
    setCoords(locationCoords);
    setStatus('Location detected! Submitting report...');
    
    if (navigator.onLine) {
      await submitOnline(locationCoords);
      setStatus('Report submitted successfully!');
    } else {
      await offlineSync.enqueueReport({ 
        hazardType, 
        description, 
        coords: locationCoords, 
        fileName: file?.name || null 
      });
      setStatus('Offline: report queued, will sync automatically when online.');
    }
  } catch (e) {
    console.error('Submission failed:', e);
    await offlineSync.enqueueReport({ 
      hazardType, 
      description, 
      coords: { latitude: null, longitude: null }, 
      fileName: file?.name || null 
    });
    setStatus(`Error: ${e.message}. Report queued for later sync.`);
  } finally {
    setLoading(false);
  }
}
```

---

## 🤖 Stage 2: Data Processing Layer

### 2.1 enhancedHybridNLP Engine (ACTUAL IMPLEMENTATION)

#### Multi-lingual Language Detection
```javascript
// File: src/utils/enhancedHybridNLP.js
export function detectLanguage(text) {
  const langPatterns = {
    hi: /[ऀ-ॿ]/,           // Hindi
    te: /[\u0C00-\u0C7F]/,  // Telugu
    ta: /[\u0B80-\u0BFF]/,  // Tamil
    ml: /[\u0D00-\u0D7F]/,  // Malayalam
    kn: /[\u0C80-\u0CFF]/,  // Kannada
    gu: /[\u0A80-\u0AFF]/,  // Gujarati
    bn: /[\u0980-\u09FF]/,  // Bengali
    pa: /[\u0A00-\u0A7F]/,  // Punjabi
    or: /[\u0B00-\u0B7F]/   // Odia
  };
  
  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) return lang;
  }
  return "en";
}
```

#### HuggingFace Model Integration
```javascript
// File: src/utils/huggingfaceUtils.js
// Multilingual zero-shot classification (XNLI/XLM-R)
export async function classifyMultilingualTextXLMR(text, { model = 'joeddav/xlm-roberta-large-xnli' } = {}) {
  const labels = ["Tsunami","Cyclone","Flood","Earthquake","High Waves","Other"];
  const res = await rateLimitManager.enqueue('huggingface', {
    model,
    payload: { inputs: text, parameters: { candidate_labels: labels, multi_label: false } }
  });
  if (Array.isArray(res) && res[0]?.labels) {
    return { label: res[0].labels[0] || 'Other', confidence: res[0].scores?.[0] || 0.5 };
  } else if (res?.labels) {
    return { label: res.labels[0] || 'Other', confidence: res.scores?.[0] || 0.5 };
  }
  return { label: 'Other', confidence: 0.5 };
}

// Sentiment Analysis (English only)
export const analyzeSentimentHF = async (text) => {
  const result = await rateLimitManager.enqueue("huggingface", {
    model: "distilbert-base-uncased-finetuned-sst-2-english",
    payload: { inputs: text }
  });
  return result[0]?.label || "NEUTRAL";
};
```

#### Hybrid Classification Approach
```javascript
export async function classifyHazard(text) {
  const lang = detectLanguage(text);
  const hazardLabels = [
    "Tsunami", "Cyclone", "Storm Surge", "High Waves", "Flood", 
    "Landslide", "Earthquake", "Coastal Erosion", "Other"
  ];
  
  // Try AI models first, fallback to keyword-based
  if (lang !== 'en' && MULTI_ENABLED) {
    // Use multi-lingual models
    return await classifyMultilingualTextXLMR(text);
  } else if (lang === "en") {
    // Use BART for English
    return await classifyHazardHF(text);
  }
  
  // Keyword-based fallback for reliability
  return keywordBasedClassification(text, hazardLabels);
}
```

### 2.2 Geocoding Services (ACTUAL IMPLEMENTATION)

```javascript
// File: src/services/geocodingService.js
class GeocodingService {
  async geocodePlace(placeName) {
    try {
      // Try Google Maps API first
      const googleResult = await this.geocodeWithGoogle(placeName);
      if (googleResult) return googleResult;
      
      // Fallback to OpenCage API
      const opencageResult = await this.geocodeWithOpenCage(placeName);
      if (opencageResult) return opencageResult;
      
      throw new Error('Geocoding failed for both services');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  validateCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
```

---

## 💾 Stage 3: Data Storage Layer

### 3.1 Firebase Firestore Integration (ACTUAL IMPLEMENTATION)

```javascript
// File: src/services/reportService.js
export const submitReport = async (reportData) => {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be logged in to submit a report.');
  }

  const reportRef = await addDoc(collection(db, 'reports'), {
    hazardType: reportData.hazardType,
    description: reportData.description,
    location: {
      latitude: reportData.locationCoords.latitude,
      longitude: reportData.locationCoords.longitude
    },
    fileUrl: reportData.fileUrl,
    thumbUrl: reportData.thumbUrl,
    userId: user.uid,
    createdAt: serverTimestamp(),
    processed: false,
    priority: 'medium'
  });

  return reportRef.id;
};
```

### 3.2 Real-time Data Synchronization

```javascript
// File: src/utils/offlineSync.js
export const offlineSync = {
  enqueueReport: async (reportData) => {
    const offlineReports = JSON.parse(localStorage.getItem('offlineReports') || '[]');
    offlineReports.push({
      ...reportData,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });
    localStorage.setItem('offlineReports', JSON.stringify(offlineReports));
  },

  syncReports: async () => {
    const offlineReports = JSON.parse(localStorage.getItem('offlineReports') || '[]');
    for (const report of offlineReports) {
      try {
        await submitReport(report);
        // Remove synced report
        const updatedReports = offlineReports.filter(r => r.id !== report.id);
        localStorage.setItem('offlineReports', JSON.stringify(updatedReports));
      } catch (error) {
        console.error('Sync failed for report:', report.id, error);
      }
    }
  }
};
```

---

## 📊 Stage 4: Visualization & Analytics Layer

### 4.1 React Dashboard with Mapbox (ACTUAL IMPLEMENTATION)

```javascript
// File: src/components/Dashboard.jsx
export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);

  useEffect(() => {
    // Real-time report subscription
    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
    });

    return () => unsubscribeReports();
  }, []);

  return (
    <div className="dashboard">
      <InteractiveDashboardMap reports={reports} socialPosts={socialPosts} />
      <AnalyticsDashboard reports={reports} />
    </div>
  );
}
```

### 4.2 Mapbox Integration for Real-time Visualization

```javascript
// File: src/components/InteractiveDashboardMap.jsx
const InteractiveDashboardMap = ({ reports, socialPosts }) => {
  const mapRef = useRef();
  
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [78.4867, 17.3850], // India center
      zoom: 5
    });

    // Add reports to map
    reports.forEach(report => {
      if (report.location?.latitude && report.location?.longitude) {
        new mapboxgl.Marker()
          .setLngLat([report.location.longitude, report.location.latitude])
          .setPopup(new mapboxgl.Popup().setText(report.hazardType))
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [reports]);

  return <div ref={mapRef} className="map-container" />;
};
```

---

## 📋 Detailed Pipeline Workflow (ACTUAL IMPLEMENTATION)

### 🔍 Data Collection
- **Citizen Reports**: Collect hazard reports via web form with automatic GPS coordinate capture on submission
- **Social Media Feeds**: Gather Twitter data via Twitter API v2 for hazard-related content monitoring
- **Mock Data**: Generate fallback test data for development and demonstration purposes

### 🧹 Data Preprocessing
- **Data Cleaning**: Remove retweets, filter by language (English, Hindi, Telugu, and other Indian languages)
- **Timestamp Validation**: Ensure proper chronological ordering of reports and social media posts
- **GPS Coordinate Validation**: Verify latitude/longitude ranges and geocoding accuracy
- **Duplicate Detection**: Check for duplicate reports using location, time, and content similarity
- **Multi-language Processing**: Handle 9 Indian languages (Hindi, Telugu, Tamil, Malayalam, Kannada, Gujarati, Bengali, Punjabi, Odia)
- **Media Processing**: Extract and store file metadata for uploaded images and videos

### ✅ Data Validation & Enrichment
- **HuggingFace NLP Classification**: Use BART and XLM-RoBERTa models for hazard type classification
- **Sentiment Analysis**: Analyze emotional tone of reports and social media posts
- **Language Detection**: Automatically detect and process content in multiple Indian languages
- **Geocoding Services**: Convert place names to coordinates using Google Maps and OpenCage APIs
- **Location Enrichment**: Add geographic context and administrative boundaries to reports
- **Data Validation**: Cross-reference hazard classifications with keyword-based fallback systems
- **Database Storage**: Store validated and enriched data in Firebase Firestore with real-time synchronization

### 🤖 Machine Learning Workflow
- **Feature Engineering**: Extract temporal, spatial, and textual features from reports
- **HuggingFace Model Integration**: Utilize pre-trained transformer models for text classification
- **Multi-lingual Processing**: Apply language-specific models for different Indian languages
- **Confidence Scoring**: Generate confidence scores for hazard classifications
- **Keyword-based Fallback**: Implement rule-based classification as backup for AI model failures
- **Model Selection**: Choose between BART (English) and XLM-RoBERTa (multi-lingual) based on detected language

### 📈 Forecast Generation
- **Real-time Hazard Detection**: Identify immediate hazard reports from citizens and social media
- **Geographic Clustering**: Group reports by geographic proximity for hotspot identification
- **Temporal Trend Analysis**: Monitor frequency and patterns of hazard reports over time
- **Risk Assessment**: Generate basic risk scores based on report density and hazard types
- **Alert Prioritization**: Categorize reports by severity and geographic impact
- **Visualization Updates**: Update map markers and dashboard analytics in real-time

### 🚀 Deployment & Monitoring
- **Web Application**: Deploy React-based dashboard with Firebase hosting
- **Real-time Database**: Utilize Firebase Firestore for live data synchronization
- **Interactive Maps**: Implement Mapbox GL JS for geographic visualization
- **Offline Capabilities**: Enable report submission and queuing when network is unavailable
- **Rate Limiting**: Manage API call limits for Twitter and HuggingFace services
- **User Authentication**: Implement Firebase Auth for secure report submission
- **Real-time Updates**: Provide live dashboard updates via Firestore listeners
- **Mobile Responsive**: Ensure web application works on mobile devices
- **Continuous Monitoring**: Log errors and performance metrics for system improvement

---

## 🚨 Key Differences from Original Description

### ❌ **NOT IMPLEMENTED:**
- **NO IMD/INCOIS/CPCB official data integration**
- **NO satellite data processing**
- **NO Facebook API integration**
- **NO YouTube API integration**
- **NO LSTM machine learning models**
- **NO PostGIS database**
- **NO Mobile TFLite deployment**
- **NO chatbot integration**
- **NO dynamic hotspot clustering with Mapbox**

### ✅ **ACTUALLY IMPLEMENTED:**
- **Twitter API v2 integration** for social media monitoring
- **Citizen report form** with live GPS coordinates
- **HuggingFace models** for NLP processing (BART, XLM-RoBERTa)
- **Firebase Firestore** for real-time database
- **Mapbox GL JS** for map visualization
- **Multi-lingual support** for 9 Indian languages
- **Offline sync** capabilities
- **Rate limiting** for API management
- **Real-time dashboard** with React

### 🎯 **Current System Capabilities:**
1. **Real-time Twitter monitoring** for hazard-related content
2. **Citizen reporting** with automatic GPS location capture
3. **AI-powered hazard classification** using HuggingFace models
4. **Multi-lingual processing** for Indian languages
5. **Geocoding services** for location enrichment
6. **Real-time visualization** on interactive maps
7. **Offline functionality** for unreliable network conditions
8. **Firebase integration** for authentication and data storage

This documentation accurately reflects the current state of the INCOIS SAMACHAR project as implemented in the codebase.

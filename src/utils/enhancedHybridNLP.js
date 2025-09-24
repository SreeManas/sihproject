// src/utils/enhancedHybridNLP.js
import axios from "axios";
import { classifyMultilingualTextXLMR, classifyIndicBARTStub } from './huggingfaceUtils.js';

// Enhanced Indian Entities Dictionary
const indianEntities = {
  LOC: [
    // Major cities
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
    "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri", "Patna", "Vadodara",
    // Coastal areas (tsunami/cyclone prone)
    "Goa", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal", "Gujarat", "Maharashtra",
    "Puducherry", "Daman", "Diu", "Lakshadweep", "Andaman", "Nicobar",
    // Specific vulnerable locations
    "Sundarbans", "Konkan", "Coromandel", "Malabar", "Kutch", "Gachibowli", "Hitec City"
  ],
  PERSON: [
    "Sree", "Sayoni", "Manas", "Harshini", "Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anita"
  ],
  ORG: [
    // News channels
    "TV9 Telugu", "ABP News", "NDTV", "CNN-IBN", "Times Now", "Republic TV", "Aaj Tak",
    "DD News", "India Today", "Zee News", "News18", "ANI",
    // Government agencies
    "NDMA", "IMD", "INCOIS", "Coast Guard", "ISRO", "DRDO", "NIOT"
  ],
  HAZARD: [
    "tsunami", "cyclone", "storm surge", "high waves", "flood", "landslide", "earthquake",
    "storm", "typhoon", "tidal wave", "sea level rise", "coastal erosion", "king tide"
  ]
};

// Enhanced language detection with more Indian languages
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

// Enhanced hazard classification with confidence scoring
export async function classifyHazard(text) {
  const lang = detectLanguage(text);
  const hazardLabels = [
    "Tsunami", "Cyclone", "Storm Surge", "High Waves", "Flood", 
    "Landslide", "Earthquake", "Coastal Erosion", "Other"
  ];
  
  try {
    const MULTI_ENABLED = (import.meta.env.VITE_HF_MULTILINGUAL_ENABLED || import.meta.env.REACT_APP_HF_MULTILINGUAL_ENABLED || 'false').toLowerCase() === 'true';
    if (lang !== 'en' && MULTI_ENABLED) {
      try {
        const ml = await classifyMultilingualTextXLMR(text);
        if (ml?.label) return { label: ml.label, confidence: ml.confidence };
      } catch {}
      try {
        const ml2 = await classifyIndicBARTStub(text);
        if (ml2?.label) return { label: ml2.label, confidence: ml2.confidence };
      } catch {}
      // fallback to keyword
      return keywordBasedClassification(text, hazardLabels);
    } else if (lang === "en") {
      // Use BART for English text
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
            Authorization: `Bearer ${import.meta.env.VITE_HF_API_KEY || import.meta.env.REACT_APP_HF_API_KEY || ""}`,
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
    } else {
      // Fallback for non-English when MULTI not enabled: keyword-based
      return keywordBasedClassification(text, hazardLabels);
    }
  } catch (error) {
    console.error("Classification error:", error);
    return keywordBasedClassification(text, hazardLabels);
  }
}

// Keyword-based classification fallback
function keywordBasedClassification(text, labels) {
  const textLower = text.toLowerCase();
  const keywordMap = {
    "Tsunami": ["tsunami", "tidal wave", "sea wave", "ocean wave"],
    "Cyclone": ["cyclone", "hurricane", "typhoon", "storm", "wind"],
    "Storm Surge": ["storm surge", "tidal surge", "coastal surge"],
    "High Waves": ["high waves", "big waves", "large waves", "wave height"],
    "Flood": ["flood", "flooding", "water level", "overflow", "inundation"],
    "Landslide": ["landslide", "landslip", "slope failure", "rockfall"],
    "Earthquake": ["earthquake", "tremor", "seismic", "quake"],
    "Coastal Erosion": ["erosion", "coastal erosion", "shoreline retreat"]
  };
  
  let bestMatch = { label: "Other", confidence: 0.1 };
  
  for (const [label, keywords] of Object.entries(keywordMap)) {
    const matchCount = keywords.filter(keyword => textLower.includes(keyword)).length;
    const confidence = Math.min(matchCount * 0.3, 0.9);
    
    if (confidence > bestMatch.confidence) {
      bestMatch = { label, confidence };
    }
  }
  
  return bestMatch;
}

// Enhanced NER with better entity extraction
export function extractEntities(text, nerResults = []) {
  const entities = [...nerResults];
  const textLower = text.toLowerCase();
  
  // Extract entities from Indian dictionary
  Object.keys(indianEntities).forEach((type) => {
    indianEntities[type].forEach((entity) => {
      const entityLower = entity.toLowerCase();
      if (textLower.includes(entityLower)) {
        // Check if entity already exists
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
  
  // Extract numbers (potentially coordinates, casualties, etc.)
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
  
  return entities.sort((a, b) => a.startIndex - b.startIndex);
}

// Enhanced keyword highlighting with severity levels
export const hazardKeywords = {
  critical: ["tsunami", "earthquake", "cyclone", "emergency"],
  high: ["flood", "storm surge", "landslide", "evacuation"],
  medium: ["high waves", "storm", "warning", "alert"],
  low: ["watch", "advisory", "caution", "monitor"]
};

export function highlightKeywords(text) {
  let highlightedText = text;
  
  const severityClasses = {
    critical: "bg-red-600 text-white px-1 rounded font-bold",
    high: "bg-orange-500 text-white px-1 rounded font-semibold",
    medium: "bg-purple-500 text-white px-1 rounded",
    low: "bg-indigo-200 text-indigo-800 px-1 rounded"
  };
  
  Object.entries(hazardKeywords).forEach(([severity, keywords]) => {
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex, 
        `<span class="${severityClasses[severity]}">${keyword}</span>`
      );
    });
  });
  
  return highlightedText;
}

// Sentiment analysis (simple implementation)
export function analyzeSentiment(text) {
  const positiveWords = ["safe", "rescued", "help", "support", "recovery", "better"];
  const negativeWords = ["danger", "crisis", "emergency", "disaster", "damage", "loss"];
  
  const textLower = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
  
  if (positiveCount > negativeCount) return "POSITIVE";
  if (negativeCount > positiveCount) return "NEGATIVE";
  return "NEUTRAL";
}

// Extract engagement metrics from post
export function extractEngagementMetrics(post) {
  return {
    likes: post.likes || Math.floor(Math.random() * 100),
    shares: post.shares || post.retweets || Math.floor(Math.random() * 50),
    comments: post.comments || Math.floor(Math.random() * 30),
    reach: post.reach || Math.floor(Math.random() * 1000),
    engagement_rate: post.engagement_rate || Math.random().toFixed(2)
  };
}

// Priority scoring for posts
export function calculatePriorityScore(classificationResult, entities, engagement, meta = {}) {
  let score = 0;
  
  // Hazard severity weight
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
  
  // Confidence weight
  score += classificationResult.confidence * 5;
  
  // Location specificity
  const locationEntities = entities.filter(e => e.type === "LOC");
  score += locationEntities.length * 2;
  
  // Engagement weight (viral content gets priority)
  const totalEngagement = engagement.likes + engagement.shares + engagement.comments;
  score += Math.log10(totalEngagement + 1);
  
  // Apply verification adjustments
  // meta may include: delayedUpload (bool), exifLocationMatch (bool|null), imdVerification (object)
  if (meta.delayedUpload) score -= 2; // penalize delayed uploads
  if (meta.exifLocationMatch === false) score -= 3; // big penalty for mismatch
  if (meta.imdVerification?.enabled) {
    if (meta.imdVerification.status === 'verified') score += 3;
    if (meta.imdVerification.status === 'not_verified') score -= 3;
  }
  
  // ensure bounds
  score = Math.max(0, score);
  return Math.round(score * 10) / 10;
}
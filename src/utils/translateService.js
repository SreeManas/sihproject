// src/utils/translateService.js
const API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_KEY;

// Translation cache to avoid repeated API calls
const translationCache = new Map();

// Get cached translation or return null if not cached
function getCachedTranslation(text, targetLang) {
  const cacheKey = `${targetLang}:${text}`;
  const cached = localStorage.getItem(`translation_${cacheKey}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if cache is not too old (7 days)
      const isExpired = Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000;
      if (!isExpired) {
        return parsed.translation;
      } else {
        // Remove expired cache
        localStorage.removeItem(`translation_${cacheKey}`);
      }
    } catch (e) {
      // Remove invalid cache
      localStorage.removeItem(`translation_${cacheKey}`);
    }
  }
  return null;
}

// Cache translation in localStorage
function cacheTranslation(text, targetLang, translatedText) {
  const cacheKey = `${targetLang}:${text}`;
  const cacheData = {
    translation: translatedText,
    timestamp: Date.now()
  };
  localStorage.setItem(`translation_${cacheKey}`, JSON.stringify(cacheData));
}

export async function translateText(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en') {
    return text;
  }

  // Check cache first
  const cached = getCachedTranslation(text, targetLang);
  if (cached) {
    return cached;
  }

  // Check if API key is available
  if (!API_KEY) {
    console.warn('Google Translate API key not found. Please set VITE_GOOGLE_TRANSLATE_KEY in .env.local');
    return text;
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        q: text, 
        target: targetLang,
        format: 'text'
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const translatedText = data?.data?.translations?.[0]?.translatedText || text;
    
    // Cache the successful translation
    if (translatedText !== text) {
      cacheTranslation(text, targetLang, translatedText);
    }
    
    return translatedText;
  } catch (e) {
    console.warn("Translation failed", e);
    return text;
  }
}

// Batch translate multiple texts to reduce API calls
export async function translateTexts(texts, targetLang) {
  if (!texts || !Array.isArray(texts) || !targetLang || targetLang === 'en') {
    return texts;
  }

  // Filter out empty strings and check cache
  const textsToTranslate = [];
  const results = [];
  
  for (const text of texts) {
    if (!text) {
      results.push(text);
      continue;
    }
    
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
      results.push(cached);
    } else {
      textsToTranslate.push(text);
      results.push(null); // placeholder
    }
  }

  // If no texts need translation, return results
  if (textsToTranslate.length === 0) {
    return results;
  }

  // Check if API key is available
  if (!API_KEY) {
    console.warn('Google Translate API key not found. Please set VITE_GOOGLE_TRANSLATE_KEY in .env.local');
    return texts;
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        q: textsToTranslate, 
        target: targetLang,
        format: 'text'
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const translations = data?.data?.translations || [];
    
    // Map translations back to results array
    let translationIndex = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i] === null) {
        const translatedText = translations[translationIndex]?.translatedText || textsToTranslate[translationIndex];
        results[i] = translatedText;
        
        // Cache the successful translation
        if (translatedText !== textsToTranslate[translationIndex]) {
          cacheTranslation(textsToTranslate[translationIndex], targetLang, translatedText);
        }
        
        translationIndex++;
      }
    }
    
    return results;
  } catch (e) {
    console.warn("Batch translation failed", e);
    return texts;
  }
}

// Clear all translation cache
export function clearTranslationCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('translation_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

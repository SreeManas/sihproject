// src/services/geocodingService.js
// Geocoding service for place name to coordinates conversion and reverse geocoding

const env = import.meta.env;

class GeocodingService {
  constructor() {
    this.googleApiKey = env.VITE_GOOGLE_GEOCODING_API_KEY || env.REACT_APP_GOOGLE_GEOCODING_API_KEY;
    this.opencageApiKey = env.VITE_OPENCAGE_API_KEY || env.REACT_APP_OPENCAGE_API_KEY;
    this.cache = new Map();
    this.cacheExpiry = 1000 * 60 * 60; // 1 hour cache
  }

  // Get cache key for a request
  getCacheKey(service, params) {
    return `${service}:${JSON.stringify(params)}`;
  }

  // Check if cached result is still valid
  isCacheValid(cachedItem) {
    return cachedItem && (Date.now() - cachedItem.timestamp) < this.cacheExpiry;
  }

  // Set cache entry
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get cached data
  getCache(key) {
    const cached = this.cache.get(key);
    return this.isCacheValid(cached) ? cached.data : null;
  }

  // Validate coordinates are within valid ranges
  validateCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  // Calculate distance between two coordinates in kilometers
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Geocode place name to coordinates using Google Geocoding API
  async geocodeWithGoogle(place) {
    if (!this.googleApiKey) {
      throw new Error('Google Geocoding API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${this.googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Google Geocoding failed: ${data.status} - ${data.error_message || 'No results found'}`);
    }

    const result = data.results[0];
    const location = result.geometry.location;
    
    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: result.formatted_address,
      confidence: this.getConfidenceFromResult(result),
      source: 'google'
    };
  }

  // Geocode place name using OpenCage API (fallback)
  async geocodeWithOpenCage(place) {
    if (!this.opencageApiKey) {
      throw new Error('OpenCage API key not configured');
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(place)}&key=${this.opencageApiKey}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status.code !== 200 || !data.results || data.results.length === 0) {
      throw new Error(`OpenCage geocoding failed: ${data.status.message}`);
    }

    const result = data.results[0];
    const geometry = result.geometry;
    
    return {
      lat: geometry.lat,
      lng: geometry.lng,
      formatted_address: result.formatted,
      confidence: result.confidence || 5,
      source: 'opencage'
    };
  }

  // Get confidence level from Google result
  getConfidenceFromResult(result) {
    if (result.geometry.location_type === 'ROOFTOP') return 10;
    if (result.geometry.location_type === 'RANGE_INTERPOLATED') return 9;
    if (result.geometry.location_type === 'GEOMETRIC_CENTER') return 7;
    if (result.geometry.location_type === 'APPROXIMATE') return 5;
    return 3;
  }

  // Main geocoding function with fallback
  async geocodePlace(place) {
    if (!place || typeof place !== 'string') {
      throw new Error('Place name is required');
    }

    const cacheKey = this.getCacheKey('geocode', { place });
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('🎯 Using cached geocoding result for:', place);
      return cached;
    }

    console.log('🌍 Geocoding place:', place);

    // Try Google first
    if (this.googleApiKey) {
      try {
        const result = await this.geocodeWithGoogle(place);
        this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.warn('⚠️ Google geocoding failed, trying OpenCage:', error.message);
      }
    }

    // Fallback to OpenCage
    if (this.opencageApiKey) {
      try {
        const result = await this.geocodeWithOpenCage(place);
        this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.warn('⚠️ OpenCage geocoding failed:', error.message);
      }
    }

    throw new Error('No geocoding service available. Please configure API keys.');
  }

  // Reverse geocode coordinates to place name using Google
  async reverseGeocodeWithGoogle(lat, lng) {
    if (!this.googleApiKey) {
      throw new Error('Google Geocoding API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Google reverse geocoding failed: ${data.status} - ${data.error_message || 'No results found'}`);
    }

    const result = data.results[0];
    return {
      formatted_address: result.formatted_address,
      address_components: result.address_components,
      place_id: result.place_id,
      source: 'google'
    };
  }

  // Reverse geocode using OpenCage (fallback)
  async reverseGeocodeWithOpenCage(lat, lng) {
    if (!this.opencageApiKey) {
      throw new Error('OpenCage API key not configured');
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${this.opencageApiKey}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status.code !== 200 || !data.results || data.results.length === 0) {
      throw new Error(`OpenCage reverse geocoding failed: ${data.status.message}`);
    }

    const result = data.results[0];
    return {
      formatted_address: result.formatted,
      address_components: result.components,
      source: 'opencage'
    };
  }

  // Main reverse geocoding function with fallback
  async reverseGeocode(lat, lng) {
    if (!this.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates provided');
    }

    const cacheKey = this.getCacheKey('reverse', { lat, lng });
    const cached = this.getCache(cacheKey);
    if (cached) {
      console.log('🎯 Using cached reverse geocoding result for:', lat, lng);
      return cached;
    }

    console.log('🌍 Reverse geocoding coordinates:', lat, lng);

    // Try Google first
    if (this.googleApiKey) {
      try {
        const result = await this.reverseGeocodeWithGoogle(lat, lng);
        this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.warn('⚠️ Google reverse geocoding failed, trying OpenCage:', error.message);
      }
    }

    // Fallback to OpenCage
    if (this.opencageApiKey) {
      try {
        const result = await this.reverseGeocodeWithOpenCage(lat, lng);
        this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        console.warn('⚠️ OpenCage reverse geocoding failed:', error.message);
      }
    }

    throw new Error('No reverse geocoding service available. Please configure API keys.');
  }

  // Get current browser location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

// Export singleton instance
const geocodingService = new GeocodingService();
export default geocodingService;

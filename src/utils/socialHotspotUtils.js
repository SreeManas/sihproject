// src/utils/socialHotspotUtils.js
// Utilities to convert social posts into GeoJSON and compute hotspots for the map.
//
// This module exposes:
// - postsToGeoJSON(posts): convert array of posts with coordinates into GeoJSON FeatureCollection
// - aggregateToHeatFeatures(posts, opts): aggregate posts into heatmap-weighted points
// - hexbinAggregate(posts, opts): simple client-side hexbin approximation (grid-based) for demo without heavy deps
//
// Notes:
// - We do not fetch media here. Hotspots derive only from metadata (lat, lon, hazardLabel, priorityScore).
// - For performance and determinism in demo, we use a grid-based aggregation instead of true hexbin.
// - Use "weight" based on priorityScore + engagement as the heat intensity.
// - Outputs GeoJSON ready for Mapbox heatmap and circle layers.

export function postsToGeoJSON(posts = []) {
  const features = posts
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map(p => ({
      type: 'Feature',
      properties: {
        id: p.id || `post_${Math.random()}`,
        hazardLabel: p.hazardLabel || 'Other',
        priorityScore: p.priorityScore || 0,
        sentiment: p.sentiment || 'NEUTRAL',
        platform: p.platform || 'unknown',
        timestamp: p.timestamp || p.processedAt || new Date().toISOString(),
      },
      geometry: {
        type: 'Point',
        coordinates: [p.lon, p.lat],
      },
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function aggregateToHeatFeatures(posts = [], opts = {}) {
  const weightFn = (p) => {
    const engagement =
      (p.engagement?.likes || 0) + (p.engagement?.shares || 0) + (p.engagement?.comments || 0);
    const priority = p.priorityScore || 0;
    return 0.4 * priority + 0.6 * Math.log10(1 + engagement);
  };

  const features = posts
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map(p => ({
      type: 'Feature',
      properties: {
        weight: Math.max(0.1, weightFn(p)),
        hazardLabel: p.hazardLabel || 'Other',
      },
      geometry: {
        type: 'Point',
        coordinates: [p.lon, p.lat],
      },
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

// Simple grid aggregate (pseudo-hex) for demo. Adjust cellSize in degrees (~0.05 ≈ ~5km).
export function hexbinAggregate(posts = [], opts = {}) {
  const cellSize = opts.cellSize || 0.05;
  const grid = new Map(); // key: `${ix}:${iy}` -> { count, sumWeight, sampleLon, sampleLat }

  const weightFn = (p) => {
    const engagement =
      (p.engagement?.likes || 0) + (p.engagement?.shares || 0) + (p.engagement?.comments || 0);
    const priority = p.priorityScore || 0;
    return 0.4 * priority + 0.6 * Math.log10(1 + engagement);
  };

  for (const p of posts) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const ix = Math.floor(p.lon / cellSize);
    const iy = Math.floor(p.lat / cellSize);
    const key = `${ix}:${iy}`;
    const w = Math.max(0.1, weightFn(p));

    if (!grid.has(key)) {
      grid.set(key, { count: 0, sumWeight: 0, sampleLon: p.lon, sampleLat: p.lat });
    }
    const g = grid.get(key);
    g.count += 1;
    g.sumWeight += w;
  }

  const features = [];
  for (const [, cell] of grid) {
    features.push({
      type: 'Feature',
      properties: {
        count: cell.count,
        weight: cell.sumWeight,
      },
      geometry: {
        type: 'Point',
        coordinates: [cell.sampleLon, cell.sampleLat],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

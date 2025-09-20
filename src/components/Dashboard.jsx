// src/components/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { listenReports } from "../services/reportService.js";
import { aggregateToHeatFeatures, postsToGeoJSON } from "../utils/socialHotspotUtils.js";
import socialMap from "../services/socialMapService.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

const DEFAULT_CENTER = [78.9629, 20.5937];
const DEFAULT_ZOOM = 4.2;

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function Dashboard() {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [socialPosts, setSocialPosts] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const [dateRange, setDateRange] = useState("24h");
  const [hazardFilter, setHazardFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // 🔹 Fetch social posts
  const refreshSocial = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const posts = await socialMap.fetchSocialForMap({ location: "India", maxResults: 70 });
      console.log("📊 Fetched posts:", posts); // Debug log
      setSocialPosts(posts);
    } catch (e) {
      console.error("❌ Social fetch error", e);
      setMapError("Failed to load social data");
    } finally {
      setLoadingSocial(false);
    }
  }, []);

  // 🔹 Fetch data on component mount
  useEffect(() => {
    refreshSocial();
  }, [refreshSocial]);

  // 🔹 Initialize Map
  useEffect(() => {
    if (mapRef.current) return;
    const container = containerRef.current || document.getElementById("map-root");
    if (!container) return;

    const initMap = (style) => {
      const map = new mapboxgl.Map({
        container,
        style,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        console.log("✅ Map loaded!");
        setMapLoaded(true);
        map.resize();
      });

      map.on("error", (e) => {
        console.error("❌ Map error:", e);
        setMapError("Map failed to load");
      });

      mapRef.current = map;
    };

    if (!mapboxgl.accessToken || mapboxgl.accessToken.trim() === "") {
      console.log("🗺️ Using OpenStreetMap (no Mapbox token)");
      initMap(OSM_STYLE);
    } else {
      console.log("🗺️ Using Mapbox");
      initMap("mapbox://styles/mapbox/streets-v11");
    }

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  // 🔹 Filter posts
  const filteredSocial = useMemo(() => {
    const now = Date.now();
    const ranges = { "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
    const cutoff = now - (ranges[dateRange] || ranges["24h"]);
    
    const filtered = socialPosts.filter((p) => {
      const ts = new Date(p.timestamp || p.processedAt || Date.now()).getTime();
      if (ts < cutoff) return false;
      if (hazardFilter !== "all" && (p.hazardLabel || "Other") !== hazardFilter) return false;
      if (sourceFilter !== "all" && (p.platform || "unknown") !== sourceFilter) return false;
      return Number.isFinite(p.lat) && Number.isFinite(p.lon);
    });
    
    console.log(`🔍 Filtered ${filtered.length} posts from ${socialPosts.length} total`);
    return filtered;
  }, [socialPosts, dateRange, hazardFilter, sourceFilter]);

  const pointsGeo = useMemo(() => {
    const geo = postsToGeoJSON(filteredSocial);
    console.log("📍 Points GeoJSON:", geo);
    return geo;
  }, [filteredSocial]);

  // 🔹 Add clustered source & layers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Update existing source or add new one
    if (map.getSource("social-clusters")) {
      map.getSource("social-clusters").setData(pointsGeo);
      console.log("📊 Updated map data with", pointsGeo.features.length, "features");
      return;
    }

    console.log("🎨 Adding map layers with", pointsGeo.features.length, "features");

    // Add source
    map.addSource("social-clusters", {
      type: "geojson",
      data: pointsGeo,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "social-clusters",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "#4299e1", 10, "#faf089", 30, "#ed8936", 50, "#e53e3e"
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          15, 10, 20, 30, 25, 50, 30
        ],
        "circle-opacity": 0.8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff"
      },
    });

    // Cluster count label
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "social-clusters",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { 
        "text-color": "#000",
        "text-halo-color": "#fff",
        "text-halo-width": 1
      },
    });

    // Individual points
    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "social-clusters",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.8,
        "circle-color": [
          "case",
          [">=", ["get", "priorityScore"], 15], "#e53e3e",
          [">=", ["get", "priorityScore"], 10], "#ed8936",
          [">=", ["get", "priorityScore"], 5], "#faf089",
          "#4299e1"
        ],
      },
    });

    // Popup on click for individual points
    map.on("click", "unclustered-point", (e) => {
      const props = e.features[0].properties;
      const [lon, lat] = e.features[0].geometry.coordinates;
      
      new mapboxgl.Popup()
        .setLngLat([lon, lat])
        .setHTML(`
          <div class="p-2">
            <strong>${props.hazardLabel || 'Unknown Hazard'}</strong><br/>
            Priority: ${props.priorityScore || 'N/A'}<br/>
            Platform: ${props.platform || 'Unknown'}<br/>
            Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}<br/>
            ${props.content ? `<div class="mt-2 text-sm text-gray-600">${props.content.substring(0, 100)}...</div>` : ''}
          </div>
        `)
        .addTo(map);
    });

    // Zoom into cluster when clicked
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource("social-clusters").getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      });
    });

    // Cursor styling
    map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
    map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });

  }, [mapLoaded, pointsGeo]);

  // Get unique hazard types for filter
  const hazardTypes = useMemo(() => {
    const types = [...new Set(socialPosts.map(p => p.hazardLabel || 'Other'))];
    return types.sort();
  }, [socialPosts]);

  // Get unique platforms for filter
  const platforms = useMemo(() => {
    const plats = [...new Set(socialPosts.map(p => p.platform || 'unknown'))];
    return plats.sort();
  }, [socialPosts]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📊</span>
                </div>
                Social Hotspots Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Real-time hazard monitoring and social media analysis</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {filteredSocial.length} active hotspots
                  </span>
                </div>
              </div>
              
              <button
                onClick={refreshSocial}
                disabled={loadingSocial}
                className="btn btn-primary btn-md flex items-center gap-2"
              >
                {loadingSocial ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Filters Section */}
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="select w-32"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {hazardTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Hazard Type:</label>
                <select 
                  value={hazardFilter} 
                  onChange={(e) => setHazardFilter(e.target.value)}
                  className="select w-40"
                >
                  <option value="all">All Types</option>
                  {hazardTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            {platforms.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Source:</label>
                <select 
                  value={sourceFilter} 
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="select w-32"
                >
                  <option value="all">All Sources</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Map Container */}
        <div
          id="map-root"
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: "600px" }}
        />

        {/* Status Indicators */}
        <div className="absolute top-4 left-4 z-10 space-y-2">
          {!mapLoaded && (
            <div className="alert alert-info flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>🗺️ Map is loading...</span>
            </div>
          )}
          
          {loadingSocial && (
            <div className="alert alert-info flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>📡 Loading social data...</span>
            </div>
          )}
        </div>

        {mapError && (
          <div className="absolute top-4 right-4 z-10">
            <div className="alert alert-danger max-w-sm">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>❌ {mapError}</span>
              </div>
            </div>
          </div>
        )}

        {socialPosts.length === 0 && !loadingSocial && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="alert alert-secondary">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span>📭 No social data available</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="card-header py-3">
              <h3 className="text-sm font-semibold text-gray-900">Priority Legend</h3>
            </div>
            <div className="card-body py-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">High (15+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs text-gray-600">Medium (10-14)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-600">Low (5-9)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Info (0-4)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
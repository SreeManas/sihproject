// src/components/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { listenReports } from "../services/reportService.js";
import { aggregateToHeatFeatures, postsToGeoJSON } from "../utils/socialHotspotUtils.js";
import socialMap from "../services/socialMapService.js";
import EmergencyContacts from "./EmergencyContacts.jsx";
import BotpressChatbot from "./BotpressChatbot.jsx";
import { useT } from "../hooks/useT.js";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

// Helper functions for popup formatting
function getPriorityColorClass(priorityScore) {
  if (priorityScore >= 15) return 'bg-red-100 text-red-800';
  if (priorityScore >= 10) return 'bg-orange-100 text-orange-800';
  if (priorityScore >= 5) return 'bg-purple-100 text-purple-800';
  return 'bg-indigo-100 text-indigo-800';
}

function getSentimentColorClass(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'text-green-600 font-medium';
    case 'negative': return 'text-red-600 font-medium';
    default: return 'text-gray-600';
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

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

  // Translation hooks
  const tDashboard = useT("INCOIS SAMACHAR Dashboard");
  const tRealTimeMonitoring = useT("Real-time coastal hazard monitoring system");
  const tActiveHotspots = useT("active hotspots");
  const tLoading = useT("Loading...");
  const tRefreshData = useT("Refresh Data");
  const tTimeRange = useT("Time Range:");
  const tLastHour = useT("Last Hour");
  const tLast6Hours = useT("Last 6 Hours");
  const tLast24Hours = useT("Last 24 Hours");
  const tLast7Days = useT("Last 7 Days");
  const tLast30Days = useT("Last 30 Days");
  const tHazardType = useT("Hazard Type:");
  const tAllTypes = useT("All Types");
  const tSource = useT("Source:");
  const tAllSources = useT("All Sources");
  const tMapLoading = useT("🗺️ Map is loading...");
  const tLoadingSocialData = useT("📡 Loading social data...");
  const tPriorityLegend = useT("Priority Legend");
  const tCritical = useT("Critical (15+)");
  const tHigh = useT("High (10-14)");
  const tMedium = useT("Medium (5-9)");
  const tLow = useT("Low (0-4)");
  const tInfo = useT("Info (0-4)");
  const tSystemStatus = useT("📊 System Status");
  const tActiveReports = useT("Active Reports:");
  const tDataSources = useT("Data Sources:");
  const tLastUpdate = useT("Last Update:");
  const tJustNow = useT("Just now");
  const tNoSocialDataAvailable = useT("📭 No social data available");
  const tActive = useT("Active");

  // 🔹 Fetch social posts
  const refreshSocial = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const posts = await socialMap.fetchSocialForMap({ location: "India", maxResults: 70 });
      // Posts fetched successfully
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
        // Map loaded successfully
        setMapLoaded(true);
        map.resize();
      });

      map.on("error", (e) => {
        // Map error occurred
        setMapError("Map failed to load");
      });

      mapRef.current = map;
    };

    if (!mapboxgl.accessToken || mapboxgl.accessToken.trim() === "") {
      // Using OpenStreetMap (no Mapbox token)
      initMap(OSM_STYLE);
    } else {
      // Using Mapbox
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
    
    // Filtered posts for display
    return filtered;
  }, [socialPosts, dateRange, hazardFilter, sourceFilter]);

  const pointsGeo = useMemo(() => {
    const geo = postsToGeoJSON(filteredSocial);
    // GeoJSON points created
    return geo;
  }, [filteredSocial]);

  // 🔹 Add clustered source & layers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Update existing source or add new one
    if (map.getSource("social-clusters")) {
      map.getSource("social-clusters").setData(pointsGeo);
      // Map data updated
      return;
    }

    // Adding map layers

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
          "#4F46E5", 10, "#8B5CF6", 30, "#F97316", 50, "#DC2626"
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
          [">=", ["get", "priorityScore"], 15], "#DC2626",
          [">=", ["get", "priorityScore"], 10], "#F97316",
          [">=", ["get", "priorityScore"], 5], "#8B5CF6",
          "#4F46E5"
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
          <div class="p-3 max-w-xs">
            <!-- Header with hazard type and priority -->
            <div class="flex items-center justify-between mb-2">
              <strong class="text-lg font-semibold">${props.hazardLabel || 'Unknown Hazard'}</strong>
              <span class="px-2 py-1 text-xs font-medium rounded-full ${getPriorityColorClass(props.priorityScore)}">
                Priority: ${props.priorityScore || 'N/A'}
              </span>
            </div>
            
            <!-- Platform and author -->
            <div class="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <span class="font-medium">${props.platform || 'Unknown'}</span>
              ${props.author ? `<span>• by ${props.author}</span>` : ''}
            </div>
            
            <!-- Location with coordinates -->
            <div class="mb-2 text-sm">
              <span class="font-medium">Location:</span> ${lat.toFixed(4)}, ${lon.toFixed(4)}
            </div>
            
            <!-- Timestamp -->
            ${props.timestamp ? `<div class="mb-2 text-sm text-gray-500">
              <span class="font-medium">Posted:</span> ${formatTimestamp(props.timestamp)}
            </div>` : ''}
            
            <!-- Sentiment and confidence -->
            <div class="flex gap-4 mb-2 text-sm">
              ${props.sentiment ? `<div>
                <span class="font-medium">Sentiment:</span> 
                <span class="${getSentimentColorClass(props.sentiment)}">${props.sentiment}</span>
              </div>` : ''}
              ${props.confidence ? `<div>
                <span class="font-medium">Confidence:</span> ${(props.confidence * 100).toFixed(0)}%
              </div>` : ''}
            </div>
            
            <!-- Engagement metrics -->
            ${props.engagement ? `<div class="mb-2 text-sm">
              <span class="font-medium">Engagement:</span> 
              ${props.engagement.likes || 0} likes, ${props.engagement.shares || 0} shares
            </div>` : ''}
            
            <!-- Keywords -->
            ${props.keywords && props.keywords.length > 0 ? `<div class="mb-2 text-sm">
              <span class="font-medium">Keywords:</span> 
              <span class="text-blue-600">${props.keywords.slice(0, 5).join(', ')}</span>
            </div>` : ''}
            
            <!-- Content preview -->
            ${props.content ? `<div class="mt-2 p-2 bg-gray-50 rounded text-sm">
              <span class="font-medium">Content:</span><br/>
              ${props.content.substring(0, 150)}${props.content.length > 150 ? '...' : ''}
            </div>` : ''}
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
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-white via-white to-blue-50 shadow-xl border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    <span className="text-white font-bold text-lg">IS</span>
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{tDashboard}</h1>
                    <p className="text-gray-600 text-lg">{tRealTimeMonitoring}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-sm font-semibold text-blue-800">Live</span>
                  </div>
                  <div className="h-6 w-px bg-blue-300"></div>
                  <div className="text-sm font-medium text-blue-700">
                    <span className="font-bold text-blue-900">{filteredSocial.length}</span> {tActiveHotspots}
                  </div>
                </div>
                
                <button
                  onClick={refreshSocial}
                  disabled={loadingSocial}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loadingSocial ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {tLoading}
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {tRefreshData}
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="mt-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {tTimeRange}
                      </label>
                      <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <option value="1h">{tLastHour}</option>
                        <option value="6h">{tLast6Hours}</option>
                        <option value="24h">{tLast24Hours}</option>
                        <option value="7d">{tLast7Days}</option>
                        <option value="30d">{tLast30Days}</option>
                      </select>
                    </div>

                    {hazardTypes.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {tHazardType}
                        </label>
                        <select 
                          value={hazardFilter} 
                          onChange={(e) => setHazardFilter(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <option value="all">{tAllTypes}</option>
                          {hazardTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {platforms.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                          </svg>
                          {tSource}
                        </label>
                        <select 
                          value={sourceFilter} 
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <option value="all">{tAllSources}</option>
                          {platforms.map(platform => (
                            <option key={platform} value={platform}>{platform}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative flex bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Map Container */}
          <div className="flex-1 relative">
            <div
              id="map-root"
              ref={containerRef}
              className="w-full h-full rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
              style={{ minHeight: "700px" }}
            />
            
            {/* Status Indicators */}
            <div className="absolute top-6 left-6 z-10 space-y-3">
              {!mapLoaded && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{tMapLoading}</span>
                </div>
              )}
              
              {loadingSocial && (
                <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{tLoadingSocialData}</span>
                </div>
              )}
            </div>

            {mapError && (
              <div className="absolute top-6 right-6 z-10">
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg max-w-sm">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">❌ {mapError}</span>
                  </div>
                </div>
              </div>
            )}

            {socialPosts.length === 0 && !loadingSocial && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 px-6 py-4 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="font-medium">{tNoSocialDataAvailable}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 right-6 z-10">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {tPriorityLegend}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">{tCritical}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">{tHigh}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-purple-600 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">{tMedium}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-indigo-600 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">{tLow}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 overflow-y-auto m-4">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Emergency Contacts
              </h3>
              <EmergencyContacts />
            </div>
            
            {/* System Status */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {tSystemStatus}
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">{tActiveReports}</span>
                  <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-md">{filteredSocial.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">{tDataSources}</span>
                  <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-md">4 {tActive}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">{tLastUpdate}</span>
                  <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded-md">{tJustNow}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Botpress Chatbot - Only visible to logged-in citizens */}
      <BotpressChatbot />
    </>
  );
}
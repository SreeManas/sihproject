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
    <div className="h-screen flex flex-col">
      {/* Header with controls */}
      <div className="p-3 bg-white border-b flex items-center gap-3 z-10 shadow-sm">
        <div className="font-semibold text-blue-700">
          Social Hotspots Dashboard
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">
            {filteredSocial.length} hotspots
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="flex items-center gap-1">
            <label className="text-sm text-gray-600">Time:</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Hazard Filter */}
          {hazardTypes.length > 0 && (
            <div className="flex items-center gap-1">
              <label className="text-sm text-gray-600">Hazard:</label>
              <select 
                value={hazardFilter} 
                onChange={(e) => setHazardFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Types</option>
                {hazardTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Source Filter */}
          {platforms.length > 0 && (
            <div className="flex items-center gap-1">
              <label className="text-sm text-gray-600">Source:</label>
              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Sources</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={refreshSocial}
            disabled={loadingSocial}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingSocial ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        id="map-root"
        ref={containerRef}
        className="flex-1 w-full relative"
        style={{ minHeight: "500px", border: "1px solid #e5e7eb" }}
      />

      {/* Status indicators */}
      {!mapLoaded && (
        <div className="absolute bottom-4 left-4 bg-yellow-100 border border-yellow-300 p-3 rounded text-sm">
          🗺️ Map is loading...
        </div>
      )}
      
      {mapError && (
        <div className="absolute bottom-4 right-4 bg-red-100 border border-red-300 p-3 rounded text-sm max-w-xs">
          ❌ {mapError}
        </div>
      )}
      
      {loadingSocial && (
        <div className="absolute top-20 right-4 bg-white border p-3 shadow rounded text-sm">
          📡 Loading social data...
        </div>
      )}

      {socialPosts.length === 0 && !loadingSocial && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-100 border p-3 rounded text-sm">
          📭 No social data available
        </div>
      )}
    </div>
  );
}
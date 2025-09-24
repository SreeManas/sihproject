import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapPin, Users, AlertTriangle, TrendingUp, Filter, Layers, Search, Download, RefreshCw, Eye, MessageSquare } from 'lucide-react';
import { useT } from '../hooks/useT.js';
import socialMap from '../services/socialMapService.js';

const InteractiveDashboardMap = ({ citizenReports = [], socialMediaPosts = [], onReportSelect }) => {
  // InteractiveDashboardMap component mounted
  const [socialPosts, setSocialPosts] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  
  const [selectedFilters, setSelectedFilters] = useState({
    hazardTypes: ['all'],
    timeRange: '24h',
    sources: ['citizens', 'social'],
    severity: ['all'],
    verificationStatus: ['all']
  });

  // Translation hooks
  const tINCOISDashboard = useT("INCOIS Dashboard");
  const tRealTimeOceanHazardMonitoring = useT("Real-time Ocean Hazard Monitoring");
  const tLiveStatistics = useT("Live Statistics");
  const tTotalReports = useT("Total Reports");
  const tCitizenReports = useT("Citizen Reports");
  const tSocialMedia = useT("Social Media");
  const tCriticalAlerts = useT("Critical Alerts");
  const tTimeRange = useT("Time Range");
  const tLastHour = useT("Last Hour");
  const tLast6Hours = useT("Last 6 Hours");
  const tLast24Hours = useT("Last 24 Hours");
  const tLast7Days = useT("Last 7 Days");
  const tLast30Days = useT("Last 30 Days");
  const tAllTime = useT("All Time");
  const tHazardTypes = useT("Hazard Types");
  const tDataSources = useT("Data Sources");
  const tCitizenReportsLabel = useT("Citizen Reports");
  const tSocialMediaLabel = useT("Social Media");
  const tSeverity = useT("Severity");
  const tCritical = useT("critical");
  const tHigh = useT("high");
  const tMedium = useT("medium");
  const tLow = useT("low");
  const tMapView = useT("Map View");
  const tSatellite = useT("Satellite");
  const tStreet = useT("Street");
  const tTerrain = useT("Terrain");
  const tShowHeatmap = useT("Show Heatmap");
  const tExportData = useT("Export Data");
  const tRefreshDashboard = useT("Refresh Dashboard");
  const tInteractiveHazardMap = useT("Interactive Hazard Map");
  const tActiveHotspots = useT("active hotspots");
  const tReportsInView = useT("reports in view");
  const tLastUpdated = useT("Last updated:");
  const tMapLegend = useT("Map Legend");
  const tCriticalHotspot = useT("Critical Hotspot (15+ severity)");
  const tHighPriorityHotspot = useT("High Priority Hotspot (10+ severity)");
  const tCitizenReportLegend = useT("Citizen Report");
  const tSocialMediaPostLegend = useT("Social Media Post");
  const tHeatmapActive = useT("Heatmap Active");
  const tHotspotDetails = useT("Hotspot Details");
  const tLocationInformation = useT("Location Information");
  const tDetailedInformationAboutSelectedHotspot = useT("Detailed information about the selected hotspot would appear here.");

  // Data fetching
  const refreshSocial = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const posts = await socialMap.fetchSocialForMap({ location: "India", maxResults: 70 });
      // Posts fetched in InteractiveDashboardMap
      setSocialPosts(posts);
    } catch (e) {
      // Social fetch error in InteractiveDashboardMap
    } finally {
      setLoadingSocial(false);
    }
  }, []);

  useEffect(() => {
    refreshSocial();
  }, [refreshSocial]);

  const [mapView, setMapView] = useState('satellite'); // satellite, street, terrain
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState({});
  const mapRef = useRef(null);

  // Indian coastal regions with coordinates
  const coastalRegions = {
    'West Coast': {
      'Gujarat': { lat: 22.2587, lng: 71.1924, reports: 0, priority: 0 },
      'Maharashtra': { lat: 19.7515, lng: 75.7139, reports: 0, priority: 0 },
      'Goa': { lat: 15.2993, lng: 74.1240, reports: 0, priority: 0 },
      'Karnataka': { lat: 15.3173, lng: 75.7139, reports: 0, priority: 0 },
      'Kerala': { lat: 10.8505, lng: 76.2711, reports: 0, priority: 0 }
    },
    'East Coast': {
      'West Bengal': { lat: 22.9868, lng: 87.8550, reports: 0, priority: 0 },
      'Odisha': { lat: 20.9517, lng: 85.0985, reports: 0, priority: 0 },
      'Andhra Pradesh': { lat: 15.9129, lng: 79.7400, reports: 0, priority: 0 },
      'Tamil Nadu': { lat: 11.1271, lng: 78.6569, reports: 0, priority: 0 },
      'Puducherry': { lat: 11.9416, lng: 79.8083, reports: 0, priority: 0 }
    },
    'Islands': {
      'Lakshadweep': { lat: 10.0000, lng: 72.0000, reports: 0, priority: 0 },
      'Andaman & Nicobar': { lat: 11.7401, lng: 92.6586, reports: 0, priority: 0 }
    }
  };

  // Process and filter data
  const filteredData = useMemo(() => {
    const allData = [
      ...citizenReports.map(report => ({ ...report, source: 'citizen' })),
      ...socialPosts.map(post => ({ ...post, source: 'social' }))
    ];

    // Data prepared for filtering
    if (allData.length > 0) {
      // Sample data available
      // Data keys available
    }
    return allData.filter(item => {
      // Time range filter
      const itemTime = new Date(item.timestamp || item.processedAt);
      const now = new Date();
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      if (selectedFilters.timeRange !== 'all' && 
          now - itemTime > timeRanges[selectedFilters.timeRange]) {
        return false;
      }

      // Hazard type filter
      if (!selectedFilters.hazardTypes.includes('all') && 
          !selectedFilters.hazardTypes.includes(item.hazardType || item.hazardLabel || 'Other')) {
        return false;
      }

      // Source filter
      if (!selectedFilters.sources.includes(item.source)) {
        return false;
      }

      // Severity filter - map priorityScore to severity
      const severity = item.priorityScore >= 15 ? 'critical' : 
                      item.priorityScore >= 10 ? 'high' : 
                      item.priorityScore >= 5 ? 'medium' : 'low';
      if (!selectedFilters.severity.includes('all') && 
          !selectedFilters.severity.includes(severity)) {
        return false;
      }

      return true;
    });
  }, [citizenReports, socialPosts, selectedFilters]);

  // Generate hotspots based on data clustering
  useEffect(() => {
    const generateHotspots = () => {
      const locationClusters = {};
      
      filteredData.forEach(item => {
        let location = null;
        
        if (item.source === 'citizen' && item.location) {
          location = {
            lat: item.location.lat,
            lng: item.location.lng,
            name: item.location.address || 'Unknown Location'
          };
        } else if (item.source === 'social' && item.entities) {
          const locationEntity = item.entities.find(e => e.type === 'LOC');
          if (locationEntity) {
            // Mock coordinates for demo - in real app, use geocoding service
            location = {
              lat: 20.5937 + (Math.random() - 0.5) * 10,
              lng: 78.9629 + (Math.random() - 0.5) * 20,
              name: locationEntity.text
            };
          }
        }

        if (location) {
          const key = `${Math.round(location.lat * 10) / 10},${Math.round(location.lng * 10) / 10}`;
          
          if (!locationClusters[key]) {
            locationClusters[key] = {
              ...location,
              items: [],
              severity: 0,
              hazardTypes: new Set()
            };
          }
          
          // Add severity field to item based on priorityScore
          item.severity = item.priorityScore >= 15 ? 'critical' : 
                         item.priorityScore >= 10 ? 'high' : 
                         item.priorityScore >= 5 ? 'medium' : 'low';
          
          locationClusters[key].items.push(item);
          // Use actual priorityScore if available, otherwise map severity to score
          const priorityScore = item.priorityScore || (
            item.severity === 'critical' ? 15 :
            item.severity === 'high' ? 10 :
            item.severity === 'medium' ? 7 :
            item.severity === 'low' ? 3 : 5
          );
          locationClusters[key].severity += priorityScore;
          locationClusters[key].hazardTypes.add(item.hazardType || item.hazardLabel || 'Other');
        }
      });

      const newHotspots = Object.values(locationClusters)
        .filter(cluster => cluster.items.length >= 1) // Minimum 1 report for hotspot
        .map(cluster => ({
          ...cluster,
          id: `hotspot_${cluster.lat}_${cluster.lng}`,
          count: cluster.items.length,
          avgSeverity: cluster.severity / cluster.items.length,
          hazardTypes: Array.from(cluster.hazardTypes)
        }))
        .sort((a, b) => b.avgSeverity - a.avgSeverity);

      // Hotspots generated
      // Hotspot colors calculated
      setHotspots(newHotspots);
    };

    generateHotspots();
  }, [filteredData]);

  // Calculate real-time statistics
  useEffect(() => {
    const stats = {
      totalReports: filteredData.length,
      citizenReports: filteredData.filter(d => d.source === 'citizen').length,
      socialMediaPosts: filteredData.filter(d => d.source === 'social').length,
      criticalAlerts: filteredData.filter(d => (d.priorityScore || 0) >= 15 || d.severity === 'critical').length,
      activeHotspots: hotspots.length,
      avgResponseTime: '4.2 min', // Mock data
      verifiedIncidents: filteredData.filter(d => d.verified).length
    };

    setRealTimeStats(stats);
  }, [filteredData, hotspots]);

  const getHotspotColor = (avgSeverity, count) => {
    if (avgSeverity >= 15) return { color: '#DC2626', intensity: Math.min(count / 10, 1) };
    if (avgSeverity >= 10) return { color: '#EA580C', intensity: Math.min(count / 10, 1) };
    if (avgSeverity >= 5) return { color: '#8B5CF6', intensity: Math.min(count / 10, 1) };
    return { color: '#4F46E5', intensity: Math.min(count / 10, 1) };
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'hazardTypes' || filterType === 'sources' || filterType === 'severity' || filterType === 'verificationStatus') {
        if (value === 'all') {
          newFilters[filterType] = ['all'];
        } else {
          const currentValues = newFilters[filterType].filter(v => v !== 'all');
          if (currentValues.includes(value)) {
            newFilters[filterType] = currentValues.filter(v => v !== value);
            if (newFilters[filterType].length === 0) {
              newFilters[filterType] = ['all'];
            }
          } else {
            newFilters[filterType] = [...currentValues, value];
          }
        }
      } else {
        newFilters[filterType] = value;
      }
      
      return newFilters;
    });
  };

  const exportData = () => {
    const exportData = {
      summary: realTimeStats,
      hotspots,
      filteredReports: filteredData,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incois_dashboard_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar with Controls and Stats */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-bold">{tINCOISDashboard}</h2>
          <p className="text-blue-100 text-sm">{tRealTimeOceanHazardMonitoring}</p>
        </div>

        {/* Real-time Stats */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">{tLiveStatistics}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{realTimeStats.totalReports}</div>
              <div className="text-xs text-blue-600">{tTotalReports}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{realTimeStats.citizenReports}</div>
              <div className="text-xs text-green-600">{tCitizenReports}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{realTimeStats.socialMediaPosts}</div>
              <div className="text-xs text-purple-600">{tSocialMedia}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{realTimeStats.criticalAlerts}</div>
              <div className="text-xs text-red-600">{tCriticalAlerts}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tTimeRange}</label>
            <select
              value={selectedFilters.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="1h">{tLastHour}</option>
              <option value="6h">{tLast6Hours}</option>
              <option value="24h">{tLast24Hours}</option>
              <option value="7d">{tLast7Days}</option>
              <option value="30d">{tLast30Days}</option>
              <option value="all">{tAllTime}</option>
            </select>
          </div>

          {/* Hazard Types Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tHazardTypes}</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {['all', 'tsunami', 'storm_surge', 'high_waves', 'swell_surge', 'coastal_flooding', 'abnormal_tide'].map(type => (
                <label key={type} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFilters.hazardTypes.includes(type)}
                    onChange={() => handleFilterChange('hazardTypes', type)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className="ml-2 capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tDataSources}</label>
            <div className="space-y-2">
              {[
                { key: 'citizens', label: tCitizenReportsLabel, icon: '👥' },
                { key: 'social', label: tSocialMediaLabel, icon: '📱' }
              ].map(source => (
                <label key={source.key} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFilters.sources.includes(source.key)}
                    onChange={() => handleFilterChange('sources', source.key)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className="ml-2">{source.icon} {source.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tSeverity}</label>
            <div className="space-y-2">
              {['all', tCritical, tHigh, tMedium, tLow].map(severity => (
                <label key={severity} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFilters.severity.includes(severity)}
                    onChange={() => handleFilterChange('severity', severity)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className={`ml-2 capitalize ${
                    severity === tCritical ? 'text-red-600 font-medium' :
                    severity === tHigh ? 'text-orange-600 font-medium' :
                    severity === tMedium ? 'text-purple-600' : 'text-indigo-600'
                  }`}>
                    {severity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Map Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{tMapView}</label>
            <select
              value={mapView}
              onChange={(e) => setMapView(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm mb-2"
            >
              <option value="satellite">{tSatellite}</option>
              <option value="street">{tStreet}</option>
              <option value="terrain">{tTerrain}</option>
            </select>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm"
              />
              <span className="ml-2">{tShowHeatmap}</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            <button
              onClick={exportData}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {tExportData}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tRefreshDashboard}
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        {/* Map Header */}
        <div className="absolute top-4 left-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {tInteractiveHazardMap}
              </h3>
              <p className="text-sm text-gray-600">
                {hotspots.length} {tActiveHotspots} • {filteredData.length} {tReportsInView}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{tLastUpdated}</span>
              <span className="text-sm font-medium">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Mock Map Container */}
        <div className="w-full h-full bg-gradient-to-b from-blue-400 to-blue-600 relative overflow-hidden">
          {/* India Map Outline (simplified) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Map placeholder with hotspots */}
              <div className="w-96 h-96 bg-gray-200 rounded-lg relative shadow-lg">
                <div className="absolute inset-2 bg-gray-100 rounded">
                  {/* Render Hotspots */}
                  {hotspots.slice(0, 10).map((hotspot, index) => {
                    const { color, intensity } = getHotspotColor(hotspot.avgSeverity, hotspot.count);
                    return (
                      <div
                        key={hotspot.id}
                        className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                        style={{
                          left: `${20 + (index % 5) * 18}%`,
                          top: `${15 + Math.floor(index / 5) * 20}%`,
                        }}
                        onClick={() => onReportSelect && onReportSelect(hotspot)}
                      >
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: color,
                            opacity: 0.6 + (intensity * 0.4)
                          }}
                        >
                          <span className="text-white text-xs font-bold">
                            {hotspot.count}
                          </span>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                          {hotspot.name}<br/>
                          {hotspot.count} reports<br/>
                          Severity: {hotspot.avgSeverity.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Individual Reports */}
                  {filteredData.slice(0, 20).map((report, index) => (
                    <div
                      key={report.id || index}
                      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${30 + (index % 8) * 8}%`,
                        top: `${25 + Math.floor(index / 8) * 15}%`,
                      }}
                      onClick={() => onReportSelect && onReportSelect(report)}
                    >
                      <div className={`w-3 h-3 rounded-full border border-white ${
                        report.source === 'citizen' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
            <h4 className="font-semibold text-gray-900 mb-3">{tMapLegend}</h4>
            <div className="space-y-2">
              {/* Hotspot Severity Colors */}
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Hotspot Severity</div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full mr-2 flex items-center justify-center" style={{ backgroundColor: '#DC2626' }}>
                  <span className="text-white text-xs font-bold">15+</span>
                </div>
                <span>Critical (15+ severity)</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full mr-2 flex items-center justify-center" style={{ backgroundColor: '#EA580C' }}>
                  <span className="text-white text-xs font-bold">10+</span>
                </div>
                <span>High (10-14 severity)</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full mr-2 flex items-center justify-center" style={{ backgroundColor: '#8B5CF6' }}>
                  <span className="text-white text-xs font-bold">5+</span>
                </div>
                <span>Medium (5-9 severity)</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full mr-2 flex items-center justify-center" style={{ backgroundColor: '#4F46E5' }}>
                  <span className="text-white text-xs font-bold">&lt;5</span>
                </div>
                <span>Low (&lt;5 severity)</span>
              </div>
              
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Report Types</div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span>{tCitizenReportLegend}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span>{tSocialMediaPostLegend}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap Toggle Indicator */}
          {showHeatmap && (
            <div className="absolute top-20 right-4 bg-orange-100 border border-orange-300 rounded-lg p-2 text-sm">
              🔥 {tHeatmapActive}
            </div>
          )}
        </div>
      </div>

      {/* Hotspot Details Panel */}
      {selectedRegion && (
        <div className="absolute right-4 top-20 bottom-4 w-80 bg-white rounded-lg shadow-lg z-20 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{tHotspotDetails}</h3>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto">
            {/* Hotspot details would be rendered here */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{tLocationInformation}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {tDetailedInformationAboutSelectedHotspot}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveDashboardMap;
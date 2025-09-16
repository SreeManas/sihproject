// src/components/AnalyticsDashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import alertService from '../utils/alertService.js';
import { useAuth } from './auth/AuthProvider.jsx';
import { Link } from 'react-router-dom';
import socialMap from '../services/socialMapService.js';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, AlertCircle, Users, Clock } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboard({ posts = [], realTimeData = [], filters = {} }) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(12);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [localPosts, setLocalPosts] = useState([]);
  const { role } = useAuth();

  // Fallback: if no posts prop provided, fetch processed mock/proxy social posts
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!posts || posts.length === 0) {
          const data = await socialMap.fetchSocialForMap({ location: 'India', maxResults: 120 });
          if (mounted) setLocalPosts(data);
        } else {
          setLocalPosts(posts);
        }
      } catch (e) {
        console.error('Analytics fallback fetch failed', e);
      }
    }
    load();
    return () => { mounted = false; };
  }, [posts]);

  const effectivePosts = posts && posts.length ? posts : localPosts;
  const analytics = useMemo(() => buildAnalytics(effectivePosts, selectedTimeRange), [effectivePosts, selectedTimeRange]);

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hazard Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analysis of hazard-related social media activity</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-md font-medium ${autoRefresh ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'} border`}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Posts" value={analytics.totalPosts.toLocaleString()} icon={Activity} color="blue" />
        <MetricCard title="Avg Priority Score" value={analytics.avgPriorityScore.toFixed(1)} icon={AlertCircle} color="red" />
        <MetricCard title="Total Engagement" value={analytics.totalEngagement.toLocaleString()} icon={Users} color="green" />
        <MetricCard title="Response Time" value="3.2 min" icon={Clock} color="purple" />
      </div>

      {/* Alert Threshold & Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Alert Threshold</h3>
            <p className="text-sm text-gray-600">Trigger alerts automatically for items with priority ≥ threshold</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Threshold:</span>
              <span className="font-medium">{alertThreshold}</span>
            </div>
            <input type="range" min="5" max="20" value={alertThreshold} onChange={(e)=>setAlertThreshold(Number(e.target.value))} />
            <button
              onClick={async ()=>{
                // Trigger alerts for top N visible posts over threshold
                const candidates = effectivePosts.filter(p => (p.priorityScore || 0) >= alertThreshold).slice(0, 10);
                for (const c of candidates) {
                  try { await alertService.triggerAlert(c, { threshold: alertThreshold }); } catch {}
                }
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >Trigger Alerts Now</button>
            {(role === 'analyst' || role === 'official') && (
              <Link to="/alerts" className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">View Alerts</Link>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Hazard Detection Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Posts" />
              <Area type="monotone" dataKey="Tsunami" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              <Area type="monotone" dataKey="Cyclone" stackId="1" stroke="#ffc658" fill="#ffc658" />
              <Area type="monotone" dataKey="Flood" stackId="1" stroke="#ff7300" fill="#ff7300" />
              <Area type="monotone" dataKey="Earthquake" stackId="1" stroke="#a78bfa" fill="#a78bfa" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.platformAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Posts" />
              <Bar dataKey="avgEngagement" fill="#82ca9d" name="Avg Engagement" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hazard Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Hazard Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.hazardFrequency).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(analytics.hazardFrequency).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.sentimentAnalysis).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {Object.entries(analytics.sentimentAnalysis).map((entry, index) => (
                  <Cell key={`cell-s-${index}`} fill={
                    entry[0] === 'POSITIVE' ? '#10B981' : entry[0] === 'NEGATIVE' ? '#EF4444' : '#6B7280'
                  } />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Location Table and High Priority List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Location Analysis Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top Hazard</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.locationAnalysis.slice(0, 10).map((location, index) => {
                  const topHazard = Object.entries(location.hazards).sort(([, a], [, b]) => b - a)[0];
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.avgPriority.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{topHazard ? `${topHazard[0]} (${topHazard[1]})` : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Priority Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent High Priority Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {effectivePosts
                .filter((post) => (post.priorityScore || 0) >= alertThreshold)
                .sort((a, b) => new Date(b.timestamp || b.processedAt) - new Date(a.timestamp || a.processedAt))
                .slice(0, 5)
                .map((post, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {post.hazardLabel} - Priority {post.priorityScore?.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{post.text?.substring(0, 100)}...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(post.timestamp || post.processedAt).toLocaleString()} • {post.platform}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={()=> setAcknowledgedIds(prev => new Set(prev).add(post.id || String(index)))}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                      >{acknowledgedIds.has(post.id || String(index)) ? 'Acknowledged' : 'Acknowledge'}</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Real-time Activity Feed</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {realTimeData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    item.type === 'detection' ? 'bg-blue-400' : item.type === 'alert' ? 'bg-red-400' : item.type === 'update' ? 'bg-yellow-400' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-900">{item.message}</span>
                  <span className="text-gray-500 ml-2">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Export & Reports</h3>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => exportData('csv', analytics, posts, selectedTimeRange)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Export as CSV</button>
          <button onClick={() => exportData('json', analytics, posts, selectedTimeRange)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Export as JSON</button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color = 'blue' }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );
}

function buildAnalytics(posts, selectedTimeRange) {
  const now = new Date();
  const timeRanges = {
    '1h': 1 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const cutoffTime = now.getTime() - (timeRanges[selectedTimeRange] || timeRanges['24h']);
  const filteredPosts = posts.filter((post) => new Date(post.timestamp || post.processedAt).getTime() > cutoffTime);

  // Hazard frequency
  const hazardFrequency = filteredPosts.reduce((acc, post) => {
    const hazard = post.hazardLabel || 'Other';
    acc[hazard] = (acc[hazard] || 0) + 1;
    return acc;
  }, {});

  // Location analysis
  const locationMap = filteredPosts.reduce((acc, post) => {
    const locs = post.entities?.filter((e) => e.type === 'LOC') || [];
    for (const loc of locs) {
      if (!acc[loc.text]) {
        acc[loc.text] = { name: loc.text, count: 0, hazards: {}, totalPriority: 0, avgPriority: 0 };
      }
      acc[loc.text].count += 1;
      acc[loc.text].hazards[post.hazardLabel] = (acc[loc.text].hazards[post.hazardLabel] || 0) + 1;
      acc[loc.text].totalPriority += post.priorityScore || 0;
      acc[loc.text].avgPriority = acc[loc.text].totalPriority / acc[loc.text].count;
    }
    return acc;
  }, {});

  // Time series
  const timeSeriesData = buildTimeSeries(filteredPosts, selectedTimeRange);

  // Platform analysis
  const platMap = filteredPosts.reduce((acc, post) => {
    const p = post.platform || 'unknown';
    if (!acc[p]) acc[p] = { name: p, count: 0, totalEngagement: 0, avgPriority: 0 };
    acc[p].count += 1;
    acc[p].totalEngagement += (post.engagement?.likes || 0) + (post.engagement?.shares || 0);
    acc[p].avgPriority += post.priorityScore || 0;
    return acc;
  }, {});
  const platformAnalysis = Object.values(platMap).map((p) => ({ ...p, avgEngagement: p.totalEngagement / p.count, avgPriority: p.avgPriority / p.count }));

  // Sentiment
  const sentimentAnalysis = filteredPosts.reduce((acc, post) => {
    const s = post.sentiment || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return {
    hazardFrequency,
    locationAnalysis: Object.values(locationMap),
    timeSeriesData,
    platformAnalysis,
    sentimentAnalysis,
    responseTimeAnalysis: [],
    trendingTopics: [],
    totalPosts: filteredPosts.length,
    avgPriorityScore: filteredPosts.reduce((sum, p) => sum + (p.priorityScore || 0), 0) / (filteredPosts.length || 1),
    totalEngagement: filteredPosts.reduce((sum, p) => sum + ((p.engagement?.likes || 0) + (p.engagement?.shares || 0)), 0),
  };
}

function buildTimeSeries(posts, timeRange) {
  const now = new Date();
  const intervals = {
    '1h': { count: 12, duration: 5 * 60 * 1000 },
    '6h': { count: 24, duration: 15 * 60 * 1000 },
    '24h': { count: 24, duration: 60 * 60 * 1000 },
    '7d': { count: 7, duration: 24 * 60 * 60 * 1000 },
    '30d': { count: 30, duration: 24 * 60 * 60 * 1000 },
  };
  const interval = intervals[timeRange] || intervals['24h'];
  const data = [];
  for (let i = interval.count - 1; i >= 0; i--) {
    const endTime = now.getTime() - i * interval.duration;
    const startTime = endTime - interval.duration;
    const periodPosts = posts.filter((p) => {
      const t = new Date(p.timestamp || p.processedAt).getTime();
      return t >= startTime && t < endTime;
    });
    const hazardCounts = periodPosts.reduce((acc, p) => {
      const h = p.hazardLabel || 'Other';
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
    data.push({
      time: new Date(endTime).toLocaleString('en-US', {
        hour: timeRange === '1h' || timeRange === '6h' ? '2-digit' : undefined,
        minute: timeRange === '1h' || timeRange === '6h' ? '2-digit' : undefined,
        day: timeRange === '7d' || timeRange === '30d' ? '2-digit' : undefined,
        month: timeRange === '7d' || timeRange === '30d' ? 'short' : undefined,
      }),
      total: periodPosts.length,
      ...hazardCounts,
    });
  }
  return data;
}

function exportData(format, analytics, posts, selectedTimeRange) {
  const data = { summary: analytics, posts, timeRange: selectedTimeRange, exportedAt: new Date().toISOString() };
  if (format === 'csv') return exportToCSV(data);
  if (format === 'json') return exportToJSON(data);
}

function exportToCSV(data) {
  const csvContent = [
    ['Timestamp', 'Platform', 'Hazard Type', 'Priority Score', 'Location', 'Sentiment', 'Engagement', 'Text'].join(','),
    ...data.posts.map((post) => [
      post.timestamp || post.processedAt,
      post.platform || '',
      post.hazardLabel || '',
      post.priorityScore || 0,
      (post.entities?.filter((e) => e.type === 'LOC').map((e) => e.text).join(';')) || '',
      post.sentiment || '',
      (post.engagement?.likes || 0) + (post.engagement?.shares || 0),
      `"${(post.text || '').replace(/"/g, '""').substring(0, 100)}"`,
    ].join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hazard_analytics_${data.timeRange}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hazard_analytics_${data.timeRange}_${new Date().toISOString().split('T')[0]}.json`; a.click();
  URL.revokeObjectURL(url);
}

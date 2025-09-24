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
import { useT } from '../hooks/useT.js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboard({ posts = [], realTimeData = [], filters = {} }) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(12);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  const [localPosts, setLocalPosts] = useState([]);
  const { role } = useAuth();
  
  // Translation hooks
  const tHazardAnalyticsDashboard = useT("Hazard Analytics Dashboard");
  const tRealTimeMonitoring = useT("Real-time monitoring and analysis of hazard-related social media activity");
  const tTimeRange = useT("Time Range:");
  const tLastHour = useT("Last Hour");
  const tLast6Hours = useT("Last 6 Hours");
  const tLast24Hours = useT("Last 24 Hours");
  const tLast7Days = useT("Last 7 Days");
  const tLast30Days = useT("Last 30 Days");
  const tAutoRefresh = useT("Auto Refresh:");
  const tOn = useT("ON");
  const tOff = useT("OFF");
  const tTotalPosts = useT("Total Posts");
  const tSocialMediaPostsAnalyzed = useT("Social media posts analyzed");
  const tAvgPriorityScore = useT("Avg Priority Score");
  const tAverageHazardPriority = useT("Average hazard priority");
  const tTotalEngagement = useT("Total Engagement");
  const tLikesAndShares = useT("Likes and shares");
  const tResponseTime = useT("Response Time");
  const tAverageResponseTime = useT("Average response time");
  const tAlertThresholdConfiguration = useT("Alert Threshold Configuration");
  const tTriggerAlertsAutomatically = useT("Trigger alerts automatically for items with priority ≥ threshold");
  const tThreshold = useT("Threshold:");
  const tTriggerAlerts = useT("Trigger Alerts");
  const tViewAlerts = useT("View Alerts");
  const tHazardDetectionOverTime = useT("Hazard Detection Over Time");
  const tRealTimeHazardDetectionTrends = useT("Real-time hazard detection trends");
  const tPlatformPerformance = useT("Platform Performance");
  const tSocialMediaPlatformAnalysis = useT("Social media platform analysis");
  const tHazardTypeDistribution = useT("Hazard Type Distribution");
  const tBreakdownOfHazardTypes = useT("Breakdown of hazard types detected");
  const tSentimentAnalysis = useT("Sentiment Analysis");
  const tPublicSentimentTowardsHazards = useT("Public sentiment towards hazards");
  const tLocationAnalysisDetails = useT("Location Analysis Details");
  const tTopAffectedLocations = useT("Top affected locations and hazard distribution");
  const tLocation = useT("Location");
  const tPosts = useT("Posts");
  const tAvgPriority = useT("Avg Priority");
  const tTopHazard = useT("Top Hazard");
  const tRecentHighPriorityAlerts = useT("Recent High Priority Alerts");
  const tCriticalAlertsRequiringAttention = useT("Critical alerts requiring immediate attention");
  const tUnknownHazard = useT("Unknown Hazard");
  const tPriority = useT("Priority");
  const tAcknowledged = useT("Acknowledged");
  const tNoContentAvailable = useT("No content available");
  const tUnknown = useT("Unknown");
  const tUnacknowledge = useT("Unacknowledge");
  const tAcknowledge = useT("Acknowledge");
  const tNoHighPriorityAlerts = useT("No high priority alerts at this time");
  const tRealTimeActivityFeed = useT("Real-time Activity Feed");
  const tLiveUpdatesFromHazardDetection = useT("Live updates from hazard detection systems");
  const tLive = useT("Live");
  const tNoRecentActivity = useT("No recent activity");
  const tExportReports = useT("Export & Reports");
  const tDownloadAnalyticsData = useT("Download analytics data in various formats");
  const tExportAsCSV = useT("Export as CSV");
  const tExportAsJSON = useT("Export as JSON");
  const tGenerateReport = useT("Generate Report");

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📈</span>
                </div>
                {tHazardAnalyticsDashboard}
              </h1>
              <p className="text-gray-600 mt-2">{tRealTimeMonitoring}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">{tTimeRange}</label>
                <select 
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="select w-36"
                >
                  <option value="1h">{tLastHour}</option>
                  <option value="6h">{tLast6Hours}</option>
                  <option value="24h">{tLast24Hours}</option>
                  <option value="7d">{tLast7Days}</option>
                  <option value="30d">{tLast30Days}</option>
                </select>
              </div>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`btn ${autoRefresh ? 'btn-success' : 'btn-secondary'} btn-md flex items-center gap-2`}
              >
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                {tAutoRefresh} {autoRefresh ? tOn : tOff}
              </button>
            </div>
          </div>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title={tTotalPosts} 
          value={analytics.totalPosts.toLocaleString()} 
          icon={Activity} 
          color="blue" 
          trend="+12%" 
          description={tSocialMediaPostsAnalyzed} 
        />
        <MetricCard 
          title={tAvgPriorityScore} 
          value={analytics.avgPriorityScore.toFixed(1)} 
          icon={AlertCircle} 
          color="red" 
          trend="+5%" 
          description={tAverageHazardPriority} 
        />
        <MetricCard 
          title={tTotalEngagement} 
          value={analytics.totalEngagement.toLocaleString()} 
          icon={Users} 
          color="green" 
          trend="+8%" 
          description={tLikesAndShares} 
        />
        <MetricCard 
          title={tResponseTime} 
          value="3.2 min" 
          icon={Clock} 
          color="purple" 
          trend="-15%" 
          description={tAverageResponseTime} 
        />
      </div>

      {/* Alert Threshold & Actions */}
      <div className="card mb-8">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{tAlertThresholdConfiguration}</h3>
              <p className="text-sm text-gray-600">{tTriggerAlertsAutomatically}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{tThreshold}</span>
                <span className="text-lg font-bold text-red-600">{alertThreshold}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="5" 
                  max="20" 
                  value={alertThreshold} 
                  onChange={(e)=>setAlertThreshold(Number(e.target.value))}
                  className="w-32"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async ()=>{
                      const candidates = effectivePosts.filter(p => (p.priorityScore || 0) >= alertThreshold).slice(0, 10);
                      for (const c of candidates) {
                        try { await alertService.triggerAlert(c, { threshold: alertThreshold }); } catch {}
                      }
                    }}
                    className="btn btn-danger btn-sm flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {tTriggerAlerts}
                  </button>
                  {(role === 'analyst' || role === 'official') && (
                    <Link to="/alerts" className="btn btn-primary btn-sm flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {tViewAlerts}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Time Series */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tHazardDetectionOverTime}</h3>
            <p className="text-sm text-gray-600">{tRealTimeHazardDetectionTrends}</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#374151' }}
                />
                <Legend />
                <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Posts" fillOpacity={0.8} />
                <Area type="monotone" dataKey="Tsunami" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Tsunami" fillOpacity={0.8} />
                <Area type="monotone" dataKey="Cyclone" stackId="1" stroke="#ffc658" fill="#ffc658" name="Cyclone" fillOpacity={0.8} />
                <Area type="monotone" dataKey="Flood" stackId="1" stroke="#ff7300" fill="#ff7300" name="Flood" fillOpacity={0.8} />
                <Area type="monotone" dataKey="Earthquake" stackId="1" stroke="#a78bfa" fill="#a78bfa" name="Earthquake" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Performance */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tPlatformPerformance}</h3>
            <p className="text-sm text-gray-600">{tSocialMediaPlatformAnalysis}</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.platformAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Posts" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgEngagement" fill="#82ca9d" name="Avg Engagement" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Hazard Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tHazardTypeDistribution}</h3>
            <p className="text-sm text-gray-600">{tBreakdownOfHazardTypes}</p>
          </div>
          <div className="card-body">
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tSentimentAnalysis}</h3>
            <p className="text-sm text-gray-600">{tPublicSentimentTowardsHazards}</p>
          </div>
          <div className="card-body">
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Location Table and High Priority List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Location Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tLocationAnalysisDetails}</h3>
            <p className="text-sm text-gray-600">{tTopAffectedLocations}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tLocation}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tPosts}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tAvgPriority}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{tTopHazard}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.locationAnalysis.slice(0, 10).map((location, index) => {
                  const topHazard = Object.entries(location.hazards).sort(([, a], [, b]) => b - a)[0];
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="badge bg-blue-100 text-blue-800">{location.count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`font-medium ${location.avgPriority >= 10 ? 'text-red-600' : location.avgPriority >= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {location.avgPriority.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {topHazard ? (
                          <span className="badge bg-gray-100 text-gray-800">{topHazard[0]} ({topHazard[1]})</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Priority Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">{tRecentHighPriorityAlerts}</h3>
            <p className="text-sm text-gray-600">{tCriticalAlertsRequiringAttention}</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {effectivePosts
                .filter((post) => (post.priorityScore || 0) >= alertThreshold)
                .sort((a, b) => new Date(b.timestamp || b.processedAt) - new Date(a.timestamp || a.processedAt))
                .slice(0, 5)
                .map((post, index) => {
                  const isAcknowledged = acknowledgedIds.has(post.id || String(index));
                  return (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border transition-all duration-200 ${isAcknowledged ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <AlertCircle className={`h-5 w-5 ${isAcknowledged ? 'text-gray-400' : 'text-red-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {post.hazardLabel || tUnknownHazard}
                            </span>
                            <span className={`badge ${post.priorityScore >= 15 ? 'bg-red-100 text-red-800' : post.priorityScore >= 10 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {tPriority} {post.priorityScore?.toFixed(1)}
                            </span>
                            {isAcknowledged && (
                              <span className="badge bg-green-100 text-green-800">{tAcknowledged}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {post.text || post.content || tNoContentAvailable}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              <span>{new Date(post.timestamp || post.processedAt).toLocaleString()}</span>
                              <span className="mx-2">•</span>
                              <span>{post.platform || tUnknown}</span>
                            </div>
                            <button
                              onClick={() => setAcknowledgedIds(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(post.id || String(index))) {
                                  newSet.delete(post.id || String(index));
                                } else {
                                  newSet.add(post.id || String(index));
                                }
                                return newSet;
                              })}
                              className={`btn btn-sm ${isAcknowledged ? 'btn-secondary' : 'btn-primary'} flex items-center gap-1`}
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {isAcknowledged ? tUnacknowledge : tAcknowledge}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              
              {effectivePosts.filter((post) => (post.priorityScore || 0) >= alertThreshold).length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">{tNoHighPriorityAlerts}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="card mb-8">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tRealTimeActivityFeed}</h3>
            <p className="text-sm text-gray-600">{tLiveUpdatesFromHazardDetection}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-600">{tLive}</span>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {realTimeData.slice(0, 10).map((item, index) => {
              const typeColors = {
                detection: 'bg-blue-100 text-blue-800 border-blue-200',
                alert: 'bg-red-100 text-red-800 border-red-200',
                update: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                info: 'bg-gray-100 text-gray-800 border-gray-200'
              };
              
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'detection' ? 'bg-blue-400' : 
                      item.type === 'alert' ? 'bg-red-400' : 
                      item.type === 'update' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${typeColors[item.type] || typeColors.info}`}>
                        {item.type?.toUpperCase() || 'INFO'}
                      </span>
                      <span className="text-sm text-gray-900 truncate">{item.message}</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {realTimeData.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500">{tNoRecentActivity}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">{tExportReports}</h3>
          <p className="text-sm text-gray-600">{tDownloadAnalyticsData}</p>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => exportData('csv', analytics, posts, selectedTimeRange)} 
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {tExportAsCSV}
            </button>
            <button 
              onClick={() => exportData('json', analytics, posts, selectedTimeRange)} 
              className="btn btn-success flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {tExportAsJSON}
            </button>
            <button className="btn btn-secondary flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {tGenerateReport}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color = 'blue', trend = '', description = '' }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600'
  };
  
  const trendColor = trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              {trend && (
                <span className={`text-xs font-medium ${trendColor}`}>
                  {trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
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

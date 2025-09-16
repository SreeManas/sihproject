import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import ReportForm from "./components/ReportForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import EnhancedSocialFeed from "./components/EnhancedSocialFeed.jsx";
import VirtualizedSocialFeed from "./components/VirtualizedSocialFeed.jsx";
import LazyLoadedFeed from "./components/LazyLoadedFeed.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import DataSourceConfig from "./components/DataSourceConfig.jsx";
import RealTimeStatusIndicator from "./components/RealTimeStatusIndicator.jsx";
import AuthProvider, { useAuth } from "./components/auth/AuthProvider.jsx";
import PermissionGuard from "./components/auth/PermissionGuard.jsx";
import LoginForm from "./components/auth/LoginForm.jsx";
import InteractiveDashboardMap from "./components/InteractiveDashboardMap.jsx";
import AlertsList from "./components/AlertsList.jsx";
import socialMap from "./services/socialMapService.js";

const Nav = () => {
  const { currentUser, role } = useAuth();
  const canSeeAlerts = !!currentUser && (role === 'analyst' || role === 'official');
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-blue-700">INCOIS Hazard Dashboard</Link>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/dashboard" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Dashboard</NavLink>
          <NavLink to="/report" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Report</NavLink>
          <NavLink to="/feed/enhanced" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Enhanced Feed</NavLink>
          <NavLink to="/feed/virtualized" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Virtualized Feed</NavLink>
          <NavLink to="/feed/lazy" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Lazy Feed</NavLink>
          <NavLink to="/analytics" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Analytics</NavLink>
          {canSeeAlerts && (
            <NavLink to="/alerts" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Alerts</NavLink>
          )}
          <NavLink to="/data-sources" className={({isActive})=> isActive? "text-blue-600 font-semibold" : "text-gray-700"}>Data Sources</NavLink>
        </nav>
        <RealTimeStatusIndicator />
      </div>
    </header>
  );
};

export default function App() {
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);

  const loadFeeds = useCallback(async () => {
    setLoadingFeeds(true);
    try {
      const posts = await socialMap.fetchSocialForMap({ location: 'India', maxResults: 120 });
      setFeedPosts(posts);
    } catch (e) {
      console.error('Failed to load social feed posts', e);
    } finally {
      setLoadingFeeds(false);
    }
  }, []);

  useEffect(() => { loadFeeds(); }, [loadFeeds]);
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/report" element={<div className="max-w-3xl mx-auto"><ReportForm /></div>} />
              <Route path="/feed/enhanced" element={<EnhancedSocialFeed posts={feedPosts} loading={loadingFeeds} />} />
              <Route path="/feed/virtualized" element={<VirtualizedSocialFeed posts={feedPosts} loading={loadingFeeds} hasNextPage={false} />} />
              <Route path="/feed/lazy" element={<LazyLoadedFeed posts={feedPosts} />} />
              <Route path="/analytics" element={<PermissionGuard roles={["analyst","official"]}><AnalyticsDashboard /></PermissionGuard>} />
              <Route path="/alerts" element={<PermissionGuard roles={["analyst","official"]}><AlertsList /></PermissionGuard>} />
              <Route path="/map/interactive" element={<InteractiveDashboardMap />} />
              <Route path="/data-sources" element={<DataSourceConfig />} />
              <Route path="/login" element={<div className="max-w-md mx-auto"><LoginForm /></div>} />
              <Route path="/auth" element={<div className="max-w-md mx-auto"><LoginForm /></div>} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

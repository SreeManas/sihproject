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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/report", label: "Report", icon: "📝" },
    { to: "/feed/enhanced", label: "Enhanced Feed", icon: "📱" },
    { to: "/feed/virtualized", label: "Virtualized Feed", icon: "⚡" },
    { to: "/feed/lazy", label: "Lazy Feed", icon: "🔄" },
    { to: "/analytics", label: "Analytics", icon: "📈" },
    ...(canSeeAlerts ? [{ to: "/alerts", label: "Alerts", icon: "🚨" }] : []),
    { to: "/data-sources", label: "Data Sources", icon: "🔗" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 hover-lift">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IH</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">INCOIS Hazard</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <RealTimeStatusIndicator />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Nav />
          
          {/* Main Content Area */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/report" element={
                  <div className="max-w-4xl mx-auto animate-fadeIn">
                    <div className="card">
                      <div className="card-header">
                        <h2 className="text-xl font-semibold text-gray-900">Report Incident</h2>
                        <p className="text-sm text-gray-600 mt-1">Submit a new hazard report for analysis</p>
                      </div>
                      <div className="card-body">
                        <ReportForm />
                      </div>
                    </div>
                  </div>
                } />
                <Route path="/feed/enhanced" element={
                  <div className="animate-fadeIn">
                    <EnhancedSocialFeed posts={feedPosts} loading={loadingFeeds} />
                  </div>
                } />
                <Route path="/feed/virtualized" element={
                  <div className="animate-fadeIn">
                    <VirtualizedSocialFeed posts={feedPosts} loading={loadingFeeds} hasNextPage={false} />
                  </div>
                } />
                <Route path="/feed/lazy" element={
                  <div className="animate-fadeIn">
                    <LazyLoadedFeed posts={feedPosts} />
                  </div>
                } />
                <Route path="/analytics" element={
                  <PermissionGuard roles={["analyst","official"]}>
                    <div className="animate-fadeIn">
                      <AnalyticsDashboard />
                    </div>
                  </PermissionGuard>
                } />
                <Route path="/alerts" element={
                  <PermissionGuard roles={["analyst","official"]}>
                    <div className="animate-fadeIn">
                      <AlertsList />
                    </div>
                  </PermissionGuard>
                } />
                <Route path="/map/interactive" element={
                  <div className="animate-fadeIn">
                    <InteractiveDashboardMap />
                  </div>
                } />
                <Route path="/data-sources" element={
                  <div className="max-w-6xl mx-auto animate-fadeIn">
                    <DataSourceConfig />
                  </div>
                } />
                <Route path="/login" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full">
                      <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                          <span className="text-white font-bold text-sm">IH</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="text-gray-600 mt-2">Sign in to your account</p>
                      </div>
                      <div className="card">
                        <div className="card-body">
                          <LoginForm />
                        </div>
                      </div>
                    </div>
                  </div>
                } />
                <Route path="/auth" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full">
                      <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                          <span className="text-white font-bold text-sm">IH</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="text-gray-600 mt-2">Sign in to your account</p>
                      </div>
                      <div className="card">
                        <div className="card-body">
                          <LoginForm />
                        </div>
                      </div>
                    </div>
                  </div>
                } />
              </Routes>
            </div>
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-2 mb-4 md:mb-0">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-xs">IH</span>
                  </div>
                  <span className="text-sm text-gray-600">INCOIS Hazard Dashboard</span>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span>© 2024 INCOIS</span>
                  <span>•</span>
                  <span>Hackathon Project</span>
                  <span>•</span>
                  <span className="text-blue-600 hover:text-blue-700 cursor-pointer">v1.0</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

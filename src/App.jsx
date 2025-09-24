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
import CitizenAlertBanner from "./components/CitizenAlertBanner.jsx";
import FeedbackForm from "./components/FeedbackForm.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { useT } from "./hooks/useT.js";
import socialMap from "./services/socialMapService.js";


const Nav = () => {
  const { currentUser, role, logout } = useAuth();
  const canSeeAlerts = !!currentUser && (role === 'analyst' || role === 'official');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Translation hooks for navigation items
  const tDashboard = useT("Dashboard");
  const tReport = useT("Report");
  const tFeedback = useT("Feedback");
  const tEnhancedFeed = useT("Enhanced Feed");
  const tVirtualizedFeed = useT("Virtualized Feed");
  const tLazyFeed = useT("Lazy Feed");
  const tAnalytics = useT("Analytics");
  const tAlerts = useT("Alerts");
  const tDataSources = useT("Data Sources");
  const tCoastalHazardMonitor = useT("Coastal Hazard Monitor");
  const tLogout = useT("Logout");
  const tLogin = useT("Login");
  const tWelcome = useT("Welcome");
  const tEmail = useT("Email");
  const tRole = useT("Role");

  const navigationItems = [
    { to: "/dashboard", label: tDashboard, icon: "📊" },
    { to: "/report", label: tReport, icon: "📝" },
    { to: "/feedback", label: tFeedback, icon: "💬" },
    { to: "/feed/enhanced", label: tEnhancedFeed, icon: "📱" },
    { to: "/feed/virtualized", label: tVirtualizedFeed, icon: "⚡" },
    { to: "/feed/lazy", label: tLazyFeed, icon: "🔄" },
    { to: "/analytics", label: tAnalytics, icon: "📈" },
    ...(canSeeAlerts ? [{ to: "/alerts", label: tAlerts, icon: "🚨" }] : []),
    { to: "/data-sources", label: tDataSources, icon: "🔗" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3 w-full">
        {/* Left side - Logo and Brand */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-3 hover-lift">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IS</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">INCOIS-SAMACHAR</h1>
              <p className="text-xs text-gray-500">{tCoastalHazardMonitor}</p>
            </div>
          </Link>
        </div>

        {/* Center - Navigation Items */}
        <nav className="hidden lg:flex items-center space-x-6">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors items-center ${
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

        {/* Right side - Language and Login */}
        <div className="flex items-center space-x-3">
          <RealTimeStatusIndicator />
          
          {/* Language Selector */}
          <LanguageSwitcher />
          
          {/* User Authentication */}
          {currentUser ? (
            <div className="relative group">
              <button className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="text-sm font-semibold text-gray-900">{tWelcome}</div>
                  <div className="text-xs text-gray-600 mt-1">{tEmail}: {currentUser.email}</div>
                  <div className="text-xs text-gray-600">{tRole}: {role}</div>
                </div>
                <div className="p-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{tLogout}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <span className="text-sm font-medium">{tLogin}</span>
            </Link>
          )}
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              
              {/* Mobile Authentication */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-900">{tWelcome}</div>
                      <div className="text-xs text-gray-600">{currentUser.email}</div>
                      <div className="text-xs text-gray-600">{tRole}: {role}</div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>{tLogout}</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">{tLogin}</span>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
    </header>
  );
};

export default function App() {
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);

  const loadFeeds = useCallback(async () => {
    setLoadingFeeds(true);
    try {
      // Loading feed posts
      const posts = await socialMap.fetchSocialForMap({ location: 'India', maxResults: 120 });
      // Feed posts loaded
      // Posts count available
      // First post available
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
      <LanguageProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Nav />
            <CitizenAlertBanner />
          
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
                <Route path="/feedback" element={
                  <div className="max-w-2xl mx-auto animate-fadeIn">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Feedback</h2>
                      <p className="text-gray-600">Help us improve INCOIS SAMACHAR with your valuable feedback and suggestions.</p>
                    </div>
                    <FeedbackForm />
                  </div>
                } />
                <Route path="/feed/enhanced" element={
                  <div className="animate-fadeIn">
                    <EnhancedSocialFeed posts={feedPosts} loading={loadingFeeds} />
                  </div>
                } />
                <Route path="/feed/virtualized" element={
                  <div className="animate-fadeIn h-[calc(100vh-200px)]">
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
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-xs">IS</span>
                  </div>
                  <span className="text-sm text-gray-600">INCOIS-SAMACHAR</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>© 2025 INCOIS-SAMACHAR</span>
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
      </LanguageProvider>
    </BrowserRouter>
  );
}

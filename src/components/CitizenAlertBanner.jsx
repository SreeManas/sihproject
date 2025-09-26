import React, { useState, useEffect } from 'react';
import { getActiveAlerts } from '../services/alertService.js';
import { useT } from '../hooks/useT.js';

// Translation keys for static strings
const TRANSLATIONS = {
  emergencyAlerts: 'Emergency Alerts',
  activeAlerts: 'Active Alerts',
  viewAllAlerts: 'View All Alerts',
  dismiss: 'Dismiss',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  issued: 'Issued',
  by: 'by',
  unknownTime: 'Unknown time',
  justNow: 'Just now',
  ago: 'ago',
  staySafe: 'Stay safe and follow official instructions'
};

export default function CitizenAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedBanners, setDismissedBanners] = useState(new Set());
  
  // Translation hooks
  const tEmergencyAlerts = useT(TRANSLATIONS.emergencyAlerts);
  const tActiveAlerts = useT(TRANSLATIONS.activeAlerts);
  const tViewAllAlerts = useT(TRANSLATIONS.viewAllAlerts);
  const tDismiss = useT(TRANSLATIONS.dismiss);
  const tHigh = useT(TRANSLATIONS.high);
  const tMedium = useT(TRANSLATIONS.medium);
  const tLow = useT(TRANSLATIONS.low);
  const tIssued = useT(TRANSLATIONS.issued);
  const tBy = useT(TRANSLATIONS.by);
  const tUnknownTime = useT(TRANSLATIONS.unknownTime);
  const tJustNow = useT(TRANSLATIONS.justNow);
  const tAgo = useT(TRANSLATIONS.ago);
  const tStaySafe = useT(TRANSLATIONS.staySafe);

  useEffect(() => {
    loadActiveAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadActiveAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadActiveAlerts = async () => {
    try {
      const activeAlerts = await getActiveAlerts();
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error loading active alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissBanner = (severity) => {
    setDismissedBanners(prev => new Set([...prev, severity]));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-600 border-red-700',
          text: 'text-red-100',
          badge: 'bg-red-700 text-red-100'
        };
      case 'medium':
        return {
          bg: 'bg-orange-500 border-orange-600',
          text: 'text-orange-100',
          badge: 'bg-orange-600 text-orange-100'
        };
      case 'low':
        return {
          bg: 'bg-yellow-500 border-yellow-600',
          text: 'text-yellow-100',
          badge: 'bg-yellow-600 text-yellow-100'
        };
      default:
        return {
          bg: 'bg-blue-500 border-blue-600',
          text: 'text-blue-100',
          badge: 'bg-blue-600 text-blue-100'
        };
    }
  };

  const getSeverityIcon = (hazardType) => {
    const hazardIcons = {
      'Tsunami': '🌊',
      'Cyclone': '🌀',
      'Storm Surge': '🌊',
      'High Waves': '🌊',
      'Flood': '🌊',
      'Landslide': '⛰️',
      'Earthquake': '🏚️',
      'Coastal Erosion': '🏖️',
      'Other': '⚠️'
    };
    return hazardIcons[hazardType] || '⚠️';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return tUnknownTime;
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return tJustNow;
    if (diffMins < 60) return `${diffMins}m ${tAgo}`;
    if (diffHours < 24) return `${diffHours}h ${tAgo}`;
    if (diffDays < 7) return `${diffDays}d ${tAgo}`;
    
    return date.toLocaleDateString();
  };

  // Group alerts by severity and count
  const alertCounts = {
    high: alerts.filter(alert => alert.severity === 'high').length,
    medium: alerts.filter(alert => alert.severity === 'medium').length,
    low: alerts.filter(alert => alert.severity === 'low').length
  };

  // Only show banners for high and medium severity alerts
  const visibleSeverities = ['high', 'medium'].filter(severity => 
    alertCounts[severity] > 0 && !dismissedBanners.has(severity)
  );

  if (loading || visibleSeverities.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2 p-4">
      {visibleSeverities.map((severity) => {
        const severityStyle = getSeverityColor(severity);
        const count = alertCounts[severity];
        const latestAlert = alerts
          .filter(alert => alert.severity === severity)
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return bTime - aTime;
          })[0];

        return (
          <div
            key={severity}
            className={`${severityStyle.bg} text-white rounded-lg shadow-lg border-2 transform transition-all duration-300`}
            role="alert"
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-xl">
                  {getSeverityIcon(latestAlert?.hazardType)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-sm">
                      {severity === 'high' ? tEmergencyAlerts : tActiveAlerts}
                    </h4>
                    <span className={`${severityStyle.badge} px-2 py-1 rounded text-xs font-medium`}>
                      {count} {count === 1 ? 'alert' : 'alerts'}
                    </span>
                  </div>
                  
                  <div className="text-xs opacity-90 mt-1">
                    Latest: {latestAlert?.area} • {tIssued} {formatTime(latestAlert?.createdAt)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    // Navigate to dashboard to view all alerts
                    window.location.href = '/dashboard';
                  }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                >
                  {tViewAllAlerts}
                </button>
                
                <button
                  onClick={() => dismissBanner(severity)}
                  className="p-1 text-white/80 hover:text-white transition-colors"
                  aria-label={tDismiss}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-white/20 px-3 py-2 bg-black/10">
              <div className="text-xs text-white/70 text-center">
                {tStaySafe}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getActiveAlerts } from '../services/alertService.js';
import { useT } from '../hooks/useT.js';

// Translation keys for static strings
const TRANSLATIONS = {
  alertsDashboard: 'Alerts Dashboard',
  totalActiveAlerts: 'Total Active Alerts',
  highPriority: 'High Priority',
  mediumPriority: 'Medium Priority',
  lowPriority: 'Low Priority',
  issued: 'Issued',
  by: 'by',
  viewDetails: 'View Details',
  dismissAll: 'Dismiss All',
  refreshAlerts: 'Refresh Alerts',
  noActiveAlerts: 'No Active Alerts',
  loadingAlerts: 'Loading alerts...',
  emergencyContacts: 'Emergency Contacts',
  reportIncident: 'Report Incident',
  staySafe: 'Stay safe and follow official instructions',
  unknownTime: 'Unknown time',
  justNow: 'Just now',
  ago: 'ago',
  area: 'Area',
  message: 'Message',
  severity: 'Severity',
  actions: 'Actions'
};

export default function AlertDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [expandedAlert, setExpandedAlert] = useState(null);
  
  // Translation hooks
  const tAlertsDashboard = useT(TRANSLATIONS.alertsDashboard);
  const tTotalActiveAlerts = useT(TRANSLATIONS.totalActiveAlerts);
  const tHighPriority = useT(TRANSLATIONS.highPriority);
  const tMediumPriority = useT(TRANSLATIONS.mediumPriority);
  const tLowPriority = useT(TRANSLATIONS.lowPriority);
  const tIssued = useT(TRANSLATIONS.issued);
  const tBy = useT(TRANSLATIONS.by);
  const tViewDetails = useT(TRANSLATIONS.viewDetails);
  const tDismissAll = useT(TRANSLATIONS.dismissAll);
  const tRefreshAlerts = useT(TRANSLATIONS.refreshAlerts);
  const tNoActiveAlerts = useT(TRANSLATIONS.noActiveAlerts);
  const tLoadingAlerts = useT(TRANSLATIONS.loadingAlerts);
  const tEmergencyContacts = useT(TRANSLATIONS.emergencyContacts);
  const tReportIncident = useT(TRANSLATIONS.reportIncident);
  const tStaySafe = useT(TRANSLATIONS.staySafe);
  const tUnknownTime = useT(TRANSLATIONS.unknownTime);
  const tJustNow = useT(TRANSLATIONS.justNow);
  const tAgo = useT(TRANSLATIONS.ago);
  const tArea = useT(TRANSLATIONS.area);
  const tMessage = useT(TRANSLATIONS.message);
  const tSeverity = useT(TRANSLATIONS.severity);
  const tActions = useT(TRANSLATIONS.actions);

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

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    if (expandedAlert === alertId) {
      setExpandedAlert(null);
    }
  };

  const dismissAllAlerts = () => {
    const allIds = alerts.map(alert => alert.id);
    setDismissedAlerts(prev => new Set([...prev, ...allIds]));
    setExpandedAlert(null);
  };

  const toggleExpandAlert = (alertId) => {
    setExpandedAlert(prev => prev === alertId ? null : alertId);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          icon: '🔴'
        };
      case 'medium':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          icon: '🟡'
        };
      case 'low':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: '🟢'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-800',
          icon: '🔵'
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

  // Filter out dismissed alerts and sort by severity and time
  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .sort((a, b) => {
      // Sort by severity first
      const severityOrder = { high: 3, medium: 2, low: 1, default: 0 };
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      // Then sort by time (newest first)
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bTime - aTime;
    });

  // Count alerts by severity
  const alertCounts = {
    high: visibleAlerts.filter(alert => alert.severity === 'high').length,
    medium: visibleAlerts.filter(alert => alert.severity === 'medium').length,
    low: visibleAlerts.filter(alert => alert.severity === 'low').length
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tAlertsDashboard}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {tTotalActiveAlerts}: {visibleAlerts.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadActiveAlerts}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={tRefreshAlerts}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {visibleAlerts.length > 0 && (
              <button
                onClick={dismissAllAlerts}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {tDismissAll}
              </button>
            )}
          </div>
        </div>
        
        {/* Severity Summary */}
        <div className="flex items-center space-x-4 mt-3">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm text-gray-600">{tHighPriority}: {alertCounts.high}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-sm text-gray-600">{tMediumPriority}: {alertCounts.medium}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span className="text-sm text-gray-600">{tLowPriority}: {alertCounts.low}</span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">{tLoadingAlerts}</p>
          </div>
        ) : visibleAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-600">{tNoActiveAlerts}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleAlerts.map((alert) => {
              const severityStyle = getSeverityColor(alert.severity);
              const isExpanded = expandedAlert === alert.id;
              
              return (
                <div
                  key={alert.id}
                  className={`p-4 ${severityStyle.bg} border-l-4 ${severityStyle.text} transition-all duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-xl">
                        {getSeverityIcon(alert.hazardType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">
                            {alert.hazardType} Alert
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${severityStyle.badge}`}>
                            {alert.severity?.toUpperCase() || 'ACTIVE'}
                          </span>
                        </div>
                        
                        <div className="text-sm opacity-90 mb-1">
                          <span className="font-medium">{tArea}:</span> {alert.area}
                        </div>
                        
                        <div className="text-xs opacity-75">
                          <span>
                            {tIssued} {formatTime(alert.createdAt)}
                            {alert.createdByEmail && ` ${tBy} ${alert.createdByEmail}`}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {alert.message && (
                              <div className="text-sm">
                                <span className="font-medium">{tMessage}:</span> {alert.message}
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 pt-2">
                              <button
                                onClick={() => {
                                  window.location.href = '#emergency-contacts';
                                }}
                                className="px-3 py-1 bg-white/50 hover:bg-white/70 rounded text-xs font-medium transition-colors"
                              >
                                {tEmergencyContacts}
                              </button>
                              
                              <button
                                onClick={() => {
                                  window.location.href = '/report';
                                }}
                                className="px-3 py-1 bg-white/50 hover:bg-white/70 rounded text-xs font-medium transition-colors"
                              >
                                {tReportIncident}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => toggleExpandAlert(alert.id)}
                        className="p-1 hover:bg-white/30 rounded transition-colors"
                        title={tViewDetails}
                      >
                        <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1 hover:bg-white/30 rounded transition-colors"
                        title="Dismiss alert"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {visibleAlerts.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            {tStaySafe}
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { getActiveAlerts } from '../services/alertService.js';
import { useT } from '../hooks/useT.js';

// Translation keys for static strings
const TRANSLATIONS = {
  alert: 'Alert',
  active: 'ACTIVE',
  issued: 'Issued',
  by: 'by',
  emergencyContacts: '📞 Emergency Contacts',
  reportIncident: '📝 Report Incident',
  staySafe: 'Stay safe and follow official instructions',
  unknownTime: 'Unknown time',
  justNow: 'Just now',
  ago: 'ago'
};

export default function CitizenAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  
  // Translation hooks
  const tAlert = useT(TRANSLATIONS.alert);
  const tActive = useT(TRANSLATIONS.active);
  const tIssued = useT(TRANSLATIONS.issued);
  const tBy = useT(TRANSLATIONS.by);
  const tEmergencyContacts = useT(TRANSLATIONS.emergencyContacts);
  const tReportIncident = useT(TRANSLATIONS.reportIncident);
  const tStaySafe = useT(TRANSLATIONS.staySafe);
  const tUnknownTime = useT(TRANSLATIONS.unknownTime);
  const tJustNow = useT(TRANSLATIONS.justNow);
  const tAgo = useT(TRANSLATIONS.ago);

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
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-600 border-red-700';
      case 'medium':
        return 'bg-orange-500 border-orange-600';
      case 'low':
        return 'bg-yellow-500 border-yellow-600';
      default:
        return 'bg-blue-500 border-blue-600';
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

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2 p-4">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`${getSeverityColor(alert.severity)} text-white rounded-lg shadow-lg border-2 transform transition-all duration-300 animate-pulse`}
          role="alert"
        >
          <div className="flex items-start justify-between p-4">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-2xl">
                {getSeverityIcon(alert.hazardType)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-lg">
                    {alert.hazardType} Alert
                  </h4>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
                    {alert.severity?.toUpperCase() || tActive}
                  </span>
                </div>
                
                <p className="text-white/90 text-sm mb-2">
                  <span className="font-medium">{alert.area}</span>
                </p>
                
                {alert.message && (
                  <p className="text-white/90 text-sm mb-2">
                    {alert.message}
                  </p>
                )}
                
                <div className="flex items-center text-xs text-white/80">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {tIssued} {formatTime(alert.createdAt)}
                    {alert.createdByEmail && ` ${tBy} ${alert.createdByEmail}`}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => dismissAlert(alert.id)}
              className="ml-4 text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Action buttons */}
          <div className="border-t border-white/20 px-4 py-3 bg-black/10">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // Open emergency contacts
                    window.location.href = '#emergency-contacts';
                  }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                >
                  {tEmergencyContacts}
                </button>
                
                <button
                  onClick={() => {
                    // Navigate to report form
                    window.location.href = '/report';
                  }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
                >
                  {tReportIncident}
                </button>
              </div>
              
              <div className="text-xs text-white/70">
                {tStaySafe}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

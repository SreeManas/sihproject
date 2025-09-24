// src/components/AlertsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import ManualAlertTrigger from './ManualAlertTrigger.jsx';
import { useT } from '../hooks/useT.js';

export default function AlertsList() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('open'); // open, acknowledged, resolved, all
  const [loading, setLoading] = useState(true);

  // Translation hooks
  const tAlertsManagement = useT("Alerts Management");
  const tMonitorAndManageSystemAlerts = useT("Monitor and manage system alerts and notifications");
  const tFilter = useT("Filter:");
  const tOpenAlerts = useT("Open Alerts");
  const tAcknowledged = useT("Acknowledged");
  const tResolved = useT("Resolved");
  const tAllAlerts = useT("All Alerts");
  const tAlerts = useT("alerts");
  const tLoadingAlerts = useT("Loading alerts...");
  const tNoAlertsFound = useT("No alerts found");
  const tNoAlertsInCurrentFilter = useT("There are no alerts in the current filter view.");
  const tSystemAlert = useT("System Alert");
  const tPriority = useT("Priority");
  const tHighPriorityAlertRequiresAttention = useT("High priority alert requires attention");
  const tTimestampUnavailable = useT("Timestamp unavailable");
  const tAcknowledge = useT("Acknowledge");
  const tResolve = useT("Resolve");

  useEffect(() => {
    const db = getFirestore();
    let q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlerts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'open') return !a.acknowledgedAt && !a.resolvedAt;
    if (filter === 'acknowledged') return !!a.acknowledgedAt && !a.resolvedAt;
    if (filter === 'resolved') return !!a.resolvedAt;
    return true;
  });

  const acknowledge = useCallback(async (id) => {
    const db = getFirestore();
    await updateDoc(doc(db, 'alerts', id), { acknowledgedAt: serverTimestamp() });
  }, []);

  const resolve = useCallback(async (id) => {
    const db = getFirestore();
    await updateDoc(doc(db, 'alerts', id), { resolvedAt: serverTimestamp() });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⚠️</span>
                </div>
                {tAlertsManagement}
              </h1>
              <p className="text-gray-600 mt-1">{tMonitorAndManageSystemAlerts}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">{tFilter}</label>
                <select 
                  value={filter} 
                  onChange={e=>setFilter(e.target.value)}
                  className="select w-40"
                >
                  <option value="open">{tOpenAlerts}</option>
                  <option value="acknowledged">{tAcknowledged}</option>
                  <option value="resolved">{tResolved}</option>
                  <option value="all">{tAllAlerts}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {filtered.length} {tAlerts}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Alert Trigger */}
        <ManualAlertTrigger />

        {/* Alerts Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">{tLoadingAlerts}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{tNoAlertsFound}</h3>
                  <p className="text-gray-600">{tNoAlertsInCurrentFilter}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const status = a.resolvedAt ? 'resolved' : a.acknowledgedAt ? 'acknowledged' : 'open';
                  const statusColors = {
                    open: 'bg-red-100 text-red-800 border-red-200',
                    acknowledged: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    resolved: 'bg-green-100 text-green-800 border-green-200'
                  };
                  
                  return (
                    <div key={a.id} className="card hover:shadow-md transition-shadow duration-200">
                      <div className="card-body p-6">
                        <div className="flex items-start gap-4">
                          {/* Status Indicator */}
                          <div className="flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full ${a.resolvedAt ? 'bg-green-500' : a.acknowledgedAt ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          </div>
                          
                          {/* Alert Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {a.type || tSystemAlert}
                              </h3>
                              <span className={`badge ${statusColors[status]}`}>
                                {status === 'open' ? tOpenAlerts : status === 'acknowledged' ? tAcknowledged : tResolved}
                              </span>
                              {a.priority && (
                                <span className="badge bg-blue-100 text-blue-800 border-blue-200">
                                  {tPriority} {a.priority}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-700 mb-3">
                              {a.reason || tHighPriorityAlertRequiresAttention}
                            </p>
                            
                            {a.payload?.text && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {a.payload.text}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : tTimestampUnavailable}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {!a.acknowledgedAt && (
                                  <button 
                                    onClick={()=>acknowledge(a.id)}
                                    className="btn btn-secondary btn-sm flex items-center gap-1"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {tAcknowledge}
                                  </button>
                                )}
                                {!a.resolvedAt && (
                                  <button 
                                    onClick={()=>resolve(a.id)}
                                    className="btn btn-success btn-sm flex items-center gap-1"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {tResolve}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

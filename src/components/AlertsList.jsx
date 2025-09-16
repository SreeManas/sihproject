// src/components/AlertsList.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { getFirestore, collection, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore';

export default function AlertsList() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('open'); // open, acknowledged, resolved, all
  const [loading, setLoading] = useState(true);

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
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <select className="border rounded px-2 py-1" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>
      {loading ? (
        <div className="p-4">Loading alerts...</div>
      ) : (
        <div className="bg-white rounded border">
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-gray-600">No alerts in this view.</div>
            )}
            {filtered.map((a) => (
              <div key={a.id} className="p-4 flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${a.resolvedAt ? 'bg-green-500' : a.acknowledgedAt ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <div className="flex-1">
                  <div className="font-medium">{a.type || 'Alert'} • Priority {a.priority ?? ''}</div>
                  <div className="text-sm text-gray-700">{a.reason || 'High Priority'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : ''}
                  </div>
                  {a.payload?.text && (
                    <div className="text-sm text-gray-600 mt-2 line-clamp-2">{a.payload.text}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!a.acknowledgedAt && (
                    <button onClick={()=>acknowledge(a.id)} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Acknowledge</button>
                  )}
                  {!a.resolvedAt && (
                    <button onClick={()=>resolve(a.id)} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

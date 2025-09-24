// src/utils/offlineSync.js
// Simple offline queue for reports using localForage.
// Retries with exponential backoff when back online.
// Demo note: only metadata is stored offline (no blobs), to keep the example lightweight.

import localforage from 'localforage';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const QUEUE_KEY = 'offline_reports_queue';

localforage.config({ name: 'incois-demo' });

async function readQueue() {
  return (await localforage.getItem(QUEUE_KEY)) || [];
}
async function writeQueue(queue) {
  await localforage.setItem(QUEUE_KEY, queue);
}

export async function enqueueReport(report) {
  const q = await readQueue();
  q.push({ ...report, enqueuedAt: Date.now(), attempts: 0 });
  await writeQueue(q);
}

async function tryUpload(item) {
  const db = getFirestore();
  await addDoc(collection(db, 'reports'), {
    hazardType: item.hazardType,
    description: item.description,
    location: {
      latitude: item.coords?.latitude,
      longitude: item.coords?.longitude,
    },
    thumbUrl: null,
    fileUrl: null,
    userId: null,
    createdAt: serverTimestamp(),
    offlineSynced: true,
    // Include verification fields (will be null for offline reports)
    exifData: null,
    exifLocationMatch: null,
    exifDistanceKm: null,
    delayedUpload: false,
    imdVerification: { enabled: false },
    browserLocation: item.coords ? { latitude: item.coords.latitude, longitude: item.coords.longitude } : null,
    priorityScore: 0 // Default priority for offline reports
  });
}

export async function syncPendingReports() {
  if (!navigator.onLine) return;

  const q = await readQueue();
  const next = [];
  for (const item of q) {
    try {
      await tryUpload(item);
    } catch (err) {
      const attempts = (item.attempts || 0) + 1;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempts));
      next.push({ ...item, attempts, retryAfter: Date.now() + delay });
    }
  }
  await writeQueue(next);
}

function scheduleSync() {
  const doSync = async () => {
    try { await syncPendingReports(); } finally { setTimeout(doSync, 10000); }
  };
  doSync();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', syncPendingReports);
  scheduleSync();
}

export default { enqueueReport, syncPendingReports };

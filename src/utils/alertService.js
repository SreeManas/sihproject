// src/utils/alertService.js
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function triggerAlert(item, { reason = 'High Priority', threshold = 12 } = {}) {
  const priority = item?.priorityScore ?? 0;
  if (priority < threshold) return { skipped: true };
  const db = getFirestore();
  const docRef = await addDoc(collection(db, 'alerts'), {
    type: item.hazardLabel || 'Other',
    priority,
    reason,
    source: item.platform ? `social:${item.platform}` : 'report',
    createdAt: serverTimestamp(),
    payload: {
      id: item.id || null,
      text: item.text || item.description || '',
      timestamp: item.timestamp || item.processedAt || null,
      location: item.location || { latitude: item.lat, longitude: item.lon },
    },
  });
  return { id: docRef.id };
}

export default { triggerAlert };

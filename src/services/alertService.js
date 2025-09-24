import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Create a new alert
export async function createAlert(alertData) {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be authenticated to create alerts');
  }

  const alert = {
    ...alertData,
    createdBy: user.uid,
    createdByEmail: user.email,
    createdAt: serverTimestamp(),
    acknowledgedAt: null,
    resolvedAt: null,
    status: 'active'
  };

  const docRef = await addDoc(collection(db, 'alerts'), alert);
  return { id: docRef.id, ...alert };
}

// Get reports count by area for alert triggering
export async function getReportsCountByArea(area, timeRange = '24h') {
  const db = getFirestore();
  const reportsRef = collection(db, 'reports');
  
  // Calculate time cutoff based on timeRange
  const now = new Date();
  const cutoff = new Date();
  
  switch (timeRange) {
    case '1h':
      cutoff.setHours(now.getHours() - 1);
      break;
    case '6h':
      cutoff.setHours(now.getHours() - 6);
      break;
    case '24h':
      cutoff.setDate(now.getDate() - 1);
      break;
    case '7d':
      cutoff.setDate(now.getDate() - 7);
      break;
    default:
      cutoff.setDate(now.getDate() - 1);
  }

  // Query reports for the specific area and time range
  const q = query(
    reportsRef,
    where('location', '==', area),
    where('createdAt', '>=', cutoff)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
}

// Get areas with high report counts (for alert triggering)
export async function getHighRiskAreas(threshold = 200, timeRange = '24h') {
  const db = getFirestore();
  const reportsRef = collection(db, 'reports');
  
  // Calculate time cutoff
  const now = new Date();
  const cutoff = new Date();
  
  switch (timeRange) {
    case '1h':
      cutoff.setHours(now.getHours() - 1);
      break;
    case '6h':
      cutoff.setHours(now.getHours() - 6);
      break;
    case '24h':
      cutoff.setDate(now.getDate() - 1);
      break;
    case '7d':
      cutoff.setDate(now.getDate() - 7);
      break;
    default:
      cutoff.setDate(now.getDate() - 1);
  }

  const q = query(
    reportsRef,
    where('createdAt', '>=', cutoff)
  );

  const querySnapshot = await getDocs(q);
  const areaCounts = {};

  querySnapshot.forEach((doc) => {
    const report = doc.data();
    const area = report.location || 'Unknown';
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  // Filter areas that exceed the threshold
  return Object.entries(areaCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
}

// Update alert status
export async function updateAlertStatus(alertId, status) {
  const db = getFirestore();
  const alertRef = doc(db, 'alerts', alertId);
  
  const updateData = {
    updatedAt: serverTimestamp()
  };

  switch (status) {
    case 'acknowledged':
      updateData.acknowledgedAt = serverTimestamp();
      break;
    case 'resolved':
      updateData.resolvedAt = serverTimestamp();
      break;
    default:
      break;
  }

  await updateDoc(alertRef, updateData);
}

// Get active alerts for citizens
export async function getActiveAlerts() {
  const db = getFirestore();
  const alertsRef = collection(db, 'alerts');
  
  const q = query(
    alertsRef,
    where('status', '==', 'active')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

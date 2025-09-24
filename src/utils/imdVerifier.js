// src/utils/imdVerifier.js
const env = import.meta.env;
const IMD_URL = env.VITE_IMD_API_URL || '';
const IMD_KEY = env.VITE_IMD_API_KEY || '';

export async function verifyWithIMD({ lat, lon, timestampISO }) {
  if (!IMD_URL) return { enabled: false };
  try {
    // Generic contract: GET ?lat=...&lon=...&time=...
    const url = new URL(IMD_URL);
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    if (timestampISO) url.searchParams.set('time', timestampISO);

    const res = await fetch(url.toString(), {
      headers: IMD_KEY ? { 'Authorization': `Bearer ${IMD_KEY}`  } : {},
      method: 'GET',
      cache: 'no-cache'
    });

    if (!res.ok) {
      return { enabled: true, status: 'error', httpStatus: res.status, raw: await res.text() };
    }
    const json = await res.json();
    // Expect json.active === true/false OR adjust to API schema
    const isActive = json?.active || json?.has_alert || false;
    return { enabled: true, status: isActive ? 'verified' : 'not_verified', raw: json, checkedAt: new Date().toISOString() };
  } catch (e) {
    console.warn('IMD verify failed', e);
    return { enabled: true, status: 'error', error: String(e), checkedAt: new Date().toISOString() };
  }
}

// src/utils/exifUtils.js
import ExifReader from 'exifreader';

export function degToDecimal(degArr, ref) {
  // degArr: [deg, min, sec] or rational objects
  const toNum = (v) => (Array.isArray(v) ? v.map(x => Number(x)) : [Number(v)]);
  const [d = 0, m = 0, s = 0] = toNum(degArr);
  const sign = ref && (ref === 'S' || ref === 'W') ? -1 : 1;
  return sign * (d + (m / 60) + (s / 3600));
}

export async function parseExifFromFile(file) {
  if (!file) return null;
  try {
    const buffer = await file.arrayBuffer();
    const tags = ExifReader.load(buffer, { expanded: true });
    
    // Date/time
    const dateTag = tags.DateTimeOriginal || tags.DateTime || tags['Date/Time Original'];
    const timestamp = dateTag?.description || dateTag?.value || null;

    // Coordinates
    const gpsLat = tags.GPSLatitude || tags.GPSLatitudeRef;
    const gpsLon = tags.GPSLongitude || tags.GPSLongitudeRef;
    let lat = null, lon = null;
    if (tags.GPSLatitude && tags.GPSLongitude) {
      const latRef = tags.GPSLatitudeRef?.description || tags.GPSLatitudeRef?.value || 'N';
      const lonRef = tags.GPSLongitudeRef?.description || tags.GPSLongitudeRef?.value || 'E';
      lat = degToDecimal(tags.GPSLatitude.value || tags.GPSLatitude, latRef);
      lon = degToDecimal(tags.GPSLongitude.value || tags.GPSLongitude, lonRef);
    }

    const make = tags.Make?.description || tags.Make?.value || null;
    const model = tags.Model?.description || tags.Model?.value || null;

    return {
      timestamp: timestamp ? new Date(timestamp).toISOString() : null,
      lat,
      lon,
      make,
      model,
      raw: tags
    };
  } catch (e) {
    console.warn('EXIF parse failed', e);
    return null;
  }
}

// small haversine (km)
export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1,lon1,lat2,lon2].some(v => v == null || Number.isNaN(v))) return Number.POSITIVE_INFINITY;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

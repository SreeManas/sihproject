# INCOIS Hazard Watch (Hackathon Prototype)

Crowdsourced hazard reporting + live map-based dashboard that combines citizen reports with a social media feed.

## Tech Stack
- React 19 + Vite
- Tailwind CSS
- Firebase (Firestore + Storage)
- Mapbox GL JS (clustering + heatmap)
- WebSocket demo server + HTTP proxy (Express + ws)
- Hugging Face inference (optional; rate-limited via `rateLimitManager`)

## Features
- Citizen Report form with auto-location, image upload (thumbnail + full), and Firestore write
- **Camera Capture**: Direct photo capture with EXIF metadata preservation for verification
- Offline queue and auto-sync on reconnect (localforage). Metadata sync only for demo.
- Dashboard with Mapbox, citizen clusters + social hotspots (heatmap & points)
- Social feed panel with keyword highlighting and virtualized list
- Real-time updates through WebSocket client with polling fallback
- Role-based access control (RBAC) for Analytics via Firebase Auth (demo Login/Register)
- Alerts workflow: threshold slider and Firestore `alerts` creation
- Multi-language support (English + 9 Indian languages) with Google Translate API integration

## Setup
1. Install dependencies
   ```bash
   npm install
   ```

2. Create `.env.local` (client) based on the following keys:
   ```env
   # Mapbox
   VITE_MAPBOX_TOKEN=your_mapbox_token

   # Firebase
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...

   # Real-time WS and proxy (optional)
   VITE_WS_URL=ws://localhost:5051
   VITE_PROXY_URL=http://localhost:5050

   # Hugging Face (optional)
   VITE_HF_API_KEY=your_hf_token
   VITE_HF_MULTILINGUAL_ENABLED=false

   # Social toggles
   VITE_USE_MOCK_SOCIAL=true
   ```

3. (Optional) Start the server proxy + WS demo
   ```bash
   cd server/proxy
   npm init -y
   npm i express ws node-fetch@2 dotenv cors
   cp .env.example .env
   # set TWITTER_BEARER in .env if using the proxy route
   node index.js
   ```

3. Configure Firebase Rules (dev-friendly example):
   Firestore (test):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true; // For hackathon only
       }
     }
   }
   ```
   Storage (test):
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true; // For hackathon only
       }
     }
   }
   ```

4. Run the app
   ```bash
   npm run dev
   ```

## Camera Capture Feature

The ReportForm now includes a camera capture feature that allows users to take photos directly with their device camera while preserving EXIF metadata for verification purposes.

### Key Features
- **Live Camera Preview**: Real-time camera feed with capture controls
- **EXIF Metadata Preservation**: Captures and preserves GPS coordinates, timestamps, and device information
- **Mobile-Optimized**: Automatic rear camera preference and location permission requests on mobile devices
- **Fallback Support**: Graceful handling when camera permissions are denied
- **Integration**: Seamlessly integrates with existing EXIF validation and upload workflow

### Testing the Camera Feature

#### Manual Testing
1. Open the application and navigate to the ReportForm
2. Click the "📷 Capture Photo with Camera" button
3. Grant camera permissions when prompted
4. (On mobile) Grant location permissions for enhanced GPS data
5. Take a photo using the camera interface
6. Verify EXIF data is displayed in the verification section
7. Submit the form to ensure proper upload

#### Automated Testing Page
A dedicated test page is available at `/public/camera-test.html` for isolated testing:

```bash
# After starting the dev server, visit:
http://localhost:5173/camera-test.html
```

This test page provides:
- Dependency availability checks
- Camera access testing
- Photo capture functionality
- EXIF data analysis and validation
- Integration test results

### EXIF Data Support
The system extracts and validates the following EXIF metadata:
- **GPS Coordinates**: Latitude and longitude from device GPS
- **Timestamp**: Original photo capture time
- **Device Information**: Camera make and model
- **Technical Data**: Exposure settings, ISO, focal length (when available)

### Browser Compatibility
- **Mobile Devices**: Full EXIF support including GPS data
- **Desktop**: Limited EXIF data (no GPS unless location permissions granted)
- **HTTPS Required**: Camera access requires secure context (except localhost)

### Troubleshooting
- **Camera not working**: Ensure HTTPS (except localhost) and check browser permissions
- **No GPS data**: Grant location permissions, especially on mobile devices
- **EXIF data missing**: Some browsers/devices limit EXIF data; this is expected behavior
- **Upload failures**: Check Firebase Storage configuration and network connectivity

## Project Structure (highlights)
- `src/components/`
  - `Dashboard.jsx` – Mapbox map + social overlays and controls
  - `ReportForm.jsx` – citizen report form (media upload + offline queue)
  - `AnalyticsDashboard.jsx` – charts, alerts slider, acknowledge UI
  - `auth/` – `AuthProvider.jsx`, `LoginForm.jsx`, `PermissionGuard.jsx`
  - `RealTimeStatusIndicator.jsx` – connection status badge
- `src/services/`
  - `reportService.js` – Firestore listeners/submission
  - `storageService.js` – Firebase Storage upload + thumbnails
  - `socialMapService.js` – social fetcher with mock/proxy
- `src/utils/`
  - `socialHotspotUtils.js` – posts → GeoJSON and heat/hex aggregations
  - `offlineSync.js` – offline queue and auto-sync
  - `enhancedHybridNLP.js` + `huggingfaceUtils.js` – classification and stubs
  - `rateLimitManager.js` – shared rate limiting and caching
- `server/proxy/` – Express proxy and WS broadcaster

## Notes
- Set `VITE_USE_MOCK_SOCIAL=true` for demo hotspots. Use the proxy route when you have API access.
- WebSocket demo runs on `ws://localhost:5051` and emits mock posts every few seconds.
- This is a hackathon prototype; do not use permissive rules in production.
# sihproject-update

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
- Offline queue and auto-sync on reconnect (localforage). Metadata sync only for demo.
- Dashboard with Mapbox, citizen clusters + social hotspots (heatmap & points)
- Social feed panel with keyword highlighting and virtualized list
- Real-time updates through WebSocket client with polling fallback
- Role-based access control (RBAC) for Analytics via Firebase Auth (demo Login/Register)
- Alerts workflow: threshold slider and Firestore `alerts` creation

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

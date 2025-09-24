import React, { useEffect, useState } from 'react';
import storageService from '../services/storageService.js';
import offlineSync from '../utils/offlineSync.js';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { parseExifFromFile, haversineKm } from '../utils/exifUtils.js';
import { verifyWithIMD } from '../utils/imdVerifier.js';
import { calculatePriorityScore } from '../utils/enhancedHybridNLP.js';
import { useT } from '../hooks/useT.js';
import CameraCapture from './CameraCapture.jsx';

const HAZARDS = ['Tsunami', 'Storm Surge', 'High Waves', 'Flood', 'Earthquake', 'Other'];

// Translation keys for static strings
const TRANSLATIONS = {
  reportSubmission: 'Report Submission',
  hazardType: 'Hazard Type',
  description: 'Description',
  photoVideo: 'Photo/Video (optional)',
  exifRequirement: '📸 Images must contain EXIF metadata (timestamp/location data) for verification',
  describeWhatYouSee: 'Describe what you see…',
  submitReport: 'Submit Report',
  fetchingLocation: 'Fetching location...',
  locationDetected: 'Location detected! Submitting report...',
  reportSubmitted: 'Report submitted successfully!',
  offlineQueued: 'Offline: report queued, will sync automatically when online.',
  imageVerification: '📸 Image Verification',
  photoTaken: 'Photo taken:',
  photoLocation: 'Photo location:',
  delayedUploadWarning: '⚠️ This photo was taken more than {hours} hours ago',
  locationMismatch: '📍 Photo location is {distance}km from your current location',
  locationMatch: '✅ Photo location matches your current location',
  usePhotoLocation: 'Use photo location instead of current location',
  videoNote: 'Video uploaded. Note: EXIF verification is only available for images.',
  selectImageVideo: 'Please select an image or video file.',
  noExifData: 'This image does not contain EXIF metadata. Please upload a photo taken with a camera that includes location/timestamp data.',
  exifParseFailed: 'Failed to read EXIF data from this image. Please upload a different photo with EXIF metadata.',
  exifLoaded: 'Image with EXIF data loaded successfully!',
  submissionValidation: 'Please upload an image with EXIF metadata or remove the file to submit without a photo.',
  capturePhoto: '📷 Capture Photo with Camera',
  orUploadFile: 'or upload a file from your device'
};

export default function ReportForm() {
  const [hazardType, setHazardType] = useState('Tsunami');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  
  // Translation hooks
  const tReportSubmission = useT(TRANSLATIONS.reportSubmission);
  const tHazardType = useT(TRANSLATIONS.hazardType);
  const tDescription = useT(TRANSLATIONS.description);
  const tPhotoVideo = useT(TRANSLATIONS.photoVideo);
  const tExifRequirement = useT(TRANSLATIONS.exifRequirement);
  const tDescribeWhatYouSee = useT(TRANSLATIONS.describeWhatYouSee);
  const tSubmitReport = useT(TRANSLATIONS.submitReport);
  const tFetchingLocation = useT(TRANSLATIONS.fetchingLocation);
  const tLocationDetected = useT(TRANSLATIONS.locationDetected);
  const tReportSubmitted = useT(TRANSLATIONS.reportSubmitted);
  const tOfflineQueued = useT(TRANSLATIONS.offlineQueued);
  const tImageVerification = useT(TRANSLATIONS.imageVerification);
  const tPhotoTaken = useT(TRANSLATIONS.photoTaken);
  const tPhotoLocation = useT(TRANSLATIONS.photoLocation);
  const tLocationMatch = useT(TRANSLATIONS.locationMatch);
  const tVideoNote = useT(TRANSLATIONS.videoNote);
  const tSelectImageVideo = useT(TRANSLATIONS.selectImageVideo);
  const tNoExifData = useT(TRANSLATIONS.noExifData);
  const tExifParseFailed = useT(TRANSLATIONS.exifParseFailed);
  const tExifLoaded = useT(TRANSLATIONS.exifLoaded);
  const tSubmissionValidation = useT(TRANSLATIONS.submissionValidation);
  const tCapturePhoto = useT(TRANSLATIONS.capturePhoto);
  const tOrUploadFile = useT(TRANSLATIONS.orUploadFile);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  // EXIF and verification state
  const [exifData, setExifData] = useState(null);
  const [exifLocationMatch, setExifLocationMatch] = useState(null);
  const [exifDistanceKm, setExifDistanceKm] = useState(null);
  const [delayedUpload, setDelayedUpload] = useState(false);
  const [imdVerification, setImdVerification] = useState({ enabled: false });
  const [useExifLocation, setUseExifLocation] = useState(false);
  
  // Camera modal state
  const [showCameraModal, setShowCameraModal] = useState(false);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        }
      );
    });
  };

  const validateExifData = (exif) => {
    // Check if file has meaningful EXIF data
    if (!exif) return false;
    
    // Require at least timestamp OR GPS coordinates
    const hasTimestamp = exif.timestamp !== null && exif.timestamp !== undefined;
    const hasLocation = exif.lat !== null && exif.lon !== null;
    const hasCameraInfo = exif.make !== null || exif.model !== null;
    
    // At least one of these should be present for valid EXIF
    return hasTimestamp || hasLocation || hasCameraInfo;
  };

  const processImageFile = async (imageFile) => {
    setFile(imageFile);
    
    // Clear previous preview and EXIF data before creating new ones
    if (thumbPreview) {
      URL.revokeObjectURL(thumbPreview);
    }
    
    setThumbPreview(URL.createObjectURL(imageFile));
    
    // Parse EXIF data and validate
    try {
      const exif = await parseExifFromFile(imageFile);
      
      if (!validateExifData(exif)) {
        // For camera-captured images, we'll be more lenient
        // Camera images might not have EXIF data, especially from web cameras
        console.log('No EXIF data found, but accepting camera-captured image');
        setStatus('Camera image captured (no EXIF data)');
        setExifData(null);
        setDelayedUpload(false);
        // Don't clear the file and preview - accept the image anyway
      } else {
        setExifData(exif);
        setStatus(tExifLoaded);
        
        // Check for delayed upload
        if (exif?.timestamp) {
          const exifTime = new Date(exif.timestamp);
          const now = new Date();
          const delayHours = (now - exifTime) / (1000 * 60 * 60);
          const delayThreshold = parseFloat(import.meta.env.VITE_EXIF_DELAY_HOURS) || 3;
          setDelayedUpload(delayHours > delayThreshold);
        }
      }
    } catch (error) {
      console.warn('EXIF parsing failed:', error);
      setStatus(tExifParseFailed);
      setFile(null);
      setThumbPreview(null);
      setExifData(null);
      setDelayedUpload(false);
    }
  };

  const handleCameraPhoto = async (capturedFile) => {
    // Process the captured photo the same way as uploaded files
    await processImageFile(capturedFile);
    setShowCameraModal(false);
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    
    if (!f) {
      setFile(null);
      setThumbPreview(null);
      setExifData(null);
      setDelayedUpload(false);
      return;
    }
    
    // Validate file type
    const isImage = /^image\//i.test(f.type);
    const isVideo = /^video\//i.test(f.type);
    
    if (!isImage && !isVideo) {
      setStatus(tSelectImageVideo);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    // For videos, we'll accept them but note that EXIF validation may not apply
    if (isVideo) {
      setFile(f);
      setThumbPreview(null); // Videos don't show thumbnail preview
      setExifData(null);
      setDelayedUpload(false);
      setStatus(tVideoNote);
      return;
    }
    
    // For images, validate EXIF data
    await processImageFile(f);
  };

  const submitOnline = async (locationCoords) => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    // A user must be logged in to submit a report with a file
    if (!user) {
      throw new Error('You must be logged in to submit a report.');
    }

    let fileUrl = null,
      thumbUrl = null;

    if (file) {
      // ✅ CHANGED: Pass the user's ID to the upload function
      const up = await storageService.uploadFile(file, user.uid);
      fileUrl = up.fileUrl;
      thumbUrl = up.thumbUrl;
    }

    // Determine final location coordinates
    const finalCoords = useExifLocation && exifData?.lat && exifData?.lon
      ? { latitude: exifData.lat, longitude: exifData.lon }
      : locationCoords;

    // Calculate distance between browser location and EXIF location
    if (exifData?.lat && exifData?.lon) {
      const distance = haversineKm(
        locationCoords.latitude,
        locationCoords.longitude,
        exifData.lat,
        exifData.lon
      );
      setExifDistanceKm(distance);
      
      const locationThreshold = parseFloat(import.meta.env.VITE_EXIF_LOCATION_KM) || 5;
      setExifLocationMatch(distance <= locationThreshold);
    }

    // Call IMD API for verification
    let imdResult = { enabled: false };
    if (finalCoords.latitude && finalCoords.longitude) {
      imdResult = await verifyWithIMD({
        lat: finalCoords.latitude,
        lon: finalCoords.longitude,
        timestampISO: exifData?.timestamp || new Date().toISOString()
      });
      setImdVerification(imdResult);
    }

    // Calculate priority score with verification metadata
    const priorityScore = calculatePriorityScore(
      { label: hazardType, confidence: 0.8 },
      [],
      { likes: 0, shares: 0, comments: 0 },
      {
        delayedUpload,
        exifLocationMatch,
        imdVerification: imdResult
      }
    );

    await addDoc(collection(db, 'reports'), {
      hazardType,
      description,
      location: finalCoords,
      fileUrl,
      thumbUrl,
      userId: user.uid, // Use the definite user.uid
      createdAt: serverTimestamp(),
      priorityScore,
      // Verification fields
      exifData,
      exifLocationMatch,
      exifDistanceKm,
      delayedUpload,
      imdVerification,
      browserLocation: locationCoords
    });
  };

  async function onSubmit(e) {
    e.preventDefault();
    
    // Validate that if a file is uploaded, it must have EXIF data
    if (file && /^image\//i.test(file.type) && !validateExifData(exifData)) {
      setStatus(tSubmissionValidation);
      return;
    }
    
    setLoading(true);
    setStatus(tFetchingLocation);
    
    try {
      // Fetch GPS coordinates only when submitting
      const locationCoords = await getCurrentLocation();
      setCoords(locationCoords);
      setStatus(tLocationDetected);
      
      if (navigator.onLine) {
        await submitOnline(locationCoords);
        setStatus(tReportSubmitted);
      } else {
        await offlineSync.enqueueReport({ hazardType, description, coords: locationCoords, fileName: file?.name || null });
        setStatus(tOfflineQueued);
      }
      
      // Reset form on successful submission
      setDescription('');
      setFile(null);
      setThumbPreview(null);
      setCoords({ latitude: null, longitude: null });
      setExifData(null);
      setExifLocationMatch(null);
      setExifDistanceKm(null);
      setDelayedUpload(false);
      setImdVerification({ enabled: false });
      setUseExifLocation(false);
      e.target.reset(); // This clears the file input
    } catch (e) {
      console.error('Submission failed:', e);
      // Fallback to offline queue even if online submission fails
      await offlineSync.enqueueReport({ hazardType, description, coords: { latitude: null, longitude: null }, fileName: file?.name || null });
      setStatus(`Error: ${e.message}. Report queued for later sync.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold mb-4">{tReportSubmission}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">{tHazardType}</label>
          <select className="input" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
            {HAZARDS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">{tDescription}</label>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tDescribeWhatYouSee}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            {tPhotoVideo}
            <span className="text-xs text-gray-500 block mt-1">
              {tExifRequirement}
            </span>
          </label>
          
          {/* Camera Capture Button */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tCapturePhoto}
            </button>
          </div>
          
          {/* File Upload Option */}
          <div className="text-center mb-3">
            <span className="text-sm text-gray-500">{tOrUploadFile}</span>
          </div>
          
          <input className="input" type="file" accept="image/*,video/*" onChange={handleFile} />
          {thumbPreview && (
            <div className="mt-2">
              <img alt="preview" src={thumbPreview} className="max-w-xs rounded border" />
            </div>
          )}
          
          {/* EXIF Verification Info */}
          {exifData && (
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <h4 className="text-sm font-medium mb-2">{tImageVerification}</h4>
              
              {exifData.timestamp && (
                <p className="text-xs text-gray-600 mb-1">
                  <strong>{tPhotoTaken}</strong> {new Date(exifData.timestamp).toLocaleString()}
                </p>
              )}
              
              {exifData.lat && exifData.lon && (
                <p className="text-xs text-gray-600 mb-1">
                  <strong>{tPhotoLocation}</strong> {exifData.lat.toFixed(4)}, {exifData.lon.toFixed(4)}
                </p>
              )}
              
              {delayedUpload && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                  ⚠️ This photo was taken more than {import.meta.env.VITE_EXIF_DELAY_HOURS || 3} hours ago
                </div>
              )}
              
              {exifLocationMatch === false && exifDistanceKm !== null && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                  📍 Photo location is {exifDistanceKm.toFixed(1)}km from your current location
                </div>
              )}
              
              {exifLocationMatch === true && (
                <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                  ✅ Photo location matches your current location
                </div>
              )}
              
              {exifData.lat && exifData.lon && (
                <div className="mt-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={useExifLocation}
                      onChange={(e) => setUseExifLocation(e.target.checked)}
                      className="mr-2"
                    />
                    Use photo location instead of current GPS location
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-600">
          <p className="text-xs text-blue-600">📍 Your GPS location will be automatically captured when you submit the report</p>
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : tSubmitReport}
        </button>
        {status && <p className="text-sm mt-2 text-gray-700">{status}</p>}
      </form>
      
      {/* Camera Capture Modal */}
      {showCameraModal && (
        <CameraCapture
          onPhotoCaptured={handleCameraPhoto}
          onClose={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
}
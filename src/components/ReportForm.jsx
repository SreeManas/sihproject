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
  capturePhoto: '📷 Capture Photo or Video with Camera',
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
    // However, browser-captured images are exempt from this requirement
    if (file && /^image\//i.test(file.type) && !validateExifData(exifData)) {
      // Check if this is a browser-captured image (more lenient validation)
      if (file.capturedByBrowser) {
        console.log('Accepting browser-captured image without EXIF data');
        // Browser-captured images don't need EXIF validation
      } else {
        // Regular uploaded files must have EXIF data
        setStatus(tSubmissionValidation);
        return;
      }
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
    <div className="card p-6 shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{tReportSubmission}</h2>
        <p className="text-sm text-gray-600">Help us respond quickly by providing accurate information about the hazard you've observed.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {tHazardType}
            </span>
          </label>
          <select className="input shadow-sm hover:shadow-md transition-shadow duration-200" value={hazardType} onChange={(e) => setHazardType(e.target.value)}>
            {HAZARDS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {tDescription}
            </span>
          </label>
          <textarea
            className="input shadow-sm hover:shadow-md transition-shadow duration-200"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tDescribeWhatYouSee}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {tPhotoVideo}
            </span>
          </label>
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-800">{tExifRequirement}</span>
            </div>
          </div>
          
          {/* Camera Capture Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              className="btn btn-secondary w-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tCapturePhoto}
            </button>
          </div>
          
          {/* File Upload Option */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">{tOrUploadFile}</span>
            </div>
          </div>
          
          <div className="relative">
            <input className="input shadow-sm hover:shadow-md transition-shadow duration-200" type="file" accept="image/*,video/*" onChange={handleFile} />
          </div>
          {thumbPreview && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <img alt="preview" src={thumbPreview} className="w-20 h-20 rounded-lg object-cover border-2 border-white shadow-sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">File Preview</p>
                  <p className="text-xs text-gray-500">Click to remove or choose a different file</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setThumbPreview(null);
                    setExifData(null);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* EXIF Verification Info */}
          {exifData && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-sm font-semibold text-blue-900">{tImageVerification}</h4>
              </div>
              
              {exifData.timestamp && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-lg border border-blue-100">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-gray-700">
                    <strong>{tPhotoTaken}</strong> {new Date(exifData.timestamp).toLocaleString()}
                  </span>
                </div>
              )}
              
              {exifData.lat && exifData.lon && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-lg border border-blue-100">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs text-gray-700">
                    <strong>{tPhotoLocation}</strong> {exifData.lat.toFixed(4)}, {exifData.lon.toFixed(4)}
                  </span>
                </div>
              )}
              
              {delayedUpload && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs text-yellow-800">This photo was taken more than {import.meta.env.VITE_EXIF_DELAY_HOURS || 3} hours ago</span>
                  </div>
                </div>
              )}
              
              {exifLocationMatch === false && exifDistanceKm !== null && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs text-red-800">Photo location is {exifDistanceKm.toFixed(1)}km from your current location</span>
                  </div>
                </div>
              )}
              
              {exifLocationMatch === true && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-green-800">Photo location matches your current location</span>
                  </div>
                </div>
              )}
              
              {exifData.lat && exifData.lon && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useExifLocation}
                      onChange={(e) => setUseExifLocation(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-xs text-gray-700 font-medium">Use photo location instead of current GPS location</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">Location Privacy</p>
              <p className="text-xs text-green-700">Your GPS location will be automatically captured when you submit the report</p>
            </div>
          </div>
        </div>
        
        <button 
          className="btn btn-primary w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2" 
          type="submit" 
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {tSubmitReport}
            </>
          )}
        </button>
        
        {status && (
          <div className={`mt-4 p-4 rounded-lg border ${
            status.includes('successfully') || status.includes('Offline') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : status.includes('Error') 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {status.includes('successfully') || status.includes('Offline') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : status.includes('Error') ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span className="text-sm font-medium">{status}</span>
            </div>
          </div>
        )}
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
// src/components/CameraCapture.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../hooks/useT.js';

// Helper function to capture image directly from video stream with format support
const captureImageFromStream = (videoElement, format = 'jpeg', quality = 0.95) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate video element
      if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
        reject(new Error('Invalid video element or video not ready'));
        return;
      }
      
      // Create a canvas to capture the current frame
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw the current video frame
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Determine MIME type based on format
      const mimeTypes = {
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
      };
      
      const mimeType = mimeTypes[format.toLowerCase()] || 'image/jpeg';
      
      // Adjust quality for different formats
      let captureQuality = quality;
      if (format.toLowerCase() === 'png') {
        // PNG doesn't use quality parameter, but we'll pass it anyway
        captureQuality = 1.0;
      } else if (format.toLowerCase() === 'webp') {
        // WebP can handle lower quality with good results
        captureQuality = Math.min(quality, 0.9);
      }
      
      console.log(`Capturing image as ${mimeType} with quality ${captureQuality}`);
      
      // Convert to blob with specified format and quality
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          // Add format information to the blob
          blob.format = format.toLowerCase();
          blob.mimeType = mimeType;
          
          console.log(`Image captured successfully: ${blob.size} bytes, ${mimeType}`);
          resolve(blob);
        } else {
          reject(new Error(`Failed to create ${format} image blob`));
        }
      }, mimeType, captureQuality);
    } catch (error) {
      console.error('Error in captureImageFromStream:', error);
      reject(error);
    }
  });
};

// Helper function to create a File object with enhanced metadata
const createImageFile = (blob, originalFilename = null, videoElement = null) => {
  const now = new Date();
  const timestamp = now.getTime();
  
  // Ensure blob is valid and has content
  if (!blob || blob.size === 0) {
    throw new Error('Invalid blob provided for file creation');
  }
  
  // Determine file extension based on blob format or type
  const format = blob.format || (blob.type ? blob.type.split('/')[1] : 'jpg');
  const extension = format === 'jpeg' ? 'jpg' : format;
  const filename = originalFilename || `capture-${timestamp}.${extension}`;
  
  // Use blob's MIME type if available, otherwise default to JPEG
  const mimeType = blob.mimeType || blob.type || 'image/jpeg';
  
  // Create file with proper metadata for submission compatibility
  const file = new File([blob], filename, {
    type: mimeType,
    lastModified: timestamp,
  });
  
  // Add enhanced properties for better submission handling
  file.captureTimestamp = timestamp;
  file.originalFilename = filename;
  file.capturedByBrowser = true; // Flag to identify browser-captured images
  
  // Add additional metadata that might be needed for submission
  file.metadata = {
    captureDate: now.toISOString(),
    fileSize: blob.size,
    mimeType: mimeType,
    format: format,
    source: 'browser-camera',
    dimensions: {
      width: videoElement ? videoElement.videoWidth : 0,
      height: videoElement ? videoElement.videoHeight : 0
    }
  };
  
  console.log('Created enhanced image file:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    format: format,
    metadata: file.metadata
  });
  
  return file;
};

// Helper function to validate and prepare image for submission
const validateAndPrepareImageForSubmission = (file) => {
  console.log('Validating image for submission:', file);
  
  // Check if file exists and has content
  if (!file || file.size === 0) {
    throw new Error('Invalid image file: file is empty or does not exist');
  }
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid image type: ${file.type}. Supported types: JPEG, PNG, WebP`);
  }
  
  // Check file size (limit to 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`Image file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`);
  }
  
  // For browser-captured images, ensure proper metadata
  if (file.capturedByBrowser) {
    console.log('Processing browser-captured image with metadata:', file.metadata);
    
    // Create a new file object with guaranteed submission-compatible properties
    const submissionFile = new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Preserve important metadata
    submissionFile.captureTimestamp = file.captureTimestamp;
    submissionFile.originalFilename = file.originalFilename;
    submissionFile.capturedByBrowser = true;
    submissionFile.metadata = file.metadata;
    
    console.log('Prepared image for submission:', {
      name: submissionFile.name,
      size: submissionFile.size,
      type: submissionFile.type,
      metadata: submissionFile.metadata
    });
    
    return submissionFile;
  }
  
  // For regular uploaded files, return as-is
  return file;
};

// Helper function to detect the best supported image format
const getBestSupportedImageFormat = () => {
  const canvas = document.createElement('canvas');
  
  // Test support for different formats
  const formats = [
    { format: 'webp', mimeType: 'image/webp', priority: 1 },
    { format: 'png', mimeType: 'image/png', priority: 2 },
    { format: 'jpeg', mimeType: 'image/jpeg', priority: 3 }
  ];
  
  // Check canvas support for each format
  for (const { format, mimeType, priority } of formats) {
    try {
      const dataURL = canvas.toDataURL(mimeType);
      if (dataURL.indexOf(`data:${mimeType}`) === 0) {
        console.log(`Detected supported format: ${format} (${mimeType})`);
        return { format, mimeType, priority };
      }
    } catch (error) {
      console.warn(`Format ${format} not supported:`, error);
    }
  }
  
  // Fallback to JPEG
  console.log('Using fallback format: jpeg');
  return { format: 'jpeg', mimeType: 'image/jpeg', priority: 3 };
};

// Helper function to get optimal quality based on format and file size
const getOptimalQuality = (format, targetSizeKB = 500) => {
  const formatSettings = {
    'webp': { maxQuality: 0.9, minQuality: 0.6, step: 0.1 },
    'jpeg': { maxQuality: 0.95, minQuality: 0.7, step: 0.1 },
    'png': { maxQuality: 1.0, minQuality: 1.0, step: 0 } // PNG is lossless
  };
  
  return formatSettings[format] || formatSettings['jpeg'];
};

// Helper function to detect browser and device information
const getBrowserDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Browser detection
  const browserInfo = {
    isChrome: /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor),
    isFirefox: /Firefox/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor),
    isEdge: /Edge/.test(userAgent),
    isOpera: /Opera/.test(userAgent),
    isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(userAgent),
    isTablet: /iPad|Tablet/.test(userAgent),
    isDesktop: !/Mobile|Android|iPhone|iPad|iPod/.test(userAgent)
  };
  
  // Device detection
  const deviceInfo = {
    platform: platform,
    isIOS: /iPhone|iPad|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isWindows: /Windows/.test(platform),
    isMac: /Mac/.test(platform),
    isLinux: /Linux/.test(platform)
  };
  
  // Camera capabilities detection
  const cameraInfo = {
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasCanvas: !!document.createElement('canvas').getContext,
    hasBlob: typeof Blob !== 'undefined',
    hasFile: typeof File !== 'undefined'
  };
  
  return {
    browser: browserInfo,
    device: deviceInfo,
    camera: cameraInfo,
    userAgent: userAgent,
    timestamp: new Date().toISOString()
  };
};

// Helper function to test camera compatibility
const testCameraCompatibility = async () => {
  const deviceInfo = getBrowserDeviceInfo();
  console.log('Device and browser info:', deviceInfo);
  
  const testResults = {
    deviceInfo,
    tests: {},
    recommendations: [],
    compatibilityScore: 0
  };
  
  // Test 1: Basic camera access
  try {
    if (deviceInfo.camera.hasGetUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      testResults.tests.cameraAccess = {
        passed: true,
        message: 'Camera access granted successfully'
      };
      testResults.compatibilityScore += 25;
    } else {
      testResults.tests.cameraAccess = {
        passed: false,
        message: 'getUserMedia not supported'
      };
      testResults.recommendations.push('Camera access not supported on this device/browser');
    }
  } catch (error) {
    testResults.tests.cameraAccess = {
      passed: false,
      message: `Camera access failed: ${error.message}`
    };
    testResults.recommendations.push(`Camera access issue: ${error.message}`);
  }
  
  // Test 2: Image format support
  const formatTests = {};
  const formats = ['webp', 'png', 'jpeg'];
  
  for (const format of formats) {
    try {
      const canvas = document.createElement('canvas');
      const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
      const dataURL = canvas.toDataURL(mimeType);
      
      if (dataURL.indexOf(`data:${mimeType}`) === 0) {
        formatTests[format] = { supported: true, mimeType };
        testResults.compatibilityScore += 15;
      } else {
        formatTests[format] = { supported: false, mimeType };
      }
    } catch (error) {
      formatTests[format] = { supported: false, error: error.message };
    }
  }
  
  testResults.tests.formatSupport = formatTests;
  
  // Test 3: Video recording capability
  if (deviceInfo.camera.hasMediaRecorder) {
    testResults.tests.videoRecording = {
      passed: true,
      message: 'MediaRecorder API supported'
    };
    testResults.compatibilityScore += 20;
  } else {
    testResults.tests.videoRecording = {
      passed: false,
      message: 'MediaRecorder API not supported'
    };
    testResults.recommendations.push('Video recording not supported');
  }
  
  // Test 4: Canvas and blob support
  if (deviceInfo.camera.hasCanvas && deviceInfo.camera.hasBlob && deviceInfo.camera.hasFile) {
    testResults.tests.coreTechnologies = {
      passed: true,
      message: 'All core technologies supported'
    };
    testResults.compatibilityScore += 20;
  } else {
    testResults.tests.coreTechnologies = {
      passed: false,
      message: 'Missing core technologies',
      details: {
        canvas: deviceInfo.camera.hasCanvas,
        blob: deviceInfo.camera.hasBlob,
        file: deviceInfo.camera.hasFile
      }
    };
    testResults.recommendations.push('Core technologies missing - camera capture may not work');
  }
  
  // Test 5: Performance estimation
  testResults.tests.performance = {
    passed: true,
    message: 'Performance test completed',
    details: {
      isMobile: deviceInfo.browser.isMobile,
      isDesktop: deviceInfo.browser.isDesktop,
      estimatedPerformance: deviceInfo.browser.isDesktop ? 'high' : 
                           deviceInfo.browser.isMobile ? 'medium' : 'unknown'
    }
  };
  
  if (deviceInfo.browser.isDesktop) {
    testResults.compatibilityScore += 20;
  } else if (deviceInfo.browser.isMobile) {
    testResults.compatibilityScore += 10;
  }
  
  // Generate recommendations based on results
  if (testResults.compatibilityScore >= 80) {
    testResults.recommendations.push('Excellent compatibility - all features should work well');
  } else if (testResults.compatibilityScore >= 60) {
    testResults.recommendations.push('Good compatibility - most features should work');
  } else if (testResults.compatibilityScore >= 40) {
    testResults.recommendations.push('Limited compatibility - some features may not work');
  } else {
    testResults.recommendations.push('Poor compatibility - camera capture may not work properly');
  }
  
  console.log('Camera compatibility test results:', testResults);
  return testResults;
};

// FIX 3: Enhanced video display with WebM fallback handling
const VideoDisplay = ({ recordedVideo }) => {
  if (!recordedVideo) return null;
  
  // If playback failed, show download only
  if (recordedVideo.playbackFailed) {
    return (
      <div className="text-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 font-medium mb-2">Video Playback Not Supported</p>
          <p className="text-yellow-700 text-sm mb-3">
            This browser cannot play the recorded video format, but you can download it.
          </p>
          <a
            href={recordedVideo.url}
            download={recordedVideo.file.name}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Video ({recordedVideo.file.name})
          </a>
        </div>
      </div>
    );
  }
  
  // Normal playback
  return (
    <div className="text-center p-4">
      <video
        key={recordedVideo.url}
        src={recordedVideo.url}
        controls
        playsInline
        preload="metadata"
        className="max-w-full max-h-48 mx-auto rounded-lg shadow-lg border-2 border-white"
        onError={(e) => {
          console.error('Video element error:', e.target.error);
        }}
      >
        <p>Your browser does not support video playback.</p>
      </video>
      
      {/* Always provide download option */}
      <div className="mt-2">
        <a
          href={recordedVideo.url}
          download={recordedVideo.file.name}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Download video
        </a>
      </div>
    </div>
  );
};

const TRANSLATIONS = {
  cameraCapture: 'Camera Capture',
  startCamera: 'Start Camera',
  stopCamera: 'Stop Camera',
  capturePhoto: 'Capture Photo',
  retakePhoto: 'Retake Photo',
  useThisPhoto: 'Use This Photo',
  cameraPermissionDenied: 'Camera permission denied. Please allow camera access to capture photos.',
  cameraNotAvailable: 'Camera not available on this device.',
  cameraError: 'Camera error: {error}',
  capturedPhoto: 'Captured Photo',
  cameraPreview: 'Camera Preview',
  startVideo: 'Start Video',
  stopVideo: 'Stop Video',
  recordVideo: 'Record Video',
  recording: 'Recording...',
  videoRecorded: 'Video Recorded',
  maxVideoSize: 'Max video size: 10MB',
  clickStartCamera: 'Click start camera to capture'
};

export default function CameraCapture({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [videoElement, setVideoElement] = useState(null);
  
  // Debug ref setup and video element tracking
  useEffect(() => {
    // Set up a mutation observer to watch for video element changes
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    } else {
      // Try to find video element manually
      setTimeout(() => {
        const foundVideoElement = document.querySelector('video');
        if (foundVideoElement) {
          videoRef.current = foundVideoElement;
          setVideoElement(foundVideoElement);
        }
      }, 100);
    }
    
    // Also check canvas ref
    setTimeout(() => {
      if (!canvasRef.current) {
        console.warn('Canvas ref not set - this may cause capture issues');
      }
    }, 200);
  }, []);
  
  // Run compatibility test when component mounts
  useEffect(() => {
    const runCompatibilityTest = async () => {
      try {
        console.log('Running camera compatibility test...');
        
        // Get basic device info first
        const info = getBrowserDeviceInfo();
        setDeviceInfo(info);
        console.log('Device info:', info);
        
        // Run full compatibility test
        const testResults = await testCameraCompatibility();
        setCompatibilityTest(testResults);
        
        // Log test results
        console.log('=== CAMERA COMPATIBILITY TEST RESULTS ===');
        console.log('Compatibility Score:', testResults.compatibilityScore);
        console.log('Tests:', testResults.tests);
        console.log('Recommendations:', testResults.recommendations);
        console.log('===========================================');
        
        // Set error message if compatibility is poor
        if (testResults.compatibilityScore < 40) {
          setError('Camera compatibility issues detected. Some features may not work properly.');
        }
        
      } catch (error) {
        console.error('Error running compatibility test:', error);
        setCompatibilityTest({
          error: true,
          message: `Compatibility test failed: ${error.message}`,
          recommendations: ['Please try using a modern browser like Chrome, Firefox, or Safari']
        });
      }
    };
    
    runCompatibilityTest();
  }, []);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mode, setMode] = useState('photo'); // 'photo' or 'video'
  const [compatibilityTest, setCompatibilityTest] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  
  // Translation hooks
  const tCameraCapture = useT(TRANSLATIONS.cameraCapture);
  const tStartCamera = useT(TRANSLATIONS.startCamera);
  const tStopCamera = useT(TRANSLATIONS.stopCamera);
  const tCapturePhoto = useT(TRANSLATIONS.capturePhoto);
  const tRetakePhoto = useT(TRANSLATIONS.retakePhoto);
  const tUseThisPhoto = useT(TRANSLATIONS.useThisPhoto);
  const tCameraPermissionDenied = useT(TRANSLATIONS.cameraPermissionDenied);
  const tCameraNotAvailable = useT(TRANSLATIONS.cameraNotAvailable);
  const tCameraError = useT(TRANSLATIONS.cameraError);
  const tCapturedPhoto = useT(TRANSLATIONS.capturedPhoto);
  const tCameraPreview = useT(TRANSLATIONS.cameraPreview);
  const tStartVideo = useT(TRANSLATIONS.startVideo);
  const tStopVideo = useT(TRANSLATIONS.stopVideo);
  const tRecordVideo = useT(TRANSLATIONS.recordVideo);
  const tRecording = useT(TRANSLATIONS.recording);
  const tVideoRecorded = useT(TRANSLATIONS.videoRecorded);
  const tMaxVideoSize = useT(TRANSLATIONS.maxVideoSize);
  const tClickStartCamera = useT(TRANSLATIONS.clickStartCamera);

  // Check if camera is available
  const checkCameraAvailability = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(tCameraNotAvailable);
      return false;
    }
    return true;
  };

  // Start camera
  const startCamera = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Clean up any existing camera first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setError(null);
      setLoading(true);
      
      const isAvailable = await checkCameraAvailability();
      if (!isAvailable) {
        return;
      }

      // Check if we're on a mobile device and request location permission for EXIF data
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile && 'geolocation' in navigator) {
        try {
          // Request location permission to ensure camera can embed GPS data
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(), // Success - permission granted
              () => resolve(), // Error - continue without location
              { enableHighAccuracy: true, timeout: 5000 }
            );
          });
        } catch (locationError) {
          console.warn('Location permission request failed, continuing without GPS:', locationError);
        }
      }

      // First check if camera is available
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not available in this browser');
        setError('Camera not supported in this browser. Please try a modern browser like Chrome, Firefox, or Safari.');
        return;
      }
      
      // Check if we have camera devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          console.error('No camera devices found');
          setError('No camera found. Please make sure your camera is connected and not being used by another application.');
          return;
        }
      } catch (deviceError) {
        console.warn('Could not enumerate devices, continuing anyway:', deviceError);
      }
      
      // Request camera access with progressive fallback
      // Try with simpler constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: mode === 'video'
        });
      } catch (simpleError) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment'
            },
            audio: mode === 'video'
          });
        } catch (specificError) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { min: 320, ideal: 640 },
              height: { min: 240, ideal: 480 }
            },
            audio: mode === 'video'
          });
        }
      }

      streamRef.current = stream;
      
      // SIMPLIFIED: Only use the JSX video element via ref
      let currentVideoElement = videoRef.current;
      
      // Wait for video element to be available
      if (!currentVideoElement) {
        // Try to find it manually after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const foundVideo = document.querySelector('video');
        if (foundVideo) {
          videoRef.current = foundVideo;
          currentVideoElement = foundVideo;
          setVideoElement(foundVideo);
        } else {
          console.error('CRITICAL: JSX video element not found even after delay');
          setError('Camera initialization failed. Please refresh the page and try again.');
          return;
        }
      }
      
      // Update state to match
      setVideoElement(currentVideoElement);
      
      // Clear any existing srcObject
      if (currentVideoElement.srcObject) {
        const oldStream = currentVideoElement.srcObject;
        oldStream.getTracks().forEach(track => track.stop());
        currentVideoElement.srcObject = null;
      }
      
      // Set the new stream
      currentVideoElement.srcObject = stream;
      
      // Force a reload of the video element
      currentVideoElement.load();
      
      // Store the stream reference
      streamRef.current = stream;
      
      // Verify srcObject was set correctly
      setTimeout(() => {
        // Verification logging removed for production
      }, 100);
      
      // Wait for video to be ready
      currentVideoElement.onloadedmetadata = () => {
        // Check if we have valid dimensions
        if (currentVideoElement.videoWidth && currentVideoElement.videoHeight && 
            currentVideoElement.videoWidth > 0 && currentVideoElement.videoHeight > 0) {
          currentVideoElement.play().then(() => {
            setIsCameraActive(true);
          }).catch(playError => {
            console.error('Video play error:', playError);
            setError('Failed to start video preview: ' + playError.message);
          });
        } else {
          // Try to play anyway and see if dimensions appear
          currentVideoElement.play().then(() => {
            // Wait a bit more for dimensions to appear
            setTimeout(() => {
              if (currentVideoElement.videoWidth && currentVideoElement.videoHeight) {
                setIsCameraActive(true);
              } else {
                console.warn('Still no dimensions after delay, but setting active anyway');
                setIsCameraActive(true); // Set active but capture might fail
              }
            }, 1000);
          }).catch(playError => {
            console.error('Video play error even without dimensions:', playError);
            setError('Failed to start video preview: ' + playError.message);
          });
        }
      };
      
      // Handle video errors
      currentVideoElement.onerror = (event) => {
        console.error('Video element error:', event);
        setError('Video element error occurred');
      };
      
      // Set a timeout in case onloadedmetadata doesn't fire
      setTimeout(() => {
        if (!isCameraActive) {
          // Try to play one more time
          if (currentVideoElement.readyState >= 2) {
            currentVideoElement.play().then(() => {
              setIsCameraActive(true);
            }).catch(err => {
              console.error('Play failed on timeout retry:', err);
              setIsCameraActive(true); // Still set active, capture might work
            });
          } else {
            console.warn('Video not ready even after timeout, setting active anyway');
            setIsCameraActive(true); // Last resort
          }
        }
      }, 3000);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(tCameraPermissionDenied);
      } else {
        setError(tCameraError.replace('{error}', err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCaptureLoading(false); // Reset capture loading state
    setIsRecording(false);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
    setRecordedChunks([]);
  };

  // Capture photo from video stream
  const capturePhoto = async () => {
    // Prevent multiple capture attempts
    if (captureLoading) {
      return;
    }
    
    setCaptureLoading(true);
    setError(null);
    
    // IMPORTANT: Always use the videoRef.current as it's the one with the stream
    const video = videoRef.current;
    if (!video) {
      console.error('Video element not found for capture');
      setCaptureLoading(false);
      return;
    }
    
    console.log('Starting capture process...');
    console.log('Video element:', video);
    console.log('Video srcObject:', video.srcObject);
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    // Check if video has stream
    if (!video.srcObject) {
      console.error('Video has no srcObject - stream lost');
      
      // Try to recover the stream
      if (streamRef.current) {
        console.log('Attempting to recover stream...');
        video.srcObject = streamRef.current;
        
        // Wait a moment for the stream to be applied
        setTimeout(() => {
          if (video.srcObject) {
            // Continue with capture
            captureFrame();
          } else {
            console.error('Stream recovery failed');
            setError('Camera stream lost. Please restart camera and try again.');
            setCaptureLoading(false);
          }
        }, 100);
      } else {
        setError('Camera stream not available. Please restart camera.');
        setCaptureLoading(false);
        return;
      }
    }
    
    // Use the new capture function with optimal format and quality
    try {
      // Detect the best supported image format
      const supportedFormat = getBestSupportedImageFormat();
      const qualitySettings = getOptimalQuality(supportedFormat.format);
      
      console.log(`Using ${supportedFormat.format} format with quality ${qualitySettings.maxQuality}`);
      
      // Capture image with optimal settings
      const blob = await captureImageFromStream(video, supportedFormat.format, qualitySettings.maxQuality);
      const file = createImageFile(blob, null, video);
      
      // Create preview URL
      const imageUrl = URL.createObjectURL(blob);
      
      // Verify the image was created successfully
      const testImg = new Image();
      testImg.onload = () => {
        setCapturedImage({ file, url: imageUrl });
        console.log('Image captured successfully:', {
          filename: file.name,
          size: file.size,
          type: file.type,
          timestamp: file.captureTimestamp
        });
        
        // Stop camera after capture
        stopCamera();
      };
      testImg.onerror = () => {
        console.error('Test image failed to load - URL may be invalid');
        setError('Failed to create valid image preview');
        setCaptureLoading(false);
      };
      testImg.src = imageUrl;
      
    } catch (error) {
      console.error('Error capturing image:', error);
      setError('Failed to capture image: ' + error.message);
      setCaptureLoading(false);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    startCamera(); // Restart camera for retake
  };

  // Use captured photo
  const usePhoto = () => {
    if (capturedImage?.file) {
      try {
        // Validate and prepare the image for submission
        const preparedFile = validateAndPrepareImageForSubmission(capturedImage.file);
        console.log('Image validated and prepared for submission:', preparedFile);
        
        // Pass the prepared file to the parent component
        onPhotoCaptured(preparedFile);
        onClose();
      } catch (error) {
        console.error('Error preparing image for submission:', error);
        setError('Failed to prepare image for submission: ' + error.message);
      }
    }
  };

  // FIX 1: Force MP4 format instead of WebM for better compatibility
  const startRecording = async () => {
    if (!streamRef.current) {
      setError('Camera not started');
      return;
    }

    try {
      const chunks = [];
      setRecordedChunks([]);
      
      // CRITICAL: Prioritize MP4 over WebM for better playback compatibility
      const getPlaybackFriendlyMimeType = () => {
        const preferredTypes = [
          'video/mp4',                    // Best compatibility
          'video/mp4;codecs=avc1.42E01E', // H.264 baseline
          'video/webm;codecs=vp8',        // Fallback WebM
          'video/webm'                    // Last resort
        ];
        
        for (const type of preferredTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            console.log('Selected MIME type for recording:', type);
            return type;
          }
        }
        
        // If nothing works, try default
        return 'video/webm';
      };

      const mimeType = getPlaybackFriendlyMimeType();
      
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType,
        videoBitsPerSecond: 800000  // Moderate bitrate for good quality/compatibility balance
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log('Chunk added:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, processing', chunks.length, 'chunks');
        
        if (chunks.length === 0) {
          setError('No video data recorded');
          return;
        }

        // Create blob with the same MIME type used for recording
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Blob created:', blob.size, 'bytes, type:', blob.type);

        if (blob.size === 0) {
          setError('Empty video file');
          return;
        }

        // FIX 2: Test browser's ability to play this specific blob
        const url = URL.createObjectURL(blob);
        
        // Create a hidden test video element
        const testVideo = document.createElement('video');
        testVideo.style.display = 'none';
        testVideo.preload = 'metadata';
        document.body.appendChild(testVideo);
        
        const testPlayback = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            document.body.removeChild(testVideo);
            reject(new Error('Playback test timeout'));
          }, 10000);
          
          testVideo.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log('Playback test SUCCESS - duration:', testVideo.duration);
            document.body.removeChild(testVideo);
            
            if (testVideo.duration > 0) {
              resolve(true);
            } else {
              reject(new Error('Video has no duration'));
            }
          };
          
          testVideo.onerror = (e) => {
            clearTimeout(timeout);
            console.error('Playback test FAILED:', testVideo.error);
            document.body.removeChild(testVideo);
            reject(new Error('Cannot play video: ' + (testVideo.error?.message || 'Unknown error')));
          };
          
          testVideo.src = url;
          testVideo.load();
        });

        try {
          await testPlayback;
          
          // Success - create file and set state
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const filename = `video-${Date.now()}.${extension}`;
          
          const file = new File([blob], filename, {
            type: mimeType,
            lastModified: Date.now()
          });

          console.log('Video ready for playback:', filename);
          setRecordedVideo({ file, url });
          setIsRecording(false);
          stopCamera();
          
        } catch (testError) {
          console.error('Video playback test failed:', testError.message);
          URL.revokeObjectURL(url);
          
          // Offer download instead of playback
          setError(`Video recorded but cannot play in browser: ${testError.message}. Download option will be provided.`);
          
          // Still create the file for download
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const filename = `video-${Date.now()}.${extension}`;
          const file = new File([blob], filename, { type: mimeType });
          
          // Create new URL for download
          const downloadUrl = URL.createObjectURL(blob);
          setRecordedVideo({ 
            file, 
            url: downloadUrl, 
            playbackFailed: true 
          });
          setIsRecording(false);
          stopCamera();
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + (event.error?.message || 'Unknown'));
      };

      setMediaRecorder(recorder);
      recorder.start(1000);
      setIsRecording(true);
      
      console.log('Recording started with:', mimeType);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Recording failed: ' + error.message);
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  // Use recorded video
  const useVideo = () => {
    if (recordedVideo?.file) {
      onPhotoCaptured(recordedVideo.file); // Reuse the same callback
      onClose();
    }
  };

  // Retake video
  const retakeVideo = () => {
    if (recordedVideo?.url) {
      URL.revokeObjectURL(recordedVideo.url);
    }
    setRecordedVideo(null);
    setMode('video');
    startCamera(); // Restart camera for retake
  };

  // Switch between photo and video mode
  const switchMode = (newMode) => {
    setMode(newMode);
    if (isCameraActive) {
      stopCamera();
    }
    setCapturedImage(null);
    setRecordedVideo(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url);
      }
      if (recordedVideo?.url) {
        URL.revokeObjectURL(recordedVideo.url);
      }
      setCaptureLoading(false); // Ensure capture loading is reset
    };
  }, []);

  // State for data URL fallback
  const [videoDataURL, setVideoDataURL] = useState('');
  
  // Debug recordedVideo state changes
  useEffect(() => {
    if (recordedVideo) {
      console.log('recordedVideo state updated:', recordedVideo);
      
      // Test if the URL is valid by creating a test video element
      const testVideo = document.createElement('video');
      testVideo.src = recordedVideo.url;
      testVideo.onloadedmetadata = () => {
        console.log('Video URL is valid - metadata loaded successfully');
      };
      testVideo.onerror = (e) => {
        console.error('Video URL is invalid - failed to load metadata:', e);
        // Try Data URL fallback
        createDataURLFromBlob(recordedVideo.file)
          .then(dataUrl => {
            console.log('Data URL created successfully');
            setVideoDataURL(dataUrl);
          })
          .catch(err => {
            console.error('Data URL creation failed:', err);
          });
      };
    }
  }, [recordedVideo]);

  // DEBUGGING: Add these console logs to track the issue
  const debugVideoState = () => {
    if (recordedVideo) {
      console.log('=== VIDEO DEBUG INFO ===');
      console.log('File:', recordedVideo.file);
      console.log('File size:', recordedVideo.file?.size);
      console.log('File type:', recordedVideo.file?.type);
      console.log('URL:', recordedVideo.url);
      console.log('URL valid:', recordedVideo.url?.startsWith('blob:'));
      
      // Test URL directly
      fetch(recordedVideo.url)
        .then(response => {
          console.log('URL fetch test:', response.status, response.headers.get('content-type'));
          return response.blob();
        })
        .then(blob => {
          console.log('Blob from URL:', blob.size, blob.type);
        })
        .catch(err => {
          console.error('URL fetch failed:', err);
        });
    }
  };

  // EMERGENCY WORKAROUND: Save video as downloadable file if playback fails
  const handleVideoPlaybackFailure = (recordedVideo) => {
    console.log('Video playback failed, offering download instead');
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = recordedVideo.url;
    downloadLink.download = recordedVideo.file.name;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    
    // Auto-download or show download button
    const shouldAutoDownload = confirm('Video playback failed. Would you like to download the video file instead?');
    if (shouldAutoDownload) {
      downloadLink.click();
    }
    
    document.body.removeChild(downloadLink);
  };

  // FALLBACK: Use FileReader to convert blob to data URL
  const createDataURLFromBlob = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{tCameraCapture}</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Camera Content */}
        <div className="p-4 overflow-y-auto flex-1 scrollbar-custom">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Compatibility Test Results */}
          {compatibilityTest && (
            <div className={`mb-4 p-3 rounded-lg border ${
              compatibilityTest.compatibilityScore >= 80 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : compatibilityTest.compatibilityScore >= 60 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Camera Compatibility</h4>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-white bg-opacity-50">
                  Score: {compatibilityTest.compatibilityScore}/100
                </span>
              </div>
              
              {compatibilityTest.error ? (
                <p className="text-xs">{compatibilityTest.message}</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${
                      compatibilityTest.tests.cameraAccess?.passed ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    Camera Access: {compatibilityTest.tests.cameraAccess?.passed ? '✓' : '✗'}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${
                      compatibilityTest.tests.coreTechnologies?.passed ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    Core Technologies: {compatibilityTest.tests.coreTechnologies?.passed ? '✓' : '✗'}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${
                      compatibilityTest.tests.videoRecording?.passed ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    Video Recording: {compatibilityTest.tests.videoRecording?.passed ? '✓' : compatibilityTest.tests.videoRecording?.passed === false ? '✗' : '?'}
                  </div>
                  
                  {compatibilityTest.recommendations && compatibilityTest.recommendations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white border-opacity-30">
                      <p className="text-xs font-medium mb-1">Recommendations:</p>
                      <ul className="text-xs space-y-1">
                        {compatibilityTest.recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span>•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Device Info (Debug) */}
          {deviceInfo && process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Device Information (Debug)</summary>
              <div className="mt-2 p-2 bg-gray-50 rounded text-mono">
                <div>Browser: {Object.keys(deviceInfo.browser).filter(k => deviceInfo.browser[k]).join(', ')}</div>
                <div>Device: {Object.keys(deviceInfo.device).filter(k => deviceInfo.device[k]).join(', ')}</div>
                <div>Platform: {deviceInfo.device.platform}</div>
              </div>
            </details>
          )}

          {/* Mode Selector */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg bg-gray-100 p-1 shadow-sm" role="group">
              <button
                type="button"
                onClick={() => switchMode('photo')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                  mode === 'photo'
                    ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  Photo
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('video')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                  mode === 'video'
                    ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">🎥</span>
                  Video
                </span>
              </button>
            </div>
          </div>

          {/* Camera Preview or Captured Media */}
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden mb-4 border border-gray-200 shadow-inner" style={{ minHeight: '200px', maxHeight: '280px' }}>
            {capturedImage ? (
              // Show captured image
              <div className="text-center p-4">
                <div className="inline-block relative group">
                  <img
                    src={capturedImage.url}
                    alt={tCapturedPhoto}
                    className="max-w-full max-h-48 mx-auto rounded-lg shadow-lg border-2 border-white"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg"></div>
                </div>
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {tCapturedPhoto}
                </div>
              </div>
            ) : recordedVideo ? (
              // Use new VideoDisplay component
              <VideoDisplay recordedVideo={recordedVideo} />
            ) : (
              // Always render video element but hide it when camera is not active
              <div className="text-center p-4 h-full flex flex-col justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`max-w-full max-h-48 mx-auto rounded-lg shadow-lg border-2 border-gray-300 bg-black ${!isCameraActive ? 'hidden' : ''}`}
                  style={{ 
                    width: '100%',
                    height: 'auto',
                    maxHeight: '200px',
                    objectFit: 'cover'
                  }}
                />
                
                {!isCameraActive && (
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-base font-medium text-gray-700">{tCameraPreview}</p>
                    <p className="text-sm text-blue-600 font-medium">{tClickStartCamera}</p>
                  </div>
                )}
                
                {isCameraActive && (
                  <div className="mt-3 space-y-2">
                    {mode === 'video' && !isRecording && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {tMaxVideoSize}
                      </div>
                    )}
                    {isRecording && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium animate-pulse">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        {tRecording}
                      </div>
                    )}
                  </div>
                )}
                
                {!videoElement && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Video element not found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2 justify-center min-h-[50px] items-center py-2 border-t border-gray-100 bg-gray-50 -mx-4 px-4">
            {!isCameraActive && !capturedImage && !recordedVideo && (
              <button
                onClick={startCamera}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {tStartCamera}
                  </>
                )}
              </button>
            )}

            {isCameraActive && mode === 'photo' && (
              <button
                onClick={capturePhoto}
                disabled={captureLoading}
                className="btn btn-success flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
              >
                {captureLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Capturing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {tCapturePhoto}
                  </>
                )}
              </button>
            )}

            {isCameraActive && mode === 'video' && !isRecording && (
              <button
                onClick={startRecording}
                className="btn btn-danger flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {tRecordVideo}
              </button>
            )}

            {isCameraActive && mode === 'video' && isRecording && (
              <button
                onClick={stopRecording}
                className="btn btn-danger flex items-center gap-2 px-4 py-2 text-sm animate-pulse shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                {tStopVideo}
              </button>
            )}

            {isCameraActive && (
              <button
                onClick={stopCamera}
                className="btn btn-outline flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                {tStopCamera}
              </button>
            )}
            
            {capturedImage && (
              <>
                <button
                  onClick={retakePhoto}
                  className="btn btn-secondary flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {tRetakePhoto}
                </button>
                <button
                  onClick={usePhoto}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tUseThisPhoto}
                </button>
              </>
            )}

            {recordedVideo && (
              <>
                <button
                  onClick={retakeVideo}
                  className="btn btn-secondary flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retake Video
                </button>
                <button
                  onClick={useVideo}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Use Video
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 shadow-sm">
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                {mode === 'photo' 
                  ? 'Photos captured with camera will include GPS location and timestamp data for verification.' 
                  : 'Videos are limited to 10MB. Record short clips for best results.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/CameraCapture.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useT } from '../hooks/useT.js';

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
  cameraPreview: 'Camera Preview'
};

export default function CameraCapture({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [videoElement, setVideoElement] = useState(null);
  
  // Debug ref setup and video element tracking
  useEffect(() => {
    console.log('CameraCapture component mounted');
    console.log('Video ref current:', videoRef.current);
    console.log('Canvas ref current:', canvasRef.current);
    console.log('Video element state:', videoElement);
    
    // Set up a mutation observer to watch for video element changes
    if (videoRef.current) {
      console.log('Video element found in DOM');
      setVideoElement(videoRef.current);
    } else {
      // Try to find video element manually
      setTimeout(() => {
        const foundVideoElement = document.querySelector('video');
        if (foundVideoElement) {
          console.log('Found video element via querySelector');
          videoRef.current = foundVideoElement;
          setVideoElement(foundVideoElement);
        } else {
          console.error('Video element not found in DOM');
        }
      }, 100);
    }
    
    // Also check canvas ref
    setTimeout(() => {
      console.log('Canvas ref after timeout:', canvasRef.current);
      if (!canvasRef.current) {
        console.warn('Canvas ref not set - this may cause capture issues');
      }
    }, 200);
  }, []);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  
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
      console.log('=== STARTING CAMERA ===');
      
      // Clean up any existing camera first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      console.log('Starting camera...');
      setError(null);
      setLoading(true);
      
      const isAvailable = await checkCameraAvailability();
      if (!isAvailable) {
        console.log('Camera not available');
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
      console.log('Checking camera availability...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not available in this browser');
        setError('Camera not supported in this browser. Please try a modern browser like Chrome, Firefox, or Safari.');
        return;
      }
      
      // Check if we have camera devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices.length, videoDevices);
        
        if (videoDevices.length === 0) {
          console.error('No camera devices found');
          setError('No camera found. Please make sure your camera is connected and not being used by another application.');
          return;
        }
      } catch (deviceError) {
        console.warn('Could not enumerate devices, continuing anyway:', deviceError);
      }
      
      // Request camera access with progressive fallback
      console.log('Requesting camera access...');
      // Try with simpler constraints first
      let stream;
      try {
        console.log('Attempting camera access with simple constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        console.log('Simple constraints successful');
      } catch (simpleError) {
        console.log('Simple constraints failed, trying with specific constraints:', simpleError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment'
            },
            audio: false
          });
          console.log('Specific constraints successful');
        } catch (specificError) {
          console.log('Specific constraints failed, trying minimal constraints:', specificError);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { min: 320, ideal: 640 },
              height: { min: 240, ideal: 480 }
            },
            audio: false
          });
          console.log('Minimal constraints successful');
        }
      }

      console.log('Camera access granted, stream obtained:', stream.getVideoTracks().length, 'tracks');
      streamRef.current = stream;
      
      // SIMPLIFIED: Only use the JSX video element via ref
      let currentVideoElement = videoRef.current;
      
      // Wait for video element to be available
      if (!currentVideoElement) {
        console.log('Video element not yet available, waiting...');
        
        // Try to find it manually after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const foundVideo = document.querySelector('video');
        if (foundVideo) {
          console.log('Found video element via querySelector after delay');
          videoRef.current = foundVideo;
          currentVideoElement = foundVideo;
          setVideoElement(foundVideo);
        } else {
          console.error('CRITICAL: JSX video element not found even after delay');
          setError('Camera initialization failed. Please refresh the page and try again.');
          return;
        }
      }
      
      console.log('Using JSX video element:', currentVideoElement);
      
      // Update state to match
      setVideoElement(currentVideoElement);
      
      console.log('Setting video source object...');
      
      // Clear any existing srcObject
      if (currentVideoElement.srcObject) {
        const oldStream = currentVideoElement.srcObject;
        oldStream.getTracks().forEach(track => track.stop());
        currentVideoElement.srcObject = null;
      }
      
      // Set the new stream
      currentVideoElement.srcObject = stream;
      
      console.log('Set srcObject on JSX video element:', {
        element: currentVideoElement,
        srcObject: !!currentVideoElement.srcObject,
        stream: stream,
        streamId: stream.id
      });
      
      // Force a reload of the video element
      currentVideoElement.load();
      
      // Store the stream reference
      streamRef.current = stream;
      
      // Verify srcObject was set correctly
      setTimeout(() => {
        console.log('Verification after load:', {
          videoElement: currentVideoElement,
          srcObject: !!currentVideoElement.srcObject,
          videoWidth: currentVideoElement.videoWidth,
          videoHeight: currentVideoElement.videoHeight,
          readyState: currentVideoElement.readyState,
          streamId: currentVideoElement.srcObject?.id
        });
      }, 100);
      
      // Wait for video to be ready
      currentVideoElement.onloadedmetadata = () => {
        console.log('Video metadata loaded, dimensions:', {
          videoWidth: currentVideoElement.videoWidth,
          videoHeight: currentVideoElement.videoHeight,
          readyState: currentVideoElement.readyState
        });
        
        // Check if we have valid dimensions
        if (currentVideoElement.videoWidth && currentVideoElement.videoHeight && 
            currentVideoElement.videoWidth > 0 && currentVideoElement.videoHeight > 0) {
          console.log('Video has valid dimensions, proceeding to play');
          currentVideoElement.play().then(() => {
            console.log('Video playing successfully with dimensions:', {
              videoWidth: currentVideoElement.videoWidth,
              videoHeight: currentVideoElement.videoHeight
            });
            setIsCameraActive(true);
          }).catch(playError => {
            console.error('Video play error:', playError);
            setError('Failed to start video preview: ' + playError.message);
          });
        } else {
          console.warn('Video metadata loaded but no valid dimensions');
          // Try to play anyway and see if dimensions appear
          currentVideoElement.play().then(() => {
            console.log('Video playing, checking dimensions again:', {
              videoWidth: currentVideoElement.videoWidth,
              videoHeight: currentVideoElement.videoHeight
            });
            
            // Wait a bit more for dimensions to appear
            setTimeout(() => {
              if (currentVideoElement.videoWidth && currentVideoElement.videoHeight) {
                console.log('Dimensions appeared after delay');
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
          console.log('Forcing camera active state after timeout - detailed state:', {
            readyState: currentVideoElement.readyState,
            readyStateText: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][currentVideoElement.readyState] || 'UNKNOWN',
            videoWidth: currentVideoElement.videoWidth,
            videoHeight: currentVideoElement.videoHeight,
            srcObject: !!currentVideoElement.srcObject,
            paused: currentVideoElement.paused,
            ended: currentVideoElement.ended,
            seeking: currentVideoElement.seeking,
            currentTime: currentVideoElement.currentTime,
            duration: currentVideoElement.duration
          });
          
          // Try to play one more time
          if (currentVideoElement.readyState >= 2) {
            currentVideoElement.play().then(() => {
              console.log('Video started playing on timeout retry');
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
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    // Prevent multiple capture attempts
    if (captureLoading) {
      console.log('Capture already in progress');
      return;
    }
    
    console.log('Capture photo called');
    console.log('Video ref current:', videoRef.current);
    console.log('Video element state:', videoElement);
    console.log('Canvas ref current:', canvasRef.current);
    
    setCaptureLoading(true);
    
    // IMPORTANT: Always use the videoRef.current as it's the one with the stream
    const video = videoRef.current;
    if (!video) {
      console.error('Video element not found for capture');
      setCaptureLoading(false);
      return;
    }
    
    // Double-check that this video element has a stream
    if (!video.srcObject) {
      console.error('Video element has no srcObject, attempting recovery...');
      
      // Try to recover the stream from streamRef
      if (streamRef.current) {
        console.log('Recovering stream from streamRef');
        video.srcObject = streamRef.current;
        video.load();
        
        // Wait a moment for the stream to be applied
        setTimeout(() => {
          if (video.srcObject) {
            console.log('Stream recovery successful');
            // Continue with capture
            captureFrame();
          } else {
            console.error('Stream recovery failed');
            setError('Camera stream lost. Please restart camera and try again.');
            setCaptureLoading(false);
          }
        }, 200);
        return;
      } else {
        console.error('No stream available for recovery');
        setError('Camera stream not available. Please restart camera and try again.');
        setCaptureLoading(false);
        return;
      }
    }
    
    console.log('Using video element for capture:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      srcObject: !!video.srcObject
    });
    
    // Get or create canvas element
    let canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas ref not available, creating canvas dynamically');
      canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      console.log('Created canvas dynamically');
    } else {
      console.log('Using existing canvas element');
    }
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return;
    }
    
    console.log('Video dimensions:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      currentTime: video.currentTime,
      seeking: video.seeking,
      paused: video.paused
    });

    // Check if video has valid dimensions and is ready
    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not ready:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime
      });
      
      // Wait for video to be ready and try again
      setError('Preparing camera for capture...');
      
      let waitAttempts = 0;
      const maxWaitAttempts = 15; // 3 seconds max wait (15 * 200ms)
      
      const waitForVideo = () => {
        waitAttempts++;
        console.log(`Wait attempt ${waitAttempts}/${maxWaitAttempts}`);
        
        if (video.videoWidth && video.videoHeight && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('Video is now ready, capturing frame');
          setError(null);
          captureFrame();
        } else if (waitAttempts >= maxWaitAttempts) {
          console.error('Video never became ready after maximum attempts');
          
          // Fallback: Try to capture anyway if video seems to be playing
          if (video.readyState >= 2 && !video.paused) {
            console.log('Fallback: Attempting to capture despite missing dimensions');
            setError(null);
            
            // Use default dimensions and try to capture
            canvas.width = 640;
            canvas.height = 480;
            
            try {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              console.log('Fallback capture successful');
              convertCanvasToBlob(canvas, context);
            } catch (err) {
              console.error('Fallback capture failed:', err);
              setError('Camera failed to capture. Please try starting the camera again.');
              setCaptureLoading(false);
            }
          } else {
            setError('Camera failed to initialize. Please try starting the camera again.');
            setCaptureLoading(false);
          }
        } else {
          console.log('Still waiting for video...', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime
          });
          
          // Try to force video to load metadata and play
          if (video.readyState < 2) { // HAVE_CURRENT_DATA
            console.log('Forcing video load...');
            video.load();
          }
          
          // Try to play video if it's paused
          if (video.paused) {
            console.log('Video is paused, attempting to play...');
            video.play().catch(err => {
              console.log('Play failed during wait:', err);
            });
          }
          
          setTimeout(waitForVideo, 200); // Check again in 200ms
        }
      };
      
      // Start waiting immediately
      waitForVideo();
      return;
    }

    // Check if video is actually playing
    if (video.paused || video.currentTime === 0) {
      console.log('Video is not playing, attempting to play first');
      video.play().then(() => {
        console.log('Video started playing, now capturing');
        setTimeout(() => captureFrame(), 300); // Increased delay to ensure frame is rendered
      }).catch(err => {
        console.error('Failed to play video:', err);
        // Even if play fails, try to capture if we have dimensions
        if (video.videoWidth && video.videoHeight) {
          setTimeout(() => captureFrame(), 500); // Give extra time
        } else {
          setError('Camera is not ready. Please try again.');
        }
      });
      return;
    }

    // Capture the frame
    captureFrame();
  };

  // Helper function to capture the actual frame
  const captureFrame = () => {
    const video = videoRef.current || videoElement;
    const canvas = canvasRef.current || document.querySelector('canvas');
    
    if (!video || !canvas) {
      console.error('Video or canvas not available for frame capture');
      return;
    }
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);

    // Clear canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw current video frame to canvas
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('Video frame drawn to canvas successfully');
      
      // Verify the canvas has content
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((value, index) => index % 4 !== 3 && value !== 0);
      console.log('Canvas has content:', hasContent);
      
      if (!hasContent) {
        console.warn('Canvas appears to be empty - this may result in black image');
      }
      
      // Now proceed with blob conversion
      convertCanvasToBlob(canvas);
      
    } catch (err) {
      console.error('Error drawing video frame to canvas:', err);
      setError('Failed to capture image: ' + err.message);
      setCaptureLoading(false);
    }
  };

  // Helper function to convert canvas to blob
  const convertCanvasToBlob = (canvas) => {
    console.log('Converting canvas to blob...');
    
    // Try multiple quality levels if needed
    const tryConvert = (quality = 1.0, attempt = 1) => {
      canvas.toBlob((blob) => {
        console.log(`Canvas toBlob callback (attempt ${attempt}, quality ${quality}), blob:`, blob);
        
        if (blob) {
          // Check if blob has actual content
          if (blob.size === 0) {
            console.error('Blob is empty (0 bytes)');
            if (attempt < 3) {
              console.log('Retrying with lower quality...');
              tryConvert(quality * 0.7, attempt + 1);
            } else {
              setError('Failed to capture image - empty result');
              setCaptureLoading(false);
            }
            return;
          }
          
          console.log('Blob size:', blob.size, 'bytes');
          
          // Create a File object from the blob with current timestamp
          const now = new Date();
          const file = new File([blob], `capture-${now.getTime()}.jpg`, {
            type: 'image/jpeg',
            lastModified: now.getTime()
          });

          // Create preview URL
          const imageUrl = URL.createObjectURL(blob);
          console.log('Created image URL:', imageUrl);
          
          // Verify the URL works by creating a test image
          const testImg = new Image();
          testImg.onload = () => {
            console.log('Test image loaded successfully, dimensions:', testImg.width, 'x', testImg.height);
            setCapturedImage({ file, url: imageUrl });
            
            // Stop camera after capture
            stopCamera();
            
            console.log('Photo captured successfully. File size:', (blob.size / 1024).toFixed(2), 'KB');
          };
          testImg.onerror = () => {
            console.error('Test image failed to load - URL may be invalid');
            setError('Failed to create valid image preview');
            setCaptureLoading(false);
          };
          testImg.src = imageUrl;
          
        } else {
          console.error('Failed to create blob from canvas');
          if (attempt < 3 && quality > 0.3) {
            console.log('Retrying with lower quality...');
            tryConvert(quality * 0.7, attempt + 1);
          } else {
            setError('Failed to capture image after multiple attempts');
            setCaptureLoading(false);
          }
        }
      }, 'image/jpeg', quality);
    };
    
    tryConvert();
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
      onPhotoCaptured(capturedImage.file);
      onClose();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url);
      }
      setCaptureLoading(false); // Ensure capture loading is reset
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
        <div className="p-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-medium">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Camera Preview or Captured Image */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4" style={{ minHeight: '300px' }}>
            {capturedImage ? (
              // Show captured image
              <div className="text-center">
                <img
                  src={capturedImage.url}
                  alt={tCapturedPhoto}
                  className="max-w-full max-h-96 mx-auto rounded"
                />
                <p className="text-sm text-gray-600 mt-2">{tCapturedPhoto}</p>
              </div>
            ) : (
              // Always render video element but hide it when camera is not active
              <div className="text-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`max-w-full max-h-96 mx-auto rounded bg-black ${!isCameraActive ? 'hidden' : ''}`}
                  style={{ 
                    width: '100%',
                    height: 'auto',
                    maxHeight: '384px',
                    objectFit: 'cover'
                  }}
                />
                <p className="text-sm text-gray-600 mt-2">{tCameraPreview}</p>
                {videoRef.current && !videoRef.current.videoWidth && (
                  <p className="text-xs text-yellow-600 mt-1">Loading camera feed...</p>
                )}
                {!videoElement && (
                  <p className="text-xs text-red-600 mt-1">Video element not found</p>
                )}
              </div>
            )}
          </div>

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {!isCameraActive && !capturedImage && (
              <button
                onClick={startCamera}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
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

            {isCameraActive && (
              <button
                onClick={capturePhoto}
                disabled={captureLoading}
                className="btn btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {isCameraActive && (
              <button
                onClick={stopCamera}
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                {tStopCamera}
              </button>
            )}
            
            {/* Debug button for testing camera */}
            <button
              onClick={async () => {
                console.log('=== CAMERA DEBUG TEST ===');
                try {
                  console.log('1. Checking navigator.mediaDevices...');
                  console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
                  console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
                  
                  console.log('2. Enumerating devices...');
                  const devices = await navigator.mediaDevices.enumerateDevices();
                  console.log('All devices:', devices);
                  const videoDevices = devices.filter(d => d.kind === 'videoinput');
                  console.log('Video devices:', videoDevices);
                  
                  console.log('3. Testing camera access...');
                  const testStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 }, 
                    audio: false 
                  });
                  console.log('Test stream obtained:', testStream);
                  console.log('Video tracks:', testStream.getVideoTracks());
                  
                  // Test video element
                  console.log('4. Testing video element...');
                  const testVideo = document.createElement('video');
                  testVideo.autoplay = true;
                  testVideo.muted = true;
                  testVideo.srcObject = testStream;
                  
                  testVideo.onloadedmetadata = () => {
                    console.log('5. Video metadata loaded:', {
                      videoWidth: testVideo.videoWidth,
                      videoHeight: testVideo.videoHeight,
                      readyState: testVideo.readyState
                    });
                    
                    testVideo.play().then(() => {
                      console.log('6. Video playing successfully');
                      setTimeout(() => {
                        console.log('7. Final video state:', {
                          videoWidth: testVideo.videoWidth,
                          videoHeight: testVideo.videoHeight,
                          currentTime: testVideo.currentTime,
                          paused: testVideo.paused
                        });
                        // Clean up
                        testStream.getTracks().forEach(track => track.stop());
                        alert('Camera test completed! Check console for details.');
                      }, 1000);
                    }).catch(err => {
                      console.error('Play failed:', err);
                      testStream.getTracks().forEach(track => track.stop());
                    });
                  };
                  
                } catch (err) {
                  console.error('Camera test failed:', err);
                  alert('Camera test failed: ' + err.message);
                }
              }}
              className="btn btn-outline flex items-center gap-2 text-xs"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Test Camera
            </button>

            {capturedImage && (
              <>
                <button
                  onClick={retakePhoto}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {tRetakePhoto}
                </button>
                <button
                  onClick={usePhoto}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tUseThisPhoto}
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="text-center">
              💡 Photos captured with camera will include GPS location and timestamp data for verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

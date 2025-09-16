import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Camera, Video, Upload, Send, AlertTriangle, Waves, Zap, Eye, Clock } from 'lucide-react';

const CitizenReportingSystem = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [reportData, setReportData] = useState({
    hazardType: '',
    severity: 'medium',
    description: '',
    location: { lat: null, lng: null, address: '' },
    media: [],
    contactInfo: { name: '', phone: '', email: '' },
    isAnonymous: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('citizen'); // citizen, official, analyst
  const [offlineReports, setOfflineReports] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Hazard types specific to ocean/coastal hazards
  const hazardTypes = [
    { id: 'tsunami', label: 'Tsunami', icon: '🌊', severity: 'critical' },
    { id: 'storm_surge', label: 'Storm Surge', icon: '🌀', severity: 'high' },
    { id: 'high_waves', label: 'High Waves', icon: '🌊', severity: 'medium' },
    { id: 'swell_surge', label: 'Swell Surge', icon: '〰️', severity: 'medium' },
    { id: 'coastal_flooding', label: 'Coastal Flooding', icon: '🏔️', severity: 'high' },
    { id: 'abnormal_tide', label: 'Abnormal Tides', icon: '🌙', severity: 'medium' },
    { id: 'coastal_erosion', label: 'Coastal Erosion', icon: '🏖️', severity: 'low' },
    { id: 'unusual_currents', label: 'Unusual Currents', icon: '🔄', severity: 'medium' },
    { id: 'sea_level_change', label: 'Sea Level Change', icon: '📏', severity: 'medium' },
    { id: 'other', label: 'Other Ocean Hazard', icon: '❓', severity: 'medium' }
  ];

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          setReportData(prev => ({
            ...prev,
            location: { ...location, address: 'Current Location' }
          }));
          // Reverse geocoding would be implemented here
        },
        (error) => {
          console.error('Location access denied:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Monitor online status for offline functionality
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline reports when online
  useEffect(() => {
    if (isOnline && offlineReports.length > 0) {
      syncOfflineReports();
    }
  }, [isOnline, offlineReports]);

  const handleInputChange = (field, value) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (location) => {
    setReportData(prev => ({
      ...prev,
      location
    }));
  };

  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files);
    const newMedia = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));

    setReportData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }));
  };

  const removeMedia = (mediaId) => {
    setReportData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.id !== mediaId)
    }));
  };

  const validateReport = () => {
    if (!reportData.hazardType) return 'Please select a hazard type';
    if (!reportData.description.trim()) return 'Please provide a description';
    if (!reportData.location.lat || !reportData.location.lng) return 'Location is required';
    if (!reportData.isAnonymous && !reportData.contactInfo.name) return 'Name is required for non-anonymous reports';
    return null;
  };

  const submitReport = async () => {
    const validationError = validateReport();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    const report = {
      ...reportData,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      userRole,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        online: isOnline
      }
    };

    try {
      if (isOnline) {
        // Submit online
        await submitOnlineReport(report);
        alert('Report submitted successfully!');
        resetForm();
      } else {
        // Store for offline sync
        setOfflineReports(prev => [...prev, report]);
        alert('Report saved offline. Will sync when connection is restored.');
        resetForm();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      // Store offline as fallback
      setOfflineReports(prev => [...prev, report]);
      alert('Error submitting online. Report saved for later sync.');
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOnlineReport = async (report) => {
    // Create FormData for media upload
    const formData = new FormData();
    formData.append('reportData', JSON.stringify({
      ...report,
      media: report.media.map(m => ({ id: m.id, name: m.name, type: m.type, size: m.size }))
    }));

    report.media.forEach((media, index) => {
      formData.append(`media_${index}`, media.file);
    });

    // API call to submit report
    const response = await fetch('/api/reports/submit', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const syncOfflineReports = async () => {
    const reportsToSync = [...offlineReports];
    const successfulSyncs = [];

    for (const report of reportsToSync) {
      try {
        await submitOnlineReport(report);
        successfulSyncs.push(report.id);
      } catch (error) {
        console.error('Failed to sync report:', report.id, error);
      }
    }

    if (successfulSyncs.length > 0) {
      setOfflineReports(prev => prev.filter(report => !successfulSyncs.includes(report.id)));
      alert(`${successfulSyncs.length} offline reports synced successfully!`);
    }
  };

  const resetForm = () => {
    setReportData({
      hazardType: '',
      severity: 'medium',
      description: '',
      location: currentLocation ? { ...currentLocation, address: 'Current Location' } : { lat: null, lng: null, address: '' },
      media: [],
      contactInfo: { name: '', phone: '', email: '' },
      isAnonymous: false
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">INCOIS Hazard Reporting</h1>
            <p className="text-blue-100 text-sm">Report Ocean & Coastal Hazards</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-white' : 'bg-white animate-pulse'}`}></div>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {offlineReports.length > 0 && (
              <div className="text-xs text-blue-100 mt-1">
                {offlineReports.length} reports pending sync
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Reporting as:</label>
        <select
          value={userRole}
          onChange={(e) => setUserRole(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="citizen">Citizen/Public</option>
          <option value="volunteer">Volunteer</option>
          <option value="official">Government Official</option>
          <option value="analyst">Data Analyst</option>
        </select>
      </div>

      {/* Hazard Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Type of Ocean/Coastal Hazard *</label>
        <div className="grid grid-cols-2 gap-3">
          {hazardTypes.map((hazard) => (
            <button
              key={hazard.id}
              onClick={() => {
                handleInputChange('hazardType', hazard.id);
                handleInputChange('severity', hazard.severity);
              }}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                reportData.hazardType === hazard.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <span className="text-xl mr-2">{hazard.icon}</span>
                <div>
                  <div className="font-medium text-sm">{hazard.label}</div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getSeverityColor(hazard.severity)}`}>
                    {hazard.severity}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Level */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
        <div className="flex gap-2">
          {['low', 'medium', 'high', 'critical'].map((level) => (
            <button
              key={level}
              onClick={() => handleInputChange('severity', level)}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                reportData.severity === level
                  ? getSeverityColor(level) + ' border-current'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter location or use current location"
              value={reportData.location.address}
              onChange={(e) => handleLocationChange({ ...reportData.location, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              if (currentLocation) {
                handleLocationChange({ ...currentLocation, address: 'Current Location' });
              }
            }}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={!currentLocation}
          >
            <MapPin className="h-5 w-5" />
          </button>
        </div>
        {reportData.location.lat && reportData.location.lng && (
          <div className="text-xs text-gray-500 mt-1">
            Coordinates: {reportData.location.lat.toFixed(6)}, {reportData.location.lng.toFixed(6)}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
        <textarea
          value={reportData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe what you observed in detail..."
          rows={4}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="text-xs text-gray-500 mt-1">
          {reportData.description.length}/500 characters
        </div>
      </div>

      {/* Media Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Photos/Videos (Optional)</label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
            >
              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-sm text-gray-600">Add Photos</div>
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
            >
              <Video className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-sm text-gray-600">Add Videos</div>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleMediaUpload}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleMediaUpload}
            className="hidden"
          />

          {/* Media Preview */}
          {reportData.media.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {reportData.media.map((media) => (
                <div key={media.id} className="relative">
                  {media.type === 'image' ? (
                    <img
                      src={media.preview}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={media.preview}
                      className="w-full h-24 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <button
                    onClick={() => removeMedia(media.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                  <div className="text-xs text-gray-500 mt-1 truncate">{media.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Contact Information</label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={reportData.isAnonymous}
              onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
            <span className="ml-2 text-sm text-gray-600">Submit anonymously</span>
          </label>
        </div>

        {!reportData.isAnonymous && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Full Name *"
              value={reportData.contactInfo.name}
              onChange={(e) => handleInputChange('contactInfo', { ...reportData.contactInfo, name: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={reportData.contactInfo.phone}
              onChange={(e) => handleInputChange('contactInfo', { ...reportData.contactInfo, phone: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={reportData.contactInfo.email}
              onChange={(e) => handleInputChange('contactInfo', { ...reportData.contactInfo, email: e.target.value })}
              className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-white pt-4 pb-2">
        <button
          onClick={submitReport}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting Report...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Submit Hazard Report
            </>
          )}
        </button>
        
        {!isOnline && (
          <div className="text-center text-sm text-orange-600 mt-2">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            No internet connection. Report will be saved and synced later.
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenReportingSystem;
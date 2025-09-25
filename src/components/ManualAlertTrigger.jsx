import React, { useState, useEffect } from 'react';
import { getHighRiskAreas, createAlert } from '../services/alertService.js';
import { useAuth } from './auth/AuthProvider.jsx';

const HAZARD_TYPES = [
  'Tsunami', 'Cyclone', 'Storm Surge', 'High Waves', 
  'Flood', 'Landslide', 'Earthquake', 'Coastal Erosion', 'Other'
];

export default function ManualAlertTrigger() {
  const { role } = useAuth();
  const [highRiskAreas, setHighRiskAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [hazardType, setHazardType] = useState('Other');
  const [alertMessage, setAlertMessage] = useState('');
  const [status, setStatus] = useState('');

  // Only show for analysts and officials
  if (role !== 'analyst' && role !== 'official') {
    return null;
  }

  useEffect(() => {
    checkHighRiskAreas();
  }, []);

  const checkHighRiskAreas = async () => {
    setLoading(true);
    try {
      const areas = await getHighRiskAreas(200, '24h');
      setHighRiskAreas(areas);
    } catch (error) {
      console.error('Error checking high risk areas:', error);
      setStatus('Error checking for high-risk areas');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAlert = async () => {
    const finalArea = selectedArea === 'custom' ? customLocation : selectedArea;
    if (!finalArea || !hazardType) {
      setStatus('Please select an area and hazard type');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      await createAlert({
        area: finalArea,
        hazardType: hazardType,
        message: alertMessage || `${hazardType} alert activated for ${finalArea}`,
        severity: 'high',
        source: 'manual',
        triggeredBy: 'analyst'
      });

      setStatus(`Alert successfully activated for ${finalArea}`);
      setAlertMessage('');
      setSelectedArea('');
      setCustomLocation('');
      setHazardType('Other');
      
      // Refresh high risk areas
      await checkHighRiskAreas();
    } catch (error) {
      console.error('Error creating alert:', error);
      setStatus(`Error creating alert: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Manual Alert Trigger
      </h3>

      {/* High Risk Areas Warning */}
      {highRiskAreas.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-red-800">
              High-Risk Areas Detected (200+ reports in 24h)
            </span>
          </div>
          <div className="space-y-1">
            {highRiskAreas.slice(0, 3).map((area, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-red-700">{area.area}</span>
                <span className="font-medium text-red-900">{area.count} reports</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Creation Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area/Location *
          </label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="select w-full"
            disabled={loading}
          >
            <option value="">Select an area...</option>
            {highRiskAreas.map((area, index) => (
              <option key={index} value={area.area}>
                {area.area} ({area.count} reports)
              </option>
            ))}
            <option value="custom">Custom Location...</option>
          </select>
          {selectedArea === 'custom' && (
            <input
              type="text"
              placeholder="Enter custom location..."
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="input mt-2 w-full"
              disabled={loading}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hazard Type *
          </label>
          <select
            value={hazardType}
            onChange={(e) => setHazardType(e.target.value)}
            className="select w-full"
            disabled={loading}
          >
            {HAZARD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Message (Optional)
          </label>
          <textarea
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            placeholder="Additional details or instructions for citizens..."
            className="input w-full"
            rows={3}
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={checkHighRiskAreas}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            {loading ? 'Checking...' : 'Refresh Areas'}
          </button>

          <button
            onClick={handleActivateAlert}
            disabled={loading || !(selectedArea === 'custom' ? customLocation : selectedArea) || !hazardType}
            className="btn btn-danger btn-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3, 1.732 3z" />
            </svg>
            {loading ? 'Activating...' : 'Activate Alert'}
          </button>
        </div>

        {status && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            status.includes('Error') 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

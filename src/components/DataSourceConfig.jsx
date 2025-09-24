// src/components/DataSourceConfig.jsx
import React, { useState } from 'react';
import { useT } from '../hooks/useT.js';

const DataSourceConfig = ({ onConfigChange, currentConfig = {} }) => {
  const [config, setConfig] = useState({
    platforms: currentConfig.platforms || ['twitter', 'youtube', 'rss'],
    location: currentConfig.location || 'India',
    maxResults: currentConfig.maxResults || 100,
    realTime: currentConfig.realTime || false,
    refreshInterval: currentConfig.refreshInterval || 5,
    ...currentConfig
  });

  // Translation hooks
  const tDataSourceConfiguration = useT("Data Source Configuration");
  const tSocialMediaPlatforms = useT("Social Media Platforms");
  const tLocationFocus = useT("Location Focus");
  const tMaximumResults = useT("Maximum Results");
  const tEnableRealTimeUpdates = useT("Enable Real-time Updates");
  const tRefreshInterval = useT("Refresh Interval");
  const tMinutes = useT("minutes");
  const tCurrentConfiguration = useT("Current Configuration");
  const tPlatforms = useT("Platforms");
  const tLocation = useT("Location");
  const tMaxResults = useT("Max Results");
  const tRealTime = useT("Real-time");
  const tEnabled = useT("Enabled");
  const tDisabled = useT("Disabled");
  const tRefresh = useT("Refresh");
  const tEvery = useT("Every");

  const platformOptions = [
    { key: 'twitter', label: 'Twitter', icon: '🐦', color: 'text-blue-500' },
    { key: 'youtube', label: 'YouTube', icon: '📹', color: 'text-red-500' },
    { key: 'facebook', label: 'Facebook', icon: '📘', color: 'text-blue-600' },
    { key: 'rss', label: 'RSS News', icon: '📰', color: 'text-orange-500' }
  ];

  const locationOptions = [
    'India', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
    'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Gujarat', 'West Bengal', 'Odisha'
  ];

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const togglePlatform = (platform) => {
    const platforms = config.platforms.includes(platform)
      ? config.platforms.filter(p => p !== platform)
      : [...config.platforms, platform];
    handleConfigChange('platforms', platforms);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">{tDataSourceConfiguration}</h3>
      {/* Platform Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tSocialMediaPlatforms}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {platformOptions.map(platform => (
            <label key={platform.key} className="flex items-center">
              <input
                type="checkbox"
                checked={config.platforms.includes(platform.key)}
                onChange={() => togglePlatform(platform.key)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              />
              <span className="ml-2 flex items-center">
                <span className="mr-1">{platform.icon}</span>
                <span className={platform.color}>{platform.label}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tLocationFocus}
        </label>
        <select
          value={config.location}
          onChange={(e) => handleConfigChange('location', e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
        >
          {locationOptions.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      {/* Max Results */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tMaximumResults}: {config.maxResults}
        </label>
        <input
          type="range"
          min="50"
          max="500"
          step="25"
          value={config.maxResults}
          onChange={(e) => handleConfigChange('maxResults', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Real-time Toggle */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.realTime}
            onChange={(e) => handleConfigChange('realTime', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            {tEnableRealTimeUpdates}
          </span>
        </label>
      </div>

      {/* Refresh Interval */}
      {config.realTime && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tRefreshInterval}: {config.refreshInterval} {tMinutes}
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={config.refreshInterval}
            onChange={(e) => handleConfigChange('refreshInterval', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-gray-50 p-3 rounded-md">
        <h4 className="font-medium text-gray-900 mb-2">{tCurrentConfiguration}</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {tPlatforms}: {config.platforms.join(', ')}</li>
          <li>• {tLocation}: {config.location}</li>
          <li>• {tMaxResults}: {config.maxResults}</li>
          <li>• {tRealTime}: {config.realTime ? tEnabled : tDisabled}</li>
          {config.realTime && (
            <li>• {tRefresh}: {tEvery} {config.refreshInterval} {tMinutes}</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DataSourceConfig;

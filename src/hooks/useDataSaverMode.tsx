import { useState, useEffect } from 'react';
import { useNetworkQuality } from './useNetworkQuality';

export interface DataSaverSettings {
  enabled: boolean;
  autoDownloadMedia: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  videoAutoplay: boolean;
}

const DEFAULT_SETTINGS: DataSaverSettings = {
  enabled: false,
  autoDownloadMedia: true,
  imageQuality: 'high',
  videoAutoplay: true,
};

export const useDataSaverMode = () => {
  const networkQuality = useNetworkQuality();
  const [settings, setSettings] = useState<DataSaverSettings>(() => {
    const stored = localStorage.getItem('data-saver-settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  // Auto-enable data saver on slow networks
  useEffect(() => {
    if (networkQuality === 'slow' && !settings.enabled) {
      setSettings(prev => ({ ...prev, enabled: true, autoDownloadMedia: false }));
    }
  }, [networkQuality, settings.enabled]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('data-saver-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<DataSaverSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const toggleDataSaver = () => {
    setSettings(prev => ({
      ...prev,
      enabled: !prev.enabled,
      autoDownloadMedia: prev.enabled, // Enable download when turning off data saver
    }));
  };

  return {
    settings,
    updateSettings,
    toggleDataSaver,
    isSlowNetwork: networkQuality === 'slow',
  };
};

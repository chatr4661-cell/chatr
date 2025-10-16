import { useState, useEffect } from 'react';
import { useNetworkQuality } from './useNetworkQuality';

export interface LiteModeSettings {
  enabled: boolean;
  disableImages: boolean;
  disableAnimations: boolean;
  disableEmoji: boolean;
  textOnlyMode: boolean;
  reducePolling: boolean;
  disableRealtime: boolean;
}

const DEFAULT_LITE_SETTINGS: LiteModeSettings = {
  enabled: false,
  disableImages: true,
  disableAnimations: true,
  disableEmoji: false,
  textOnlyMode: false,
  reducePolling: true,
  disableRealtime: false,
};

export const useLiteMode = () => {
  const networkQuality = useNetworkQuality();
  const [settings, setSettings] = useState<LiteModeSettings>(() => {
    const stored = localStorage.getItem('lite-mode-settings');
    return stored ? JSON.parse(stored) : DEFAULT_LITE_SETTINGS;
  });

  // Auto-enable lite mode on 2G
  useEffect(() => {
    if (networkQuality === 'slow' && !settings.enabled) {
      setSettings(prev => ({
        ...prev,
        enabled: true,
        disableImages: true,
        disableAnimations: true,
        reducePolling: true,
      }));
    }
  }, [networkQuality, settings.enabled]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('lite-mode-settings', JSON.stringify(settings));
    
    // Apply animations CSS class
    if (settings.disableAnimations) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }
  }, [settings]);

  const toggleLiteMode = () => {
    setSettings(prev => ({
      ...prev,
      enabled: !prev.enabled,
      disableImages: !prev.enabled,
      disableAnimations: !prev.enabled,
      reducePolling: !prev.enabled,
    }));
  };

  const updateSettings = (updates: Partial<LiteModeSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return {
    settings,
    updateSettings,
    toggleLiteMode,
    isLiteModeActive: settings.enabled,
  };
};

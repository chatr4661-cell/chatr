import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Fast native key-value storage (like Twitter Lite cache)
 * Much faster than localStorage on mobile
 */
export const useNativeStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { value: storedValue } = await Preferences.get({ key });
          if (storedValue) {
            setValue(JSON.parse(storedValue));
          }
        } else {
          // Fallback to localStorage on web
          const storedValue = localStorage.getItem(key);
          if (storedValue) {
            setValue(JSON.parse(storedValue));
          }
        }
      } catch (error) {
        console.error('Error loading from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key]);

  const updateValue = async (newValue: T) => {
    try {
      setValue(newValue);
      
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key,
          value: JSON.stringify(newValue),
        });
      } else {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  const removeValue = async () => {
    try {
      setValue(initialValue);
      
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  };

  return { value, setValue: updateValue, removeValue, loading };
};

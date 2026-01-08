/**
 * IVR / Auto-Attendant Hook - Features #20-21
 * Automated call routing menus
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface IVRMenuItem {
  id: string;
  digit: string; // 0-9, *, #
  label: string;
  action: 'transfer' | 'voicemail' | 'submenu' | 'queue' | 'hangup' | 'callback';
  targetId?: string; // User ID, queue ID, or submenu ID
  targetName?: string;
}

export interface IVRMenu {
  id: string;
  name: string;
  greeting: string;
  items: IVRMenuItem[];
  timeout: number; // seconds
  invalidInputMessage: string;
  maxRetries: number;
}

export interface AutoAttendantSettings {
  enabled: boolean;
  businessHours: {
    enabled: boolean;
    schedule: {
      [day: number]: { start: string; end: string } | null;
    };
  };
  mainMenu: IVRMenu;
  afterHoursMenu?: IVRMenu;
  holidayDates: string[];
  holidayMenu?: IVRMenu;
}

const DEFAULT_MENU: IVRMenu = {
  id: 'main',
  name: 'Main Menu',
  greeting: 'Thank you for calling. Please listen to the following options.',
  items: [
    { id: '1', digit: '1', label: 'Sales', action: 'queue', targetId: 'sales' },
    { id: '2', digit: '2', label: 'Support', action: 'queue', targetId: 'support' },
    { id: '3', digit: '3', label: 'Billing', action: 'transfer', targetId: '' },
    { id: '0', digit: '0', label: 'Operator', action: 'transfer', targetId: '' },
  ],
  timeout: 10,
  invalidInputMessage: 'Sorry, that was not a valid option. Please try again.',
  maxRetries: 3,
};

const DEFAULT_SETTINGS: AutoAttendantSettings = {
  enabled: false,
  businessHours: {
    enabled: false,
    schedule: {
      0: null, // Sunday
      1: { start: '09:00', end: '17:00' },
      2: { start: '09:00', end: '17:00' },
      3: { start: '09:00', end: '17:00' },
      4: { start: '09:00', end: '17:00' },
      5: { start: '09:00', end: '17:00' },
      6: null, // Saturday
    },
  },
  mainMenu: DEFAULT_MENU,
  holidayDates: [],
};

export const useAutoAttendant = () => {
  const [settings, setSettings] = useState<AutoAttendantSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('ivr_settings')
        .eq('id', user.id)
        .single();

      if (profile?.ivr_settings) {
        const saved = profile.ivr_settings as unknown as AutoAttendantSettings;
        if (saved && typeof saved === 'object') {
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
        }
      }
    } catch (error) {
      console.error('[useAutoAttendant] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: AutoAttendantSettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('profiles')
        .update({ ivr_settings: newSettings as unknown as Json })
        .eq('id', user.id);

      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('[useAutoAttendant] Save error:', error);
      return false;
    }
  }, []);

  const toggleEnabled = useCallback(async (enabled: boolean) => {
    return saveSettings({ ...settings, enabled });
  }, [settings, saveSettings]);

  const updateMainMenu = useCallback(async (menu: IVRMenu) => {
    return saveSettings({ ...settings, mainMenu: menu });
  }, [settings, saveSettings]);

  const addMenuItem = useCallback(async (item: IVRMenuItem) => {
    const newMenu = { 
      ...settings.mainMenu, 
      items: [...settings.mainMenu.items, item] 
    };
    return saveSettings({ ...settings, mainMenu: newMenu });
  }, [settings, saveSettings]);

  const removeMenuItem = useCallback(async (itemId: string) => {
    const newMenu = {
      ...settings.mainMenu,
      items: settings.mainMenu.items.filter(i => i.id !== itemId)
    };
    return saveSettings({ ...settings, mainMenu: newMenu });
  }, [settings, saveSettings]);

  const isWithinBusinessHours = useCallback((): boolean => {
    if (!settings.businessHours.enabled) return true;

    const now = new Date();
    const day = now.getDay();
    const schedule = settings.businessHours.schedule[day];
    
    if (!schedule) return false;
    
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= schedule.start && currentTime <= schedule.end;
  }, [settings.businessHours]);

  const isHoliday = useCallback((): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    return settings.holidayDates.includes(today);
  }, [settings.holidayDates]);

  const getCurrentMenu = useCallback((): IVRMenu => {
    if (isHoliday() && settings.holidayMenu) {
      return settings.holidayMenu;
    }
    if (!isWithinBusinessHours() && settings.afterHoursMenu) {
      return settings.afterHoursMenu;
    }
    return settings.mainMenu;
  }, [isHoliday, isWithinBusinessHours, settings]);

  const processInput = useCallback((digit: string): IVRMenuItem | null => {
    const menu = getCurrentMenu();
    return menu.items.find(item => item.digit === digit) || null;
  }, [getCurrentMenu]);

  return {
    settings,
    loading,
    saveSettings,
    toggleEnabled,
    updateMainMenu,
    addMenuItem,
    removeMenuItem,
    isWithinBusinessHours,
    isHoliday,
    getCurrentMenu,
    processInput,
    reload: loadSettings,
  };
};

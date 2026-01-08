/**
 * Call Blocking & DND Hook - Features #11, #17-19
 * Do Not Disturb, Anonymous Rejection, Blacklist, Call Screening
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface BlockedNumber {
  id: string;
  number: string;
  name?: string;
  reason?: string;
  blockedAt: string;
}

export interface DNDSchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: number[];
  allowExceptions: string[];
}

interface CallBlockingSettings {
  dndEnabled: boolean;
  dndSchedule: DNDSchedule;
  blockAnonymous: boolean;
  blockUnknown: boolean;
  screenCalls: boolean;
  blockedNumbers: BlockedNumber[];
  allowedDuringDND: string[];
}

const DEFAULT_SETTINGS: CallBlockingSettings = {
  dndEnabled: false,
  dndSchedule: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    allowExceptions: [],
  },
  blockAnonymous: false,
  blockUnknown: false,
  screenCalls: false,
  blockedNumbers: [],
  allowedDuringDND: [],
};

export const useCallBlocking = () => {
  const [settings, setSettings] = useState<CallBlockingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: blocked } = await supabase
        .from('blocked_contacts')
        .select('*')
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('call_blocking_settings')
        .eq('id', user.id)
        .single();

      const savedSettings = profile?.call_blocking_settings as unknown as Partial<CallBlockingSettings> || {};

      setSettings({
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        blockedNumbers: (blocked || []).map(b => ({
          id: b.id,
          number: b.blocked_user_id,
          name: undefined,
          reason: b.reason || undefined,
          blockedAt: b.blocked_at || '',
        })),
      });
    } catch (error) {
      console.error('Failed to load call blocking settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: Partial<CallBlockingSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { blockedNumbers: _, ...settingsToSave } = { ...settings, ...newSettings };

      await supabase
        .from('profiles')
        .update({ call_blocking_settings: settingsToSave as unknown as Json })
        .eq('id', user.id);

      setSettings(s => ({ ...s, ...newSettings }));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }, [settings]);

  const toggleDND = useCallback(async (enabled?: boolean) => {
    const newState = enabled ?? !settings.dndEnabled;
    const success = await saveSettings({ dndEnabled: newState });
    if (success) {
      toast.success(newState ? 'Do Not Disturb enabled' : 'Do Not Disturb disabled');
    }
    return success;
  }, [settings.dndEnabled, saveSettings]);

  const setDNDSchedule = useCallback(async (schedule: DNDSchedule) => {
    return saveSettings({ dndSchedule: schedule });
  }, [saveSettings]);

  const setBlockAnonymous = useCallback(async (enabled: boolean) => {
    const success = await saveSettings({ blockAnonymous: enabled });
    if (success) {
      toast.success(enabled ? 'Anonymous calls will be blocked' : 'Anonymous calls allowed');
    }
    return success;
  }, [saveSettings]);

  const setBlockUnknown = useCallback(async (enabled: boolean) => {
    const success = await saveSettings({ blockUnknown: enabled });
    if (success) {
      toast.success(enabled ? 'Unknown callers will be blocked' : 'Unknown callers allowed');
    }
    return success;
  }, [saveSettings]);

  const setCallScreening = useCallback(async (enabled: boolean) => {
    const success = await saveSettings({ screenCalls: enabled });
    if (success) {
      toast.success(enabled ? 'Call screening enabled' : 'Call screening disabled');
    }
    return success;
  }, [saveSettings]);

  const blockNumber = useCallback(async (
    userId: string, 
    reason?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_contacts')
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
          reason,
        });

      if (error) throw error;

      await loadSettings();
      toast.success('Contact blocked');
      return true;
    } catch (error) {
      console.error('Failed to block number:', error);
      toast.error('Failed to block contact');
      return false;
    }
  }, [loadSettings]);

  const unblockNumber = useCallback(async (blockedId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_contacts')
        .delete()
        .eq('id', blockedId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSettings();
      toast.success('Contact unblocked');
      return true;
    } catch (error) {
      console.error('Failed to unblock:', error);
      toast.error('Failed to unblock contact');
      return false;
    }
  }, [loadSettings]);

  const shouldBlockCall = useCallback((
    callerId: string,
    isAnonymous: boolean = false,
    isInContacts: boolean = true
  ): { blocked: boolean; reason: string } => {
    if (settings.blockedNumbers.some(b => b.number === callerId)) {
      return { blocked: true, reason: 'Caller is blocked' };
    }

    if (isAnonymous && settings.blockAnonymous) {
      return { blocked: true, reason: 'Anonymous calls are blocked' };
    }

    if (!isInContacts && settings.blockUnknown) {
      return { blocked: true, reason: 'Unknown callers are blocked' };
    }

    if (settings.dndEnabled) {
      if (settings.allowedDuringDND.includes(callerId)) {
        return { blocked: false, reason: '' };
      }

      if (settings.dndSchedule.enabled) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);

        if (settings.dndSchedule.days.includes(currentDay)) {
          const { startTime, endTime } = settings.dndSchedule;
          
          if (startTime > endTime) {
            if (currentTime >= startTime || currentTime < endTime) {
              return { blocked: true, reason: 'Do Not Disturb is active' };
            }
          } else if (currentTime >= startTime && currentTime < endTime) {
            return { blocked: true, reason: 'Do Not Disturb is active' };
          }
        }
      } else {
        return { blocked: true, reason: 'Do Not Disturb is active' };
      }
    }

    return { blocked: false, reason: '' };
  }, [settings]);

  const addDNDException = useCallback(async (userId: string) => {
    const newExceptions = [...settings.allowedDuringDND, userId];
    return saveSettings({ allowedDuringDND: newExceptions });
  }, [settings.allowedDuringDND, saveSettings]);

  const removeDNDException = useCallback(async (userId: string) => {
    const newExceptions = settings.allowedDuringDND.filter(id => id !== userId);
    return saveSettings({ allowedDuringDND: newExceptions });
  }, [settings.allowedDuringDND, saveSettings]);

  return {
    ...settings,
    loading,
    toggleDND,
    setDNDSchedule,
    setBlockAnonymous,
    setBlockUnknown,
    setCallScreening,
    blockNumber,
    unblockNumber,
    shouldBlockCall,
    addDNDException,
    removeDNDException,
    reload: loadSettings,
  };
};

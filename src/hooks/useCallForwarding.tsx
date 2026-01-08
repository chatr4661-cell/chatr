/**
 * Call Forwarding Hook - Features #6-8
 * Always, Busy, No Answer forwarding
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ForwardingRule {
  id: string;
  type: 'always' | 'busy' | 'no_answer' | 'unreachable';
  enabled: boolean;
  forwardTo: string;
  forwardToName?: string;
  ringsBeforeForward?: number;
  schedule?: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
    days?: number[];
  };
}

interface ForwardingSettings {
  rules: ForwardingRule[];
  voicemailFallback: boolean;
  simultaneousRing: string[];
  sequentialRing: string[];
}

const DEFAULT_SETTINGS: ForwardingSettings = {
  rules: [],
  voicemailFallback: true,
  simultaneousRing: [],
  sequentialRing: [],
};

export const useCallForwarding = () => {
  const [settings, setSettings] = useState<ForwardingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('call_forwarding_settings')
        .eq('id', user.id)
        .single();

      if (data?.call_forwarding_settings) {
        const parsed = data.call_forwarding_settings as unknown as ForwardingSettings;
        if (parsed && typeof parsed === 'object' && 'rules' in parsed) {
          setSettings(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load forwarding settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: ForwardingSettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ call_forwarding_settings: newSettings as unknown as Json })
        .eq('id', user.id);

      if (error) throw error;
      setSettings(newSettings);
      toast.success('Forwarding settings saved');
      return true;
    } catch (error) {
      console.error('Failed to save forwarding settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  }, []);

  const setAlwaysForward = useCallback(async (
    enabled: boolean, 
    forwardTo?: string,
    forwardToName?: string
  ) => {
    const existingRule = settings.rules.find(r => r.type === 'always');
    const newRules = settings.rules.filter(r => r.type !== 'always');
    
    if (enabled && forwardTo) {
      newRules.push({
        id: existingRule?.id || crypto.randomUUID(),
        type: 'always',
        enabled: true,
        forwardTo,
        forwardToName,
      });
    } else if (existingRule) {
      newRules.push({ ...existingRule, enabled: false });
    }

    return saveSettings({ ...settings, rules: newRules });
  }, [settings, saveSettings]);

  const setBusyForward = useCallback(async (
    enabled: boolean, 
    forwardTo?: string,
    forwardToName?: string
  ) => {
    const existingRule = settings.rules.find(r => r.type === 'busy');
    const newRules = settings.rules.filter(r => r.type !== 'busy');
    
    if (enabled && forwardTo) {
      newRules.push({
        id: existingRule?.id || crypto.randomUUID(),
        type: 'busy',
        enabled: true,
        forwardTo,
        forwardToName,
      });
    } else if (existingRule) {
      newRules.push({ ...existingRule, enabled: false });
    }

    return saveSettings({ ...settings, rules: newRules });
  }, [settings, saveSettings]);

  const setNoAnswerForward = useCallback(async (
    enabled: boolean, 
    forwardTo?: string,
    forwardToName?: string,
    ringsBeforeForward: number = 4
  ) => {
    const existingRule = settings.rules.find(r => r.type === 'no_answer');
    const newRules = settings.rules.filter(r => r.type !== 'no_answer');
    
    if (enabled && forwardTo) {
      newRules.push({
        id: existingRule?.id || crypto.randomUUID(),
        type: 'no_answer',
        enabled: true,
        forwardTo,
        forwardToName,
        ringsBeforeForward,
      });
    } else if (existingRule) {
      newRules.push({ ...existingRule, enabled: false });
    }

    return saveSettings({ ...settings, rules: newRules });
  }, [settings, saveSettings]);

  const setSimultaneousRing = useCallback(async (deviceIds: string[]) => {
    return saveSettings({ ...settings, simultaneousRing: deviceIds });
  }, [settings, saveSettings]);

  const setSequentialRing = useCallback(async (deviceIds: string[]) => {
    return saveSettings({ ...settings, sequentialRing: deviceIds });
  }, [settings, saveSettings]);

  const shouldForwardCall = useCallback((
    isBusy: boolean = false,
    isUnreachable: boolean = false
  ): ForwardingRule | null => {
    const alwaysRule = settings.rules.find(r => r.type === 'always' && r.enabled);
    if (alwaysRule) {
      if (alwaysRule.schedule?.enabled) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);
        
        if (alwaysRule.schedule.days?.includes(currentDay)) {
          if (alwaysRule.schedule.startTime && alwaysRule.schedule.endTime) {
            if (currentTime >= alwaysRule.schedule.startTime && 
                currentTime <= alwaysRule.schedule.endTime) {
              return alwaysRule;
            }
          } else {
            return alwaysRule;
          }
        }
      } else {
        return alwaysRule;
      }
    }

    if (isBusy) {
      const busyRule = settings.rules.find(r => r.type === 'busy' && r.enabled);
      if (busyRule) return busyRule;
    }

    if (isUnreachable) {
      const unreachableRule = settings.rules.find(r => r.type === 'unreachable' && r.enabled);
      if (unreachableRule) return unreachableRule;
    }

    return null;
  }, [settings.rules]);

  const getNoAnswerForward = useCallback((): ForwardingRule | null => {
    return settings.rules.find(r => r.type === 'no_answer' && r.enabled) || null;
  }, [settings.rules]);

  return {
    settings,
    loading,
    setAlwaysForward,
    setBusyForward,
    setNoAnswerForward,
    setSimultaneousRing,
    setSequentialRing,
    shouldForwardCall,
    getNoAnswerForward,
    voicemailFallback: settings.voicemailFallback,
    reload: loadSettings,
  };
};

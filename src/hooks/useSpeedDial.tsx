/**
 * Speed Dial Hook - Feature #16
 * Quick access to frequently called numbers
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface SpeedDialEntry {
  digit: string; // 2-9
  userId?: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  callType: 'voice' | 'video';
}

export const useSpeedDial = () => {
  const [speedDials, setSpeedDials] = useState<Map<string, SpeedDialEntry>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadSpeedDials = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('speed_dial_settings')
        .eq('id', user.id)
        .single();

      if (profile?.speed_dial_settings) {
        const saved = profile.speed_dial_settings as unknown as Record<string, SpeedDialEntry>;
        if (saved && typeof saved === 'object') {
          setSpeedDials(new Map(Object.entries(saved)));
        }
      }
    } catch (error) {
      console.error('[useSpeedDial] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpeedDials();
  }, [loadSpeedDials]);

  const saveSpeedDials = useCallback(async (newDials: Map<string, SpeedDialEntry>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const obj = Object.fromEntries(newDials);

      await supabase
        .from('profiles')
        .update({ speed_dial_settings: obj as unknown as Json })
        .eq('id', user.id);

      setSpeedDials(newDials);
      return true;
    } catch (error) {
      console.error('[useSpeedDial] Save error:', error);
      toast.error('Failed to save speed dial');
      return false;
    }
  }, []);

  const setSpeedDial = useCallback(async (
    digit: string,
    entry: Omit<SpeedDialEntry, 'digit'>
  ): Promise<boolean> => {
    if (!['2', '3', '4', '5', '6', '7', '8', '9'].includes(digit)) {
      toast.error('Speed dial must be 2-9');
      return false;
    }

    const newDials = new Map(speedDials);
    newDials.set(digit, { ...entry, digit });
    
    const success = await saveSpeedDials(newDials);
    if (success) {
      toast.success(`Speed dial ${digit} set to ${entry.name}`);
    }
    return success;
  }, [speedDials, saveSpeedDials]);

  const removeSpeedDial = useCallback(async (digit: string): Promise<boolean> => {
    const newDials = new Map(speedDials);
    const removed = newDials.get(digit);
    newDials.delete(digit);
    
    const success = await saveSpeedDials(newDials);
    if (success && removed) {
      toast.success(`Speed dial ${digit} removed`);
    }
    return success;
  }, [speedDials, saveSpeedDials]);

  const getSpeedDial = useCallback((digit: string): SpeedDialEntry | undefined => {
    return speedDials.get(digit);
  }, [speedDials]);

  const getAvailableSlots = useCallback((): string[] => {
    const allSlots = ['2', '3', '4', '5', '6', '7', '8', '9'];
    return allSlots.filter(d => !speedDials.has(d));
  }, [speedDials]);

  const getAllSpeedDials = useCallback((): SpeedDialEntry[] => {
    return Array.from(speedDials.values()).sort((a, b) => 
      parseInt(a.digit) - parseInt(b.digit)
    );
  }, [speedDials]);

  return {
    speedDials,
    loading,
    setSpeedDial,
    removeSpeedDial,
    getSpeedDial,
    getAvailableSlots,
    getAllSpeedDials,
    reload: loadSpeedDials,
  };
};

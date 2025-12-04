import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: null },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '90 days', value: 7776000 },
] as const;

export const useDisappearingMessages = (conversationId: string | null) => {
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadSetting();
    }
  }, [conversationId]);

  const loadSetting = async () => {
    if (!conversationId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('disappearing_messages_duration')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setDuration(data?.disappearing_messages_duration ?? null);
    } catch (error) {
      console.error('Error loading disappearing messages setting:', error);
    }
  };

  const updateDuration = async (newDuration: number | null) => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ disappearing_messages_duration: newDuration })
        .eq('id', conversationId);

      if (error) throw error;
      
      setDuration(newDuration);
      const label = DISAPPEARING_OPTIONS.find(o => o.value === newDuration)?.label || 'Off';
      toast.success(`Disappearing messages: ${label}`);
    } catch (error) {
      console.error('Error updating disappearing messages:', error);
      toast.error('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const getDurationLabel = () => {
    return DISAPPEARING_OPTIONS.find(o => o.value === duration)?.label || 'Off';
  };

  return {
    duration,
    loading,
    updateDuration,
    getDurationLabel,
    isEnabled: duration !== null,
  };
};

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Voicemail {
  id: string;
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  audioUrl: string;
  transcription?: string;
  duration: number;
  isRead: boolean;
  createdAt: string;
}

export const useVoicemail = () => {
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const fetchVoicemails = useCallback(async (): Promise<Voicemail[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('voicemails')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch caller profiles separately
      const callerIds = [...new Set((data || []).map(v => v.caller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', callerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const mapped = (data || []).map(v => {
        const caller = profileMap.get(v.caller_id);
        return {
          id: v.id,
          callerId: v.caller_id,
          callerName: caller?.username,
          callerAvatar: caller?.avatar_url || undefined,
          audioUrl: v.audio_url,
          transcription: v.transcription || undefined,
          duration: v.duration_seconds || 0,
          isRead: v.is_read,
          createdAt: v.created_at
        };
      });

      setVoicemails(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch voicemails:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const startRecordingVoicemail = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Failed to start voicemail recording:', error);
      return false;
    }
  }, []);

  const stopAndSendVoicemail = useCallback(async (receiverId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(false);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const fileName = `${user.id}/${receiverId}_${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from('voicemails')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('voicemails')
            .getPublicUrl(fileName);

          // Transcribe voicemail
          const { data: transcriptionData } = await supabase.functions.invoke('transcribe-voice', {
            body: { audioUrl: publicUrl }
          });

          const { error } = await supabase.from('voicemails').insert({
            caller_id: user.id,
            receiver_id: receiverId,
            audio_url: publicUrl,
            transcription: transcriptionData?.text,
            duration_seconds: duration
          });

          if (error) throw error;

          toast.success('Voicemail sent');
          resolve(true);
        } catch (error) {
          console.error('Failed to send voicemail:', error);
          toast.error('Failed to send voicemail');
          resolve(false);
        }
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  }, []);

  const markAsRead = useCallback(async (voicemailId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voicemails')
        .update({ is_read: true })
        .eq('id', voicemailId);

      if (error) throw error;

      setVoicemails(prev => prev.map(v => 
        v.id === voicemailId ? { ...v, isRead: true } : v
      ));
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteVoicemail = useCallback(async (voicemailId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voicemails')
        .delete()
        .eq('id', voicemailId);

      if (error) throw error;

      setVoicemails(prev => prev.filter(v => v.id !== voicemailId));
      toast.success('Voicemail deleted');
      return true;
    } catch {
      toast.error('Failed to delete voicemail');
      return false;
    }
  }, []);

  const unreadCount = voicemails.filter(v => !v.isRead).length;

  return {
    voicemails,
    loading,
    isRecording,
    unreadCount,
    fetchVoicemails,
    startRecordingVoicemail,
    stopAndSendVoicemail,
    markAsRead,
    deleteVoicemail
  };
};

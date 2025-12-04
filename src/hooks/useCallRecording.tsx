import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recording {
  id: string;
  callId: string;
  url: string;
  duration: number;
  size: number;
  recordedAt: string;
}

export const useCallRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (callId: string, stream: MediaStream) => {
    try {
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

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      toast.info('Recording started');

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (callId: string): Promise<Recording | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        try {
          // Upload to storage
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const fileName = `${user.id}/${callId}_${Date.now()}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('call-recordings')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('call-recordings')
            .getPublicUrl(fileName);

          // Save to database
          const { data, error } = await supabase
            .from('call_recordings')
            .insert({
              call_id: callId,
              user_id: user.id,
              recording_url: publicUrl,
              duration_seconds: duration,
              file_size_bytes: blob.size
            })
            .select()
            .single();

          if (error) throw error;

          const recording: Recording = {
            id: data.id,
            callId: data.call_id,
            url: data.recording_url,
            duration: data.duration_seconds,
            size: data.file_size_bytes,
            recordedAt: data.recorded_at
          };

          setRecordings(prev => [...prev, recording]);
          toast.success('Recording saved');
          resolve(recording);
        } catch (error) {
          console.error('Failed to save recording:', error);
          toast.error('Failed to save recording');
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  }, []);

  const getCallRecordings = useCallback(async (callId?: string): Promise<Recording[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('call_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false });

      if (callId) {
        query = query.eq('call_id', callId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        callId: r.call_id,
        url: r.recording_url,
        duration: r.duration_seconds,
        size: r.file_size_bytes,
        recordedAt: r.recorded_at
      }));
    } catch {
      return [];
    }
  }, []);

  const deleteRecording = useCallback(async (recordingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('call_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      toast.success('Recording deleted');
      return true;
    } catch {
      toast.error('Failed to delete recording');
      return false;
    }
  }, []);

  return {
    isRecording,
    recordings,
    startRecording,
    stopRecording,
    getCallRecordings,
    deleteRecording
  };
};

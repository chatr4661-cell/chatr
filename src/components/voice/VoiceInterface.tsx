import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceInterfaceProps {
  onSpeakingChange?: (speaking: boolean) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

export const VoiceInterface = ({ onSpeakingChange, onTranscriptUpdate }: VoiceInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  const handleMessage = async (event: any) => {
    console.log('Received message:', event);
    
    if (event.type === 'response.audio_transcript.delta') {
      const newTranscript = transcript + event.delta;
      setTranscript(newTranscript);
      onTranscriptUpdate?.(newTranscript);
    } else if (event.type === 'response.audio_transcript.done') {
      setTranscript('');
    } else if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      onSpeakingChange?.(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
      
      // Update streak
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { error } = await supabase
            .from('user_streaks')
            .upsert({
              user_id: user.id,
              streak_type: 'ai_chat',
              current_streak: 1,
              last_activity_date: new Date().toISOString().split('T')[0]
            }, {
              onConflict: 'user_id,streak_type'
            });
          if (error) console.error('Streak update error:', error);
        } catch (err) {
          console.error('Failed to update streak:', err);
        }
      }
    }
  };

  const startConversation = async () => {
    try {
      setIsLoading(true);
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      
      toast.success("Voice interface ready - start talking!");
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    onSpeakingChange?.(false);
    toast.info("Conversation ended");
  };

  return null; // Hidden by default - can be accessed via AI Features menu
};

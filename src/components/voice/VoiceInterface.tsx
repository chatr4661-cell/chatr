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

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={isLoading}
          size="lg"
          className="rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-primary to-primary/80 hover:scale-110 transition-all"
        >
          {isLoading ? (
            <div className="animate-pulse">
              <Mic className="h-6 w-6" />
            </div>
          ) : (
            <Phone className="h-6 w-6" />
          )}
        </Button>
      ) : (
        <div className="flex flex-col gap-3 items-end">
          {isSpeaking && (
            <div className="bg-primary/10 backdrop-blur-lg px-4 py-2 rounded-full animate-pulse">
              <p className="text-xs font-medium">Chatr is speaking...</p>
            </div>
          )}
          <Button 
            onClick={endConversation}
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16 shadow-2xl hover:scale-110 transition-all"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

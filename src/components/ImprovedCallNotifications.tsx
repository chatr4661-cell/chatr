import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import EnhancedVoiceCall from './EnhancedVoiceCall';
import EnhancedVideoCall from './EnhancedVideoCall';

interface ImprovedCallNotificationsProps {
  userId: string;
  username: string;
}

export const ImprovedCallNotifications = ({ userId, username }: ImprovedCallNotificationsProps) => {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [userCallRingtone, setUserCallRingtone] = useState('/ringtone.mp3');
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's preferred call ringtone
  useEffect(() => {
    const getUserRingtone = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('call_ringtone')
        .eq('id', userId)
        .single();
      
      if (data?.call_ringtone) {
        setUserCallRingtone(data.call_ringtone);
      }
    };

    if (userId) {
      getUserRingtone();
    }
  }, [userId]);

  // Improved ringtone with vibration - short duration
  const playRingtone = () => {
    try {
      const audio = new Audio(userCallRingtone);
      audio.loop = false;
      audio.volume = 0.8;
      
      audio.play().then(() => {
        console.log('🔊 Ringtone playing');
      }).catch(e => {
        console.error('Ringtone error:', e);
        toast({
          title: "Sound Error",
          description: "Could not play ringtone. Check device volume.",
          variant: "destructive"
        });
      });
      
      ringtoneRef.current = audio;

      // Stop ringtone after 3 seconds
      setTimeout(() => {
        stopRingtone();
      }, 3000);

      // Add vibration on mobile
      if (Capacitor.isNativePlatform()) {
        vibrationIntervalRef.current = setInterval(async () => {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        }, 1000);
      }
    } catch (error) {
      console.error('Error setting up ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
    
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  };

  const answerCall = async (call: any) => {
    stopRingtone();
    setIncomingCall(null);
    setActiveCall(call);

    // Haptic feedback on answer
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }

    await supabase
      .from('calls')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', call.id);

    toast({
      title: 'Call connected',
      description: `Connected with ${call.caller_name}`,
    });
  };

  const rejectCall = async (call: any) => {
    stopRingtone();
    setIncomingCall(null);

    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', call.id);

    toast({
      title: 'Call rejected',
      description: `Rejected call from ${call.caller_name}`,
    });
  };

  const endActiveCall = () => {
    setActiveCall(null);
    stopRingtone();
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!userId) return;
    
    console.log('📞 Setting up call listener for:', userId);
    
    const incomingChannel = supabase
      .channel(`improved-incoming-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        
        if (call.status === 'ringing' && !activeCall && !incomingCall) {
          console.log('📱 Incoming call:', call.caller_name);
          setIncomingCall(call);
          playRingtone();

          toast({
            title: `Incoming ${call.call_type} call`,
            description: `${call.caller_name} is calling...`,
            duration: 30000,
          });
        }
      })
      .subscribe();

    // Listen for call updates (ended by other party)
    const updatesChannel = supabase
      .channel(`improved-updates-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const updatedCall = payload.new as any;
        
        console.log('📞 Call update received:', updatedCall);
        
        if (updatedCall.status === 'ended') {
          // Check if this is our active call or incoming call
          if (activeCall?.id === updatedCall.id) {
            console.log('🔚 Active call ended by other party');
            stopRingtone();
            setActiveCall(null);
            toast({
              title: "Call ended",
              description: "The call has ended",
            });
          }
          if (incomingCall?.id === updatedCall.id) {
            console.log('🔚 Incoming call ended');
            stopRingtone();
            setIncomingCall(null);
            toast({
              title: "Call cancelled",
              description: "The caller ended the call",
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(updatesChannel);
      stopRingtone();
    };
  }, [userId, activeCall, incomingCall]);

  return (
    <>
      {/* Incoming Call Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="w-full max-w-sm bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-xl border-white/20 p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white/30">
                  <AvatarImage src={incomingCall.caller_avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl">
                    {incomingCall.caller_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full border-4 border-primary/50 animate-ping" />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {incomingCall.caller_name}
                </h2>
                <p className="text-white/70 capitalize">
                  Incoming {incomingCall.call_type} call
                </p>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => rejectCall(incomingCall)}
                  className="rounded-full h-16 w-16"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => answerCall(incomingCall)}
                  className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
                >
                  {incomingCall.call_type === 'video' ? (
                    <Video className="h-7 w-7" />
                  ) : (
                    <Phone className="h-7 w-7" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Active Call */}
      {activeCall && activeCall.call_type === 'voice' && (
        <EnhancedVoiceCall
          conversationId={activeCall.conversation_id}
          callId={activeCall.id}
          contactName={activeCall.caller_id === userId ? activeCall.receiver_name : activeCall.caller_name}
          contactAvatar={activeCall.caller_id === userId ? activeCall.receiver_avatar : activeCall.caller_avatar}
          isInitiator={activeCall.caller_id === userId}
          userId={userId}
          partnerId={activeCall.caller_id === userId ? activeCall.receiver_id : activeCall.caller_id}
          onEnd={endActiveCall}
        />
      )}

      {activeCall && activeCall.call_type === 'video' && (
        <EnhancedVideoCall
          conversationId={activeCall.conversation_id}
          callId={activeCall.id}
          contactName={activeCall.caller_id === userId ? activeCall.receiver_name : activeCall.caller_name}
          contactAvatar={activeCall.caller_id === userId ? activeCall.receiver_avatar : activeCall.caller_avatar}
          isInitiator={activeCall.caller_id === userId}
          userId={userId}
          partnerId={activeCall.caller_id === userId ? activeCall.receiver_id : activeCall.caller_id}
          onEnd={endActiveCall}
        />
      )}
    </>
  );
};

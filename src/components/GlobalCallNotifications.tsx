import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GlobalCallNotificationsProps {
  userId: string;
  username: string;
}

export const GlobalCallNotifications = ({ userId, username }: GlobalCallNotificationsProps) => {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Answer incoming call
  const answerCall = async (call: any) => {
    try {
      // Stop ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }

      setCallType(call.call_type);
      setActiveCall(call);
      setIncomingCall(null);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.call_type === 'video'
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && call.call_type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(call.caller_signal)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Update call with answer
      await supabase
        .from('calls')
        .update({
          status: 'active',
          receiver_signal: answer as any,
          started_at: new Date().toISOString()
        })
        .eq('id', call.id);

      toast({
        title: 'Call connected',
        description: `Connected with ${call.caller_name}`,
      });

    } catch (error: any) {
      console.error('Answer call error:', error);
      toast({
        title: 'Failed to answer call',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Reject incoming call
  const rejectCall = async (call: any) => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }

    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', call.id);
    
    setIncomingCall(null);

    toast({
      title: 'Call rejected',
      description: `Rejected call from ${call.caller_name}`,
    });
  };

  // End call
  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Update call status
    if (activeCall) {
      supabase
        .from('calls')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          duration: Math.floor((new Date().getTime() - new Date(activeCall.started_at || activeCall.created_at).getTime()) / 1000)
        })
        .eq('id', activeCall.id);
    }

    setActiveCall(null);
    setCallType('voice');
    setIsMuted(false);
    setIsVideoOff(false);

    toast({
      title: 'Call ended',
    });
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    console.log('📞 Setting up global call listener for user:', userId);
    
    const channel = supabase
      .channel('global-incoming-calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        console.log('🔔 INCOMING CALL RECEIVED:', call);
        
        if (call.status === 'ringing') {
          console.log('📱 Showing incoming call dialog for:', call.caller_name);
          setIncomingCall(call);
          
          // Play ringtone
          const audio = new Audio('/ringtone.mp3');
          audio.loop = true;
          audio.play().catch(e => console.log('Could not play ringtone:', e));
          ringtoneRef.current = audio;

          // Show toast notification
          toast({
            title: `Incoming ${call.call_type} call`,
            description: `${call.caller_name} is calling you`,
            duration: 30000,
          });
        }
      })
      .subscribe((status) => {
        console.log('📡 Global incoming calls subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to global incoming calls');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to global incoming calls');
        }
      });

    // Listen for call updates (when caller ends call)
    const updatesChannel = supabase
      .channel('global-call-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const updatedCall = payload.new as any;
        
        // If the call was ended and it matches our active/incoming call
        if (updatedCall.status === 'ended') {
          if (activeCall?.id === updatedCall.id) {
            endCall();
          } else if (incomingCall?.id === updatedCall.id) {
            if (ringtoneRef.current) {
              ringtoneRef.current.pause();
              ringtoneRef.current = null;
            }
            setIncomingCall(null);
            toast({
              title: 'Call ended',
              description: 'The caller ended the call',
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Global call updates subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to global call updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to global call updates');
        }
      });

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
      }
      supabase.removeChannel(channel);
      supabase.removeChannel(updatesChannel);
    };
  }, [userId, activeCall, incomingCall]);

  return (
    <>
      {/* Incoming Call Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full shadow-2xl border">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                {incomingCall.call_type === 'video' ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <Phone className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  Incoming {incomingCall.call_type} call
                </span>
              </div>

              <Avatar className="h-28 w-28 ring-4 ring-primary/20">
                <AvatarFallback className="text-3xl bg-primary/10">
                  {incomingCall.caller_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h3 className="text-2xl font-bold">{incomingCall.caller_name}</h3>
                <p className="text-muted-foreground mt-1">Calling you...</p>
              </div>

              <div className="flex gap-6 pt-4">
                <Button
                  onClick={() => rejectCall(incomingCall)}
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-16 w-16"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <Button
                  onClick={() => answerCall(incomingCall)}
                  className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16"
                  size="lg"
                >
                  <Phone className="h-7 w-7" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          {/* Remote Video/Audio */}
          <div className="flex-1 relative bg-gradient-to-b from-gray-900 to-black">
            {callType === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Avatar className="h-32 w-32 mx-auto mb-4 ring-4 ring-primary/20">
                    <AvatarFallback className="text-4xl bg-primary/10">
                      {(activeCall.receiver_name || activeCall.caller_name)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white text-xl font-semibold">
                    {activeCall.receiver_name || activeCall.caller_name}
                  </p>
                </div>
              </div>
            )}
            
            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && (
              <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Call Info */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md rounded-lg px-4 py-2">
              <p className="text-white font-semibold">
                {activeCall.receiver_name || activeCall.caller_name}
              </p>
              <p className="text-white/70 text-sm capitalize">{activeCall.status}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleMute}
                variant={isMuted ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14"
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {callType === 'video' && (
                <Button
                  onClick={toggleVideo}
                  variant={isVideoOff ? 'destructive' : 'secondary'}
                  size="lg"
                  className="rounded-full h-14 w-14"
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}

              <Button
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full h-14 w-14"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

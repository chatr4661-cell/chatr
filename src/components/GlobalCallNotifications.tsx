import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendSignal, subscribeToCallSignals } from '@/utils/webrtcSignaling';

interface GlobalCallNotificationsProps {
  userId: string;
  username: string;
}

export const GlobalCallNotifications = ({ userId, username }: GlobalCallNotificationsProps) => {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = React.useState<any>(null);
  const [activeCall, setActiveCall] = React.useState<any>(null);
  const [callType, setCallType] = React.useState<'voice' | 'video'>('voice');
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user');

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const ringtoneRef = React.useRef<HTMLAudioElement | null>(null);

  // Start outgoing call (when we initiate)
  const startOutgoingCall = async (call: any) => {
    try {
      console.log('📞 Starting outgoing call:', call);
      setCallType(call.call_type);
      setActiveCall(call);

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
        console.log('📥 Received remote track');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else if (call.call_type === 'voice') {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.play();
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📡 Sending ICE candidate');
          await sendSignal({
            type: 'ice-candidate',
            callId: call.id,
            data: event.candidate,
            to: call.receiver_id
          });
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('📤 Sending offer');
      await sendSignal({
        type: 'offer',
        callId: call.id,
        data: offer,
        to: call.receiver_id
      });

      // Subscribe to signaling for answer
      subscribeToCallSignals(call.id, async (signal: any) => {
        try {
          console.log('📥 Received signal:', signal.signal_type);
          
          if (signal.signal_type === 'answer') {
            console.log('📥 Processing answer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          } else if (signal.signal_type === 'ice-candidate') {
            if (peerConnection.remoteDescription) {
              console.log('📥 Adding ICE candidate');
              await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data));
            }
          }
        } catch (error) {
          console.error('Error handling signal:', error);
        }
      });

    } catch (error: any) {
      console.error('Start call error:', error);
      toast({
        title: 'Failed to start call',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Answer incoming call
  const answerCall = async (call: any) => {
    try {
      // Stop ringtone immediately
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }

      console.log('📞 Answering call:', call);
      
      // Update UI immediately to hide ringing screen
      setIncomingCall(null);
      setCallType(call.call_type);
      setActiveCall(call);

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
        } else if (call.call_type === 'voice') {
          // For voice calls, play audio
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.play();
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal({
            type: 'ice-candidate',
            callId: call.id,
            data: event.candidate,
            to: call.caller_id
          });
        }
      };

      // CRITICAL: Fetch and process existing signals IN ORDER
      const { getSignals } = await import('@/utils/webrtcSignaling');
      const existingSignals = await getSignals(call.id);
      console.log('📥 Fetched existing signals:', existingSignals.length, 'signals');

      // Sort signals by created_at to ensure correct order
      const sortedSignals = existingSignals.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Separate offer from ICE candidates
      const offerSignal = sortedSignals.find(s => s.signal_type === 'offer');
      const iceCandidates = sortedSignals.filter(s => s.signal_type === 'ice-candidate');

      // Process offer FIRST
      if (offerSignal && !peerConnection.currentRemoteDescription) {
        console.log('📥 Processing existing offer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSignal.signal_data as unknown as RTCSessionDescriptionInit));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('📤 Sending answer to existing offer');
        await sendSignal({
          type: 'answer',
          callId: call.id,
          data: answer,
          to: call.caller_id
        });

        // THEN process ICE candidates (only after remote description is set)
        for (const signal of iceCandidates) {
          console.log('📥 Adding buffered ICE candidate');
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data as unknown as RTCIceCandidateInit));
        }
      }


      // Subscribe to new signaling messages
      const unsubscribe = subscribeToCallSignals(call.id, async (signal: any) => {
        try {
          console.log('📥 Received new signal:', signal.signal_type);
          
          if (signal.signal_type === 'offer' && !peerConnection.currentRemoteDescription) {
            console.log('📥 Processing new offer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            console.log('📤 Sending answer to new offer');
            await sendSignal({
              type: 'answer',
              callId: call.id,
              data: answer,
              to: call.caller_id
            });
          } else if (signal.signal_type === 'ice-candidate') {
            console.log('📥 Adding new ICE candidate');
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          }
        } catch (error) {
          console.error('Error handling signal:', error);
        }
      });

      // Update call status
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
    console.log('🔴 Ending call and cleaning up');
    
    // Stop all tracks immediately
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements immediately
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.pause();
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.pause();
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

    // Reset all state immediately
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

  // Switch camera (front/back)
  const switchCamera = async () => {
    if (!localStreamRef.current || callType !== 'video') return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: { exact: newFacingMode } }
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      // Stop old video track
      localStreamRef.current.getVideoTracks()[0].stop();
      
      // Update local stream
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      setFacingMode(newFacingMode);
      
      toast({
        title: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`,
      });
    } catch (error) {
      console.error('Error switching camera:', error);
      toast({
        title: 'Camera switch failed',
        description: 'Unable to switch camera',
        variant: 'destructive'
      });
    }
  };

  // Toggle between video and voice
  const toggleCallType = async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;

    const newType = callType === 'video' ? 'voice' : 'video';
    
    try {
      if (newType === 'video') {
        // Enable video - get video stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode }
        });
        
        // Replace tracks
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          peerConnectionRef.current.addTrack(videoTrack, stream);
        }
        
        localStreamRef.current.getVideoTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        // Disable video
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      
      setCallType(newType);
      toast({
        title: newType === 'video' ? 'Video enabled' : 'Video disabled',
      });
    } catch (error) {
      console.error('Error toggling call type:', error);
      toast({
        title: 'Error',
        description: 'Could not toggle video',
        variant: 'destructive'
      });
    }
  };

  // Listen for incoming calls AND outgoing calls
  React.useEffect(() => {
    if (!userId) return;
    
    console.log('📞 Setting up global call listener for user:', userId);
    
    // Listen for incoming calls (where we are the receiver)
    const incomingChannel = supabase
      .channel(`global-incoming-calls-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        console.log('🔔 INCOMING CALL RECEIVED:', call);
        
        if (call.status === 'ringing' && !activeCall && !incomingCall) {
          console.log('📱 Showing incoming call dialog for:', call.caller_name);
          setIncomingCall(call);
          
          // Play ringtone once
          const audio = new Audio('/ringtones/perfect-ring.mp3');
          audio.loop = false;
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
      });

    // Listen for outgoing calls (where we are the caller) - auto-start when created
    const outgoingChannel = supabase
      .channel(`global-outgoing-calls-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `caller_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        console.log('📞 OUTGOING CALL CREATED:', call);
        
        if (call.status === 'ringing' && !activeCall) {
          console.log('📱 Auto-starting outgoing call');
          startOutgoingCall(call);
        }
      })
      .subscribe((status) => {
        console.log('📡 Global outgoing calls subscription status:', status);
      });

    // Listen for call updates (when caller/receiver ends call)
    const updatesChannel = supabase
      .channel(`global-call-updates-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        const updatedCall = payload.new as any;
        
        // If the call was ended and it matches our active/incoming call
        if (updatedCall.status === 'ended') {
          if (activeCall?.id === updatedCall.id) {
            console.log('📞 Other party ended the call');
            endCall();
            toast({
              title: 'Call ended',
              description: 'The other party ended the call',
            });
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
      });

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [userId]);

  return (
    <>
      {/* Incoming Call Overlay - Only show if NO active call */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-background rounded-3xl p-8 max-w-md w-full shadow-2xl border border-primary/20">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                {incomingCall.call_type === 'video' ? (
                  <Video className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Phone className="h-5 w-5 text-primary animate-pulse" />
                )}
                <span className="text-sm font-medium">
                  Incoming {incomingCall.call_type} call
                </span>
              </div>

              <Avatar className="h-28 w-28 ring-4 ring-primary/30 animate-pulse">
                <AvatarFallback className="text-3xl bg-primary/10">
                  {incomingCall.caller_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h3 className="text-2xl font-bold">{incomingCall.caller_name}</h3>
                <p className="text-muted-foreground mt-1 animate-pulse">Ringing...</p>
              </div>

              <div className="flex gap-6 pt-4">
                <Button
                  onClick={() => rejectCall(incomingCall)}
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-transform"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <Button
                  onClick={() => answerCall(incomingCall)}
                  className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-transform"
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
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in duration-300">
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
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                onClick={toggleMute}
                variant={isMuted ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button
                onClick={toggleVideo}
                variant={isVideoOff ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
              >
                {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>

              {callType === 'video' && (
                <Button
                  onClick={switchCamera}
                  variant="secondary"
                  size="lg"
                  className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
                  title="Switch camera"
                >
                  <SwitchCamera className="h-6 w-6" />
                </Button>
              )}

              <Button
                onClick={toggleCallType}
                variant="outline"
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform border-white/20 text-white hover:bg-white/10"
                title={callType === 'video' ? 'Switch to voice call' : 'Switch to video call'}
              >
                {callType === 'video' ? <Phone className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>

              <Button
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
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

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  X,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CallInterfaceProps {
  userId: string;
  username: string;
}

interface UserToCall {
  id: string;
  username: string;
  phone_number: string;
  is_online: boolean;
  avatar_url: string | null;
}

export const CallInterface = ({ userId, username }: CallInterfaceProps) => {
  const { toast } = useToast();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState<UserToCall | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Search for user by phone number or user ID
  const searchUser = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('find_user_for_call', { search_term: searchTerm.trim() });

      if (error) throw error;

      if (data && data.length > 0) {
        setFoundUser(data[0]);
      } else {
        toast({
          title: 'User not found',
          description: 'No user found with that phone number or ID',
          variant: 'destructive'
        });
        setFoundUser(null);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Initialize WebRTC connection
  const initializeCall = async (type: 'voice' | 'video', receiver: UserToCall) => {
    try {
      setCallType(type);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
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

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Create call record
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: crypto.randomUUID(), // Temporary conversation ID
          caller_id: userId,
          receiver_id: receiver.id,
          call_type: type,
          status: 'ringing',
          caller_name: username,
          receiver_name: receiver.username,
          caller_signal: offer as any
        })
        .select()
        .single();

      if (callError) throw callError;

      setActiveCall(callData);

      // Listen for answer through realtime
      const channel = supabase
        .channel(`call:${callData.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callData.id}`
        }, async (payload) => {
          const updatedCall = payload.new as any;
          
          if (updatedCall.status === 'active' && updatedCall.receiver_signal) {
            // Set remote description
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(updatedCall.receiver_signal)
            );
          } else if (updatedCall.status === 'ended') {
            endCall();
          }
        })
        .subscribe();

    } catch (error: any) {
      console.error('Call initialization error:', error);
      toast({
        title: 'Call failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Answer incoming call
  const answerCall = async (call: any) => {
    try {
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
    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', call.id);
    
    setIncomingCall(null);
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
    const channel = supabase
      .channel('incoming-calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const call = payload.new as any;
        if (call.status === 'ringing') {
          setIncomingCall(call);
          
          // Play ringtone
          const audio = new Audio('/ringtone.mp3');
          audio.loop = true;
          audio.play();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <>
      {/* Call Button */}
      <Button
        onClick={() => setShowCallDialog(true)}
        variant="ghost"
        size="icon"
        className="rounded-full"
      >
        <Phone className="h-5 w-5" />
      </Button>

      {/* Call Search Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button onClick={searchUser} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {foundUser && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {foundUser.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{foundUser.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {foundUser.is_online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          initializeCall('voice', foundUser);
                          setShowCallDialog(false);
                        }}
                        size="sm"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                      <Button
                        onClick={() => {
                          initializeCall('video', foundUser);
                          setShowCallDialog(false);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <Dialog open={true} onOpenChange={() => rejectCall(incomingCall)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {incomingCall.call_type === 'video' ? 'Video' : 'Voice'} Call
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-6">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarFallback className="text-2xl">
                  {incomingCall.caller_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl font-semibold">{incomingCall.caller_name}</p>
                <p className="text-muted-foreground">Incoming call...</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => rejectCall(incomingCall)}
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-16 w-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  onClick={() => answerCall(incomingCall)}
                  className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16"
                  size="lg"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Remote Video */}
          <div className="flex-1 relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && (
              <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden">
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
            <div className="absolute top-4 left-4 text-white">
              <p className="font-semibold">
                {activeCall.receiver_name || activeCall.caller_name}
              </p>
              <p className="text-sm opacity-80">{activeCall.status}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-black/50 backdrop-blur">
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

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTurnConfig, sendSignal, subscribeToCallSignals } from '@/utils/webrtcSignaling';
import { useToast } from '@/hooks/use-toast';
import { getOptimalVideoConstraints, getOptimalAudioConstraints, setBandwidth, setPreferredCodec, enableSimulcast } from '@/utils/videoQualityManager';

export interface Participant {
  userId: string;
  username: string;
  avatarUrl?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
  connection?: RTCPeerConnection;
  isActive: boolean;
}

interface UseGroupCallProps {
  callId: string;
  currentUserId: string;
  isVideo: boolean;
  onEnd: () => void;
}

export const useGroupCall = ({ callId, currentUserId, isVideo, onEnd }: UseGroupCallProps) => {
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(isVideo);
  const { toast } = useToast();
  const iceServersRef = useRef<RTCIceServer[]>([]);

  // Initialize local media stream with ultra-HD settings
  const initializeMedia = useCallback(async () => {
    try {
      console.log('🎥 Initializing group call with ultra-HD 60fps...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getOptimalAudioConstraints(),
        video: isVideo ? getOptimalVideoConstraints('ultra') : false, // Use ultra for best quality
      });
      setLocalStream(stream);
      
      const iceServers = await getTurnConfig();
      iceServersRef.current = iceServers;
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media Error",
        description: "Could not access camera/microphone",
        variant: "destructive",
      });
      throw error;
    }
  }, [isVideo, toast]);

  // Create peer connection for a participant with ultra-HD settings
  const createPeerConnection = useCallback(async (participantId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({ 
      iceServers: iceServersRef.current,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Set VP9 as preferred codec
    try {
      setPreferredCodec(pc, 'VP9');
    } catch (error) {
      console.log('VP9 not available for participant:', participantId);
    }

    // Add local stream tracks with simulcast for scalability
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Enable simulcast for video in group calls
      if (isVideo) {
        try {
          enableSimulcast(pc);
        } catch (error) {
          console.log('Simulcast not supported');
        }
      }

      // Set quality after connection
      setTimeout(async () => {
        await setBandwidth(pc, 'ultra'); // Use ultra quality for best experience
      }, 1000);
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received track from:', participantId);
      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          participant.stream = event.streams[0];
          updated.set(participantId, participant);
        }
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          callId,
          data: event.candidate,
          to: participantId,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removeParticipant(participantId);
      }
    };

    return pc;
  }, [localStream, callId]);

  // Add a new participant
  const addParticipant = useCallback(async (userId: string, username: string, avatarUrl?: string, isInitiator = false) => {
    console.log('Adding participant:', username, 'isInitiator:', isInitiator);
    
    const pc = await createPeerConnection(userId);
    
    const participant: Participant = {
      userId,
      username,
      avatarUrl,
      audioEnabled: true,
      videoEnabled: isVideo,
      connection: pc,
      isActive: true,
    };

    setParticipants(prev => new Map(prev).set(userId, participant));

    // If we're initiating, create and send offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({
          type: 'offer',
          callId,
          data: offer,
          to: userId,
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }

    return participant;
  }, [createPeerConnection, callId, isVideo]);

  // Remove a participant
  const removeParticipant = useCallback((userId: string) => {
    setParticipants(prev => {
      const updated = new Map(prev);
      const participant = updated.get(userId);
      if (participant) {
        participant.connection?.close();
        participant.stream?.getTracks().forEach(track => track.stop());
        updated.delete(userId);
      }
      return updated;
    });
  }, []);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: any) => {
    const fromUserId = signal.from_user;
    
    if (fromUserId === currentUserId) return;

    let participant = participants.get(fromUserId);
    
    // If we don't have this participant yet, fetch their info and add them
    if (!participant && signal.signal_type !== 'participant-left') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', fromUserId)
          .single();
        
        if (profile) {
          participant = await addParticipant(fromUserId, profile.username || 'User', profile.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching participant profile:', error);
        return;
      }
    }

    if (!participant) return;

    const pc = participant.connection;
    if (!pc) return;

    try {
      switch (signal.signal_type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal({
            type: 'answer',
            callId,
            data: answer,
            to: fromUserId,
          });
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          break;

        case 'ice-candidate':
          if (signal.signal_data) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          }
          break;

        case 'participant-left':
          removeParticipant(fromUserId);
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }, [participants, currentUserId, callId, addParticipant, removeParticipant]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // End call
  const endCall = useCallback(async () => {
    // Close all peer connections
    participants.forEach(participant => {
      participant.connection?.close();
      participant.stream?.getTracks().forEach(track => track.stop());
    });

    // Stop local stream
    localStream?.getTracks().forEach(track => track.stop());

    // Update database
    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callId);

    onEnd();
  }, [participants, localStream, callId, onEnd]);

  // Initialize
  useEffect(() => {
    initializeMedia();

    const unsubscribe = subscribeToCallSignals(callId, handleSignal);

    return () => {
      unsubscribe();
      endCall();
    };
  }, [callId, handleSignal]);

  return {
    participants,
    localStream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    endCall,
    addParticipant,
    removeParticipant,
  };
};

import { useEffect, useState, useCallback } from 'react';
import { useGroupCall } from '@/hooks/useGroupCall';
import { ParticipantTile } from './ParticipantTile';
import { AddParticipantDialog } from './AddParticipantDialog';
import { Button } from '@/components/ui/button';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  UserPlus,
  Monitor,
  MonitorOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GroupVideoCallProps {
  callId: string;
  conversationId: string;
  currentUserId: string;
  currentUsername: string;
  onEnd: () => void;
}

export const GroupVideoCall = ({
  callId,
  conversationId,
  currentUserId,
  currentUsername,
  onEnd,
}: GroupVideoCallProps) => {
  const {
    participants,
    localStream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    endCall,
    addParticipant,
  } = useGroupCall({
    callId,
    currentUserId,
    isVideo: true,
    onEnd,
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const localIsSpeaking = useAudioLevel(localStream);

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load existing participants
  useEffect(() => {
    const loadParticipants = async () => {
      const { data } = await supabase
        .from('call_participants')
        .select(`
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('call_id', callId)
        .eq('is_active', true)
        .neq('user_id', currentUserId);

      if (data) {
        for (const p of data) {
          if (p.profiles) {
            await addParticipant(
              p.user_id,
              (p.profiles as any).username || 'User',
              (p.profiles as any).avatar_url,
              true
            );
          }
        }
      }
    };

    loadParticipants();
  }, [callId, currentUserId, addParticipant]);

  const handleAddParticipants = async (newParticipants: any[]) => {
    for (const participant of newParticipants) {
      await addParticipant(participant.id, participant.username, participant.avatar_url, true);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      setIsScreenSharing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGridLayout = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-3 grid-rows-3';
  };

  const participantCount = participants.size + 1; // +1 for local user
  const currentParticipantIds = [currentUserId, ...Array.from(participants.keys())];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-muted/50 backdrop-blur-lg px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Group Call</h2>
          <span className="text-sm text-muted-foreground">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={cn(
          "grid gap-4 h-full",
          getGridLayout(participantCount),
          pinnedUserId && "grid-cols-1"
        )}>
          {/* Local video */}
          {(!pinnedUserId || pinnedUserId === currentUserId) && (
            <ParticipantTile
              userId={currentUserId}
              username={currentUsername + ' (You)'}
              videoStream={localStream || undefined}
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              isSpeaking={localIsSpeaking}
              isPinned={pinnedUserId === currentUserId}
              connectionQuality="excellent"
              onPin={() => setPinnedUserId(pinnedUserId === currentUserId ? null : currentUserId)}
            />
          )}

          {/* Remote participants */}
          {Array.from(participants.entries()).map(([userId, participant]) => {
            if (pinnedUserId && pinnedUserId !== userId) return null;
            
            return (
              <ParticipantTileWithAudio
                key={userId}
                participant={participant}
                isPinned={pinnedUserId === userId}
                onPin={() => setPinnedUserId(pinnedUserId === userId ? null : userId)}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-muted/50 backdrop-blur-lg px-4 py-4 border-t safe-bottom">
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            variant={audioEnabled ? "secondary" : "destructive"}
            onClick={toggleAudio}
            className="h-12 w-12 md:h-14 md:w-14 rounded-full"
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            size="lg"
            variant={videoEnabled ? "secondary" : "destructive"}
            onClick={toggleVideo}
            className="h-12 w-12 md:h-14 md:w-14 rounded-full"
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            size="lg"
            variant={isScreenSharing ? "default" : "secondary"}
            onClick={toggleScreenShare}
            className="h-12 w-12 md:h-14 md:w-14 rounded-full"
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowAddDialog(true)}
            className="h-12 w-12 md:h-14 md:w-14 rounded-full"
          >
            <UserPlus className="h-5 w-5" />
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={endCall}
            className="h-12 w-12 md:h-14 md:w-14 rounded-full"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AddParticipantDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        callId={callId}
        onAdd={handleAddParticipants}
        currentParticipants={currentParticipantIds}
      />
    </div>
  );
};

// Helper component to handle audio level for each participant
const ParticipantTileWithAudio = ({ participant, isPinned, onPin }: any) => {
  const isSpeaking = useAudioLevel(participant.stream);
  
  return (
    <ParticipantTile
      userId={participant.userId}
      username={participant.username}
      avatarUrl={participant.avatarUrl}
      videoStream={participant.stream}
      audioEnabled={participant.audioEnabled}
      videoEnabled={participant.videoEnabled}
      isSpeaking={isSpeaking}
      isPinned={isPinned}
      connectionQuality="good"
      onPin={onPin}
    />
  );
};

import { useEffect, useState } from 'react';
import { useGroupCall } from '@/hooks/useGroupCall';
import { AddParticipantDialog } from './AddParticipantDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { Mic, MicOff, PhoneOff, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GroupVoiceCallProps {
  callId: string;
  conversationId: string;
  currentUserId: string;
  currentUsername: string;
  currentAvatar?: string;
  onEnd: () => void;
}

export const GroupVoiceCall = ({
  callId,
  conversationId,
  currentUserId,
  currentUsername,
  currentAvatar,
  onEnd,
}: GroupVoiceCallProps) => {
  const {
    participants,
    localStream,
    audioEnabled,
    toggleAudio,
    endCall,
    addParticipant,
  } = useGroupCall({
    callId,
    currentUserId,
    isVideo: false,
    onEnd,
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const participantCount = participants.size + 1;
  const currentParticipantIds = [currentUserId, ...Array.from(participants.keys())];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/20 to-background z-50 flex flex-col">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-semibold mb-2">Group Call</h2>
        <p className="text-muted-foreground mb-1">
          {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
        </p>
        <p className="text-3xl font-mono mb-12">{formatDuration(callDuration)}</p>

        {/* Participants grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-4xl">
          {/* Local user */}
          <ParticipantAvatar
            username={currentUsername}
            avatarUrl={currentAvatar}
            audioEnabled={audioEnabled}
            isSpeaking={localIsSpeaking}
            isLocal
          />

          {/* Remote participants */}
          {Array.from(participants.entries()).map(([userId, participant]) => (
            <ParticipantAvatarWithAudio
              key={userId}
              participant={participant}
            />
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-muted/50 backdrop-blur-lg px-4 py-6 border-t safe-bottom">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={audioEnabled ? "secondary" : "destructive"}
            onClick={toggleAudio}
            className="h-14 w-14 rounded-full"
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowAddDialog(true)}
            className="h-14 w-14 rounded-full"
          >
            <UserPlus className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={endCall}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
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

// Participant avatar component
const ParticipantAvatar = ({ 
  username, 
  avatarUrl, 
  audioEnabled, 
  isSpeaking,
  isLocal 
}: any) => {
  const initials = username?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar 
          className={cn(
            "h-20 w-20 md:h-24 md:w-24 transition-all",
            isSpeaking && "ring-4 ring-primary ring-opacity-75 scale-110"
          )}
        >
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background border-2">
          {audioEnabled ? (
            <Mic className={cn("h-4 w-4", isSpeaking && "text-primary")} />
          ) : (
            <MicOff className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      
      <p className="text-sm font-medium text-center">
        {username}
        {isLocal && ' (You)'}
      </p>
    </div>
  );
};

// Helper component with audio detection
const ParticipantAvatarWithAudio = ({ participant }: any) => {
  const isSpeaking = useAudioLevel(participant.stream);
  
  return (
    <ParticipantAvatar
      username={participant.username}
      avatarUrl={participant.avatarUrl}
      audioEnabled={participant.audioEnabled}
      isSpeaking={isSpeaking}
      isLocal={false}
    />
  );
};

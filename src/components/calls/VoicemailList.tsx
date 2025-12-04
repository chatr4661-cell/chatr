import React, { useEffect, useState } from 'react';
import { Voicemail, Play, Pause, Check, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useVoicemail } from '@/hooks/useVoicemail';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VoicemailListProps {
  className?: string;
}

export const VoicemailList = ({ className }: VoicemailListProps) => {
  const { 
    voicemails, 
    loading, 
    unreadCount,
    fetchVoicemails, 
    markAsRead, 
    deleteVoicemail 
  } = useVoicemail();
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoicemails();
  }, [fetchVoicemails]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (voicemailId: string, audioUrl: string) => {
    if (playingId === voicemailId) {
      audioRef?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const audio = new Audio(audioUrl);
    audio.play();
    setAudioRef(audio);
    setPlayingId(voicemailId);
    await markAsRead(voicemailId);

    audio.onended = () => {
      setPlayingId(null);
    };
  };

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Voicemail className="w-5 h-5" />
          Voicemails
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-1">
              {unreadCount} new
            </Badge>
          )}
        </h3>
      </div>

      {voicemails.length === 0 ? (
        <Card className="p-8 text-center">
          <Voicemail className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No voicemails</p>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {voicemails.map(vm => (
              <Card 
                key={vm.id} 
                className={cn(
                  "p-3",
                  !vm.isRead && "bg-primary/5 border-primary/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={vm.callerAvatar} />
                    <AvatarFallback>
                      {vm.callerName?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {vm.callerName || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(vm.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="w-3 h-3" />
                      {formatDuration(vm.duration)}
                    </div>

                    {vm.transcription && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {vm.transcription}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 gap-1"
                        onClick={() => handlePlay(vm.id, vm.audioUrl)}
                      >
                        {playingId === vm.id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {playingId === vm.id ? 'Pause' : 'Play'}
                      </Button>

                      {!vm.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => markAsRead(vm.id)}
                        >
                          <Check className="w-3 h-3" />
                          Mark Read
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => deleteVoicemail(vm.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

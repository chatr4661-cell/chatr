import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RINGTONES, CALL_RINGTONES, Ringtone } from "@/config/ringtones";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Check, Volume2 } from "lucide-react";

interface RingtoneSelectorProps {
  userId: string;
  currentNotificationTone?: string;
  currentCallRingtone?: string;
}

export const RingtoneSelector = ({ 
  userId, 
  currentNotificationTone = '/notification.mp3',
  currentCallRingtone = '/ringtone.mp3'
}: RingtoneSelectorProps) => {
  const { toast } = useToast();
  const [selectedNotification, setSelectedNotification] = useState(currentNotificationTone);
  const [selectedCall, setSelectedCall] = useState(currentCallRingtone);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'classic' | 'modern' | 'nature' | 'melodies'>('classic');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSelectedNotification(currentNotificationTone);
    setSelectedCall(currentCallRingtone);
  }, [currentNotificationTone, currentCallRingtone]);

  const playPreview = (ringtone: Ringtone) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingId === ringtone.id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(ringtone.path);
    audioRef.current = audio;
    setPlayingId(ringtone.id);

    audio.play().catch(e => console.log('Could not play preview:', e));
    audio.onended = () => setPlayingId(null);
  };

  const selectNotificationTone = async (ringtone: Ringtone) => {
    setSelectedNotification(ringtone.path);
    
    const { error } = await supabase
      .from('profiles')
      .update({ notification_tone: ringtone.path })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update notification tone",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Notification tone updated",
        description: ringtone.name,
      });
    }
  };

  const selectCallRingtone = async (ringtone: Ringtone) => {
    setSelectedCall(ringtone.path);
    
    const { error } = await supabase
      .from('profiles')
      .update({ call_ringtone: ringtone.path })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update call ringtone",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Call ringtone updated",
        description: ringtone.name,
      });
    }
  };

  const RingtoneList = ({ ringtones, type }: { ringtones: Ringtone[], type: 'notification' | 'call' }) => {
    const filtered = ringtones.filter(r => r.category === activeCategory);
    const selected = type === 'notification' ? selectedNotification : selectedCall;
    const selectFn = type === 'notification' ? selectNotificationTone : selectCallRingtone;

    return (
      <div className="space-y-2">
        {filtered.map((ringtone) => (
          <Card 
            key={ringtone.id}
            className={`p-4 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer ${
              selected === ringtone.path ? 'border-primary bg-accent' : ''
            }`}
            onClick={() => selectFn(ringtone)}
          >
            <div className="flex items-center gap-3 flex-1">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ringtone.name}</span>
              {selected === ringtone.path && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                playPreview(ringtone);
              }}
            >
              {playingId === ringtone.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {(['classic', 'modern', 'nature', 'melodies'] as const).map((category) => (
          <Badge
            key={category}
            variant={activeCategory === category ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Message Notifications</TabsTrigger>
          <TabsTrigger value="calls">Call Ringtones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications" className="mt-4">
          <RingtoneList ringtones={RINGTONES} type="notification" />
        </TabsContent>
        
        <TabsContent value="calls" className="mt-4">
          <RingtoneList ringtones={CALL_RINGTONES} type="call" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

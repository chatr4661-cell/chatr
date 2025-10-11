import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CALL_RINGTONES, Ringtone } from "@/config/ringtones";
import { Play, Pause, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RingtonePickerDialogProps {
  open: boolean;
  onClose: () => void;
  currentRingtone: string;
  onSelect: (ringtone: string) => void;
}

export function RingtonePickerDialog({
  open,
  onClose,
  currentRingtone,
  onSelect
}: RingtonePickerDialogProps) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const categories = ['classic', 'modern', 'nature', 'melodies'] as const;

  const playPreview = (ringtone: Ringtone) => {
    // Stop currently playing
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    if (playing === ringtone.path) {
      setPlaying(null);
      setAudioRef(null);
      return;
    }

    const audio = new Audio(ringtone.path);
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Preview play error:', err));
    
    audio.onended = () => {
      setPlaying(null);
      setAudioRef(null);
    };

    setPlaying(ringtone.path);
    setAudioRef(audio);
  };

  const handleSelect = (path: string) => {
    if (audioRef) {
      audioRef.pause();
      setPlaying(null);
      setAudioRef(null);
    }
    onSelect(path);
    onClose();
  };

  const getRingtonesByCategory = (category: string) => {
    return CALL_RINGTONES.filter(r => r.category === category);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose Call Ringtone</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="font-semibold capitalize mb-3 text-sm text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {getRingtonesByCategory(category).map(ringtone => (
                    <div
                      key={ringtone.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent",
                        currentRingtone === ringtone.path && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleSelect(ringtone.path)}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            playPreview(ringtone);
                          }}
                        >
                          {playing === ringtone.path ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="font-medium">{ringtone.name}</span>
                      </div>
                      {currentRingtone === ringtone.path && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

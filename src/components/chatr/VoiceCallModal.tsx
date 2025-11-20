import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Phone, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface VoiceCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactAvatar: string | null;
  callState: 'calling' | 'ringing' | 'connected';
}

export function VoiceCallModal({ open, onOpenChange, contactName, contactAvatar, callState }: VoiceCallModalProps) {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (callState !== 'connected') return;
    
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 border-0">
        <div 
          className="relative rounded-lg overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))'
          }}
        >
          <div className="py-12 px-6 text-center text-white">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/30">
              <AvatarImage src={contactAvatar || ''} />
              <AvatarFallback className="text-2xl">{contactName[0]}</AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold mb-2">{contactName}</h2>
            
            <div className="text-white/80 text-lg">
              {callState === 'calling' && 'Calling...'}
              {callState === 'ringing' && 'Ringing...'}
              {callState === 'connected' && formatDuration(duration)}
            </div>

            {callState === 'connected' && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  size="lg"
                  variant={muted ? 'default' : 'secondary'}
                  onClick={() => setMuted(!muted)}
                  className="rounded-full w-14 h-14"
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                
                <Button
                  size="lg"
                  variant={speakerOn ? 'default' : 'secondary'}
                  onClick={() => setSpeakerOn(!speakerOn)}
                  className="rounded-full w-14 h-14"
                >
                  {speakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </Button>
              </div>
            )}

            <Button
              size="lg"
              variant="destructive"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-16 h-16 mt-8"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

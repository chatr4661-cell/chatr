import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface VideoCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactAvatar: string | null;
  callState: 'calling' | 'ringing' | 'connected';
}

export function VideoCallModal({ open, onOpenChange, contactName, contactAvatar, callState }: VideoCallModalProps) {
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
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
      <DialogContent className="max-w-2xl p-0 border-0 h-[600px]">
        <div className="relative h-full rounded-lg overflow-hidden bg-gray-900">
          {/* Remote video placeholder */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            {!videoOn ? (
              <div className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-white/30">
                  <AvatarImage src={contactAvatar || ''} />
                  <AvatarFallback className="text-4xl">{contactName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-white text-xl font-semibold">{contactName}</div>
              </div>
            ) : (
              <div className="text-white/50 text-lg">Video Stream (Placeholder)</div>
            )}
          </div>

          {/* Local video preview */}
          <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg border-2 border-white/30 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
              Your Video
            </div>
          </div>

          {/* Call info */}
          <div className="absolute top-4 left-4 text-white">
            <div className="text-lg font-semibold">{contactName}</div>
            <div className="text-sm text-white/80">
              {callState === 'calling' && 'Calling...'}
              {callState === 'ringing' && 'Ringing...'}
              {callState === 'connected' && formatDuration(duration)}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
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
              variant="destructive"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            <Button
              size="lg"
              variant={!videoOn ? 'default' : 'secondary'}
              onClick={() => setVideoOn(!videoOn)}
              className="rounded-full w-14 h-14"
            >
              {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

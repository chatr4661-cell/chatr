import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Settings, Circle } from 'lucide-react';
import { CallRecordingControls } from '@/components/calls/CallRecordingControls';
import { VirtualBackgroundPicker } from '@/components/calls/VirtualBackgroundPicker';
import { AudioSettingsPanel } from '@/components/calls/AudioSettingsPanel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  callType: 'voice' | 'video';
  contactName: string;
  contactAvatar?: string;
}

export function CallModal({ open, onClose, callType, contactName, contactAvatar }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVirtualBg, setShowVirtualBg] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Get media stream when call connects
  useEffect(() => {
    if (callStatus === 'connected' && !mediaStream) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' })
        .then(setMediaStream)
        .catch(console.error);
    }
    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, [callStatus, callType]);

  useEffect(() => {
    if (open) {
      // Simulate call connecting after 2 seconds
      const timer = setTimeout(() => {
        setCallStatus('connected');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (callStatus === 'connected') {
      const interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('calling');
    setDuration(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-primary border-none">
        <div className="flex flex-col items-center justify-center min-h-[500px] text-white p-8">
          {callType === 'video' && callStatus === 'connected' ? (
            <div className="w-full aspect-video bg-black/30 rounded-xl mb-6 flex items-center justify-center">
              <span className="text-6xl">{contactAvatar || '👤'}</span>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-6xl mb-6">
              {contactAvatar || '👤'}
            </div>
          )}

          <h2 className="text-2xl font-bold mb-2">{contactName}</h2>
          <p className="text-lg opacity-90">
            {callStatus === 'calling' ? 'Calling...' : formatDuration(duration)}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-12">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {callType === 'video' && (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button
              className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </button>

            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors ml-2"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>

          {/* Additional Controls Row */}
          {callStatus === 'connected' && (
            <div className="flex items-center gap-3 mt-6">
              {/* Call Recording */}
              <CallRecordingControls 
                callId={`call-${Date.now()}`}
                stream={mediaStream}
                className="bg-white/10 rounded-lg p-2"
              />

              {/* Virtual Background (video only) */}
              {callType === 'video' && (
                <>
                  <button 
                    onClick={() => setShowVirtualBg(true)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    title="Virtual Background"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <VirtualBackgroundPicker 
                    isOpen={showVirtualBg}
                    onClose={() => setShowVirtualBg(false)}
                    onApply={(config) => {
                      console.log('Applied background:', config);
                      setShowVirtualBg(false);
                    }}
                  />
                </>
              )}

              {/* Audio Settings */}
              <Sheet open={showSettings} onOpenChange={setShowSettings}>
                <SheetTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-background/95 backdrop-blur">
                  <AudioSettingsPanel />
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

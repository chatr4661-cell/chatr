import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNoiseCancellation } from '@/hooks/useNoiseCancellation';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Mic, Headphones, Bluetooth, Speaker, TestTube } from 'lucide-react';

interface AudioSettingsPanelProps {
  className?: string;
}

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'bluetooth':
      return <Bluetooth className="w-4 h-4" />;
    case 'headset':
    case 'earphone':
      return <Headphones className="w-4 h-4" />;
    case 'speaker':
      return <Speaker className="w-4 h-4" />;
    default:
      return <Mic className="w-4 h-4" />;
  }
};

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({ className }) => {
  const {
    config,
    isSupported,
    noiseLevel,
    inputVolume,
    toggle,
    setLevel,
    setAutoGain,
    setEchoCancellation,
    setTypingNoiseDetection,
    setVoiceIsolation,
  } = useNoiseCancellation();

  const {
    microphones,
    speakers,
    selectedMicrophone,
    selectedSpeaker,
    selectMicrophone,
    selectSpeaker,
    testMicrophone,
    testSpeaker,
  } = useAudioDevices();

  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [cleanupTest, setCleanupTest] = useState<(() => void) | null>(null);

  const handleTestMic = async () => {
    if (isTesting && cleanupTest) {
      cleanupTest();
      setCleanupTest(null);
      setIsTesting(false);
      setMicLevel(0);
      return;
    }

    setIsTesting(true);
    const cleanup = await testMicrophone((level) => setMicLevel(level));
    setCleanupTest(() => cleanup);
  };

  useEffect(() => {
    return () => {
      if (cleanupTest) cleanupTest();
    };
  }, [cleanupTest]);

  if (!isSupported) {
    return (
      <div className={cn('p-4 bg-muted/30 rounded-lg', className)}>
        <p className="text-sm text-muted-foreground">
          Audio processing is not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Device Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Audio Devices</Label>
        
        {/* Microphone Selection */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Microphone</Label>
          <div className="flex gap-2">
            <Select value={selectedMicrophone || ''} onValueChange={selectMicrophone}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {microphones.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(mic.type)}
                      <span className="truncate">{mic.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={isTesting ? "destructive" : "outline"}
              size="icon"
              onClick={handleTestMic}
              title={isTesting ? "Stop test" : "Test microphone"}
            >
              <TestTube className="w-4 h-4" />
            </Button>
          </div>
          {isTesting && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-75',
                    micLevel > 80 ? 'bg-red-500' : micLevel > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">{micLevel}%</span>
            </div>
          )}
        </div>

        {/* Speaker Selection */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Speaker</Label>
          <div className="flex gap-2">
            <Select value={selectedSpeaker || ''} onValueChange={selectSpeaker}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {speakers.map((speaker) => (
                  <SelectItem key={speaker.deviceId} value={speaker.deviceId}>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(speaker.type)}
                      <span className="truncate">{speaker.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={testSpeaker}
              title="Test speaker"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Noise Cancellation Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          {config.enabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
          <Label>HD Noise Cancellation</Label>
        </div>
        <Switch checked={config.enabled} onCheckedChange={toggle} />
      </div>

      {/* Noise Level */}
      {config.enabled && (
        <>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Noise Reduction Level</Label>
            <RadioGroup
              value={config.level}
              onValueChange={(value) => setLevel(value as 'low' | 'medium' | 'high' | 'ultra')}
              className="grid grid-cols-4 gap-2"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="text-xs">Low</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-xs">Medium</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-xs">High</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="ultra" id="ultra" />
                <Label htmlFor="ultra" className="text-xs">Ultra</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Input Level Indicator */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-sm text-muted-foreground">Input Level</Label>
              <span className="text-xs text-muted-foreground">{inputVolume}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-100',
                    inputVolume > 80 ? 'bg-red-500' : inputVolume > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${inputVolume}%` }}
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm font-medium">Advanced Audio</Label>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Gain Control</Label>
              <Switch
                checked={config.autoGain}
                onCheckedChange={setAutoGain}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Echo Cancellation</Label>
              <Switch
                checked={config.echoCancellation}
                onCheckedChange={setEchoCancellation}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Typing Noise Detection</Label>
              <Switch
                checked={config.typingNoiseDetection}
                onCheckedChange={setTypingNoiseDetection}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Voice Isolation</Label>
              <Switch
                checked={config.voiceIsolation}
                onCheckedChange={setVoiceIsolation}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

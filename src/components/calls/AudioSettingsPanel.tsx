import React from 'react';
import { cn } from '@/lib/utils';
import { useNoiseCancellation } from '@/hooks/useNoiseCancellation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Volume2, VolumeX, Mic } from 'lucide-react';

interface AudioSettingsPanelProps {
  className?: string;
}

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({ className }) => {
  const {
    config,
    isSupported,
    noiseLevel,
    toggle,
    setLevel,
    setAutoGain,
    setEchoCancellation,
  } = useNoiseCancellation();

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
      {/* Noise Cancellation Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.enabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
          <Label>Noise Cancellation</Label>
        </div>
        <Switch checked={config.enabled} onCheckedChange={toggle} />
      </div>

      {/* Noise Level */}
      {config.enabled && (
        <>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Level</Label>
            <RadioGroup
              value={config.level}
              onValueChange={(value) => setLevel(value as 'low' | 'medium' | 'high')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="text-sm">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-sm">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-sm">High</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Noise Level Indicator */}
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Input Level</Label>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-100',
                    noiseLevel > 150 ? 'bg-red-500' : noiseLevel > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(100, (noiseLevel / 255) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-2 pt-2 border-t border-border">
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
          </div>
        </>
      )}
    </div>
  );
};

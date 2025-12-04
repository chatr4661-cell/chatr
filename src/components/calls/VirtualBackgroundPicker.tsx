import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useVirtualBackground, BackgroundType } from '@/hooks/useVirtualBackground';
import { X, Image, Palette, Circle, Check } from 'lucide-react';

interface VirtualBackgroundPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: { type: BackgroundType; value?: string | number }) => void;
}

export const VirtualBackgroundPicker: React.FC<VirtualBackgroundPickerProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { presetBackgrounds, presetColors } = useVirtualBackground();
  const [selectedType, setSelectedType] = useState<BackgroundType>('none');
  const [selectedValue, setSelectedValue] = useState<string | number | undefined>();
  const [blurAmount, setBlurAmount] = useState(10);

  const handleApply = () => {
    if (selectedType === 'blur') {
      onApply({ type: 'blur', value: blurAmount });
    } else if (selectedType === 'image' || selectedType === 'color') {
      onApply({ type: selectedType, value: selectedValue });
    } else {
      onApply({ type: 'none' });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Virtual Background</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Option tabs */}
          <div className="flex gap-2">
            <Button
              variant={selectedType === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('none')}
            >
              <X className="w-4 h-4 mr-1" />
              None
            </Button>
            <Button
              variant={selectedType === 'blur' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('blur')}
            >
              <Circle className="w-4 h-4 mr-1" />
              Blur
            </Button>
            <Button
              variant={selectedType === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('image')}
            >
              <Image className="w-4 h-4 mr-1" />
              Image
            </Button>
            <Button
              variant={selectedType === 'color' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('color')}
            >
              <Palette className="w-4 h-4 mr-1" />
              Color
            </Button>
          </div>

          {/* Blur slider */}
          {selectedType === 'blur' && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Blur Amount</label>
              <Slider
                value={[blurAmount]}
                onValueChange={([value]) => setBlurAmount(value)}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground text-right">{blurAmount}px</p>
            </div>
          )}

          {/* Background images */}
          {selectedType === 'image' && (
            <div className="grid grid-cols-3 gap-2">
              {presetBackgrounds.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedValue(bg.url)}
                  className={cn(
                    'relative aspect-video rounded-lg overflow-hidden border-2 transition-all',
                    selectedValue === bg.url ? 'border-primary' : 'border-transparent'
                  )}
                >
                  <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                  {selectedValue === bg.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                    {bg.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Color picker */}
          {selectedType === 'color' && (
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedValue(color)}
                  className={cn(
                    'aspect-square rounded-lg border-2 transition-all',
                    selectedValue === color ? 'border-white ring-2 ring-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedValue === color && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Apply button */}
          <Button className="w-full" onClick={handleApply}>
            Apply Background
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

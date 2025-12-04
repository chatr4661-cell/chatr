import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAIPhotoEnhancement } from '@/hooks/useAIPhotoEnhancement';
import { cn } from '@/lib/utils';
import { Check, Download, RotateCcw } from 'lucide-react';

interface AIPhotoEnhancerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onEnhanced?: (enhancedUrl: string) => void;
}

export const AIPhotoEnhancer: React.FC<AIPhotoEnhancerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onEnhanced,
}) => {
  const { isProcessing, progress, enhance, getEnhancementTypes } = useAIPhotoEnhancement();
  const [selectedType, setSelectedType] = useState<string>('auto');
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const enhancementTypes = getEnhancementTypes();

  const handleEnhance = async () => {
    try {
      const result = await enhance(imageUrl, selectedType as any);
      setEnhancedUrl(result);
    } catch (error) {
      console.error('Enhancement failed:', error);
    }
  };

  const handleApply = () => {
    if (enhancedUrl && onEnhanced) {
      onEnhanced(enhancedUrl);
    }
    onClose();
  };

  const handleReset = () => {
    setEnhancedUrl(null);
  };

  const handleDownload = () => {
    if (!enhancedUrl) return;
    
    const link = document.createElement('a');
    link.href = enhancedUrl;
    link.download = 'enhanced-photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Photo Enhancement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {showComparison && enhancedUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={imageUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
                <img
                  src={enhancedUrl}
                  alt="Enhanced"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ clipPath: 'inset(0 0 0 50%)' }}
                />
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white shadow-lg" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                  Original
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                  Enhanced
                </div>
              </div>
            ) : (
              <img
                src={enhancedUrl || imageUrl}
                alt={enhancedUrl ? 'Enhanced' : 'Original'}
                className="w-full h-full object-contain"
              />
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <div className="text-white text-sm mb-2">Enhancing...</div>
                <Progress value={progress} className="w-32" />
              </div>
            )}
          </div>

          {/* Enhancement types */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {enhancementTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => setSelectedType(type.type)}
                disabled={isProcessing}
                className={cn(
                  'flex flex-col items-center p-2 rounded-lg border transition-all',
                  selectedType === type.type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-xl mb-1">{type.icon}</span>
                <span className="text-xs font-medium">{type.name}</span>
              </button>
            ))}
          </div>

          {/* Comparison toggle */}
          {enhancedUrl && (
            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Hide Comparison' : 'Compare Before/After'}
              </Button>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Processing... {progress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!enhancedUrl ? (
              <Button
                className="flex-1"
                onClick={handleEnhance}
                disabled={isProcessing}
              >
                {isProcessing ? 'Enhancing...' : 'Enhance Photo'}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button className="flex-1" onClick={handleApply}>
                  <Check className="w-4 h-4 mr-1" />
                  Use Enhanced
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

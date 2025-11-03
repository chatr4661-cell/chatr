import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Download, ChevronLeft, ChevronRight, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveMediaToGallery } from '@/utils/mediaGallery';
import { toast } from 'sonner';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'document';
  filename?: string;
  path?: string; // Storage path for signed URL
}

interface MediaLightboxProps {
  media: MediaItem[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  media,
  initialIndex,
  open,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const handleSaveToGallery = async () => {
    try {
      await saveMediaToGallery(
        currentMedia.url,
        currentMedia.filename || `chatr-${Date.now()}`,
        currentMedia.type
      );
      toast.success('Saved to Gallery! 📸');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Could not save to gallery');
    }
  };

  const handleDownload = async () => {
    try {
      const link = document.createElement('a');
      link.href = currentMedia.url;
      link.download = currentMedia.filename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white text-sm">
            {hasMultiple && `${currentIndex + 1} / ${media.length}`}
          </div>
          <div className="flex items-center gap-2">
            {(currentMedia.type === 'image' || currentMedia.type === 'video') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveToGallery}
                className="text-white hover:bg-white/20 rounded-full"
                title="Save to Gallery"
              >
                <Image className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 rounded-full"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex items-center justify-center min-h-[400px] max-h-[90vh] p-12">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={currentMedia.filename || 'Media preview'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : currentMedia.type === 'video' ? (
            <video
              src={currentMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
            />
          ) : currentMedia.type === 'document' ? (
            <div className="flex flex-col items-center gap-4 text-white">
              <FileText className="w-24 h-24 text-white/70" />
              <p className="text-lg">{currentMedia.filename}</p>
              <Button onClick={handleDownload} className="bg-white text-black hover:bg-white/90">
                Download Document
              </Button>
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, File, Image as ImageIcon, Video, Music, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'document';
  fileName?: string;
  fileSize?: number;
  file: File;
}

interface MultiMediaPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (caption?: string) => void;
  media: MediaItem[];
  onRemove: (index: number) => void;
}

export const MultiMediaPreviewDialog = ({
  open,
  onClose,
  onSend,
  media,
  onRemove
}: MultiMediaPreviewDialogProps) => {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(caption || undefined);
    setCaption('');
    onClose();
  };

  const handleClose = () => {
    setCaption('');
    onClose();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return FileText;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return Video;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return Music;
    if (['pdf'].includes(ext || '')) return FileText;
    return File;
  };

  const imageCount = media.filter(m => m.type === 'image').length;
  const videoCount = media.filter(m => m.type === 'video').length;
  const docCount = media.filter(m => m.type === 'document').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Send {media.length} file{media.length > 1 ? 's' : ''}
              <span className="text-sm text-muted-foreground ml-2">
                {imageCount > 0 && `${imageCount} image${imageCount > 1 ? 's' : ''}`}
                {videoCount > 0 && `${imageCount > 0 ? ', ' : ''}${videoCount} video${videoCount > 1 ? 's' : ''}`}
                {docCount > 0 && `${(imageCount + videoCount) > 0 ? ', ' : ''}${docCount} doc${docCount > 1 ? 's' : ''}`}
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Media Grid */}
          <ScrollArea className="h-[400px] p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {media.map((item, index) => {
                const FileIcon = getFileIcon(item.fileName);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    {/* Remove button */}
                    <button
                      onClick={() => onRemove(index)}
                      className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>

                    {/* Preview */}
                    {item.type === 'image' && (
                      <img
                        src={item.url}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.type === 'video' && (
                      <div className="relative w-full h-full">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    )}
                    {item.type === 'document' && (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                        <FileIcon className="w-10 h-10 text-blue-600 mb-1" />
                        <p className="text-xs text-center truncate w-full text-foreground">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSize)}
                        </p>
                      </div>
                    )}

                    {/* File size badge */}
                    {(item.type === 'image' || item.type === 'video') && item.fileSize && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs bg-black/60 text-white">
                        {formatFileSize(item.fileSize)}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Caption input */}
          <div className="p-6 border-t">
            <Textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="resize-none min-h-[80px] focus-visible:ring-primary/50"
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {caption.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={media.length === 0}
            className="min-w-[100px] bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
          >
            <Send className="w-4 h-4 mr-2" />
            Send {media.length > 1 ? `(${media.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

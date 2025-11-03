import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, X, File, Image as ImageIcon, Video, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (caption?: string) => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  fileName?: string;
  fileSize?: number;
}

export const MediaPreviewDialog = ({
  open,
  onClose,
  onSend,
  mediaUrl,
  mediaType,
  fileName,
  fileSize
}: MediaPreviewDialogProps) => {
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

  const getFileIcon = () => {
    if (!fileName) return FileText;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return Video;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return Music;
    if (['pdf'].includes(ext || '')) return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {mediaType === 'image' ? 'Send Photo' : 
               mediaType === 'video' ? 'Send Video' : 
               'Send Document'}
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
          {/* Preview area */}
          <div className="relative bg-muted/30">
            {mediaType === 'image' && (
              <div className="flex items-center justify-center min-h-[400px] max-h-[60vh] p-4">
                <img 
                  src={mediaUrl} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg" 
                  alt="Preview"
                />
              </div>
            )}
            {mediaType === 'video' && (
              <div className="flex items-center justify-center min-h-[400px] max-h-[60vh] p-4 bg-black">
                <video 
                  src={mediaUrl} 
                  controls 
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  style={{ maxHeight: '60vh' }}
                />
              </div>
            )}
            {mediaType === 'document' && (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl"
                >
                  <FileIcon className="w-12 h-12 text-white" />
                </motion.div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground max-w-md truncate px-4">
                    {fileName || 'Document'}
                  </p>
                  {fileSize && (
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(fileSize)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </p>
                </div>
              </div>
            )}
          </div>

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
            className="min-w-[100px] bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

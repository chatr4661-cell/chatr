import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface MediaPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (caption?: string) => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  fileName?: string;
}

export const MediaPreviewDialog = ({
  open,
  onClose,
  onSend,
  mediaUrl,
  mediaType,
  fileName
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send {mediaType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview area */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {mediaType === 'image' && (
              <img 
                src={mediaUrl} 
                className="w-full h-full object-contain" 
                alt="Preview"
              />
            )}
            {mediaType === 'video' && (
              <video 
                src={mediaUrl} 
                controls 
                className="w-full h-full object-contain"
              />
            )}
            {mediaType === 'document' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="w-16 h-16 text-muted-foreground" />
                <p className="text-sm font-medium">{fileName || 'Document'}</p>
              </div>
            )}
          </div>

          {/* Caption input */}
          <Textarea
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

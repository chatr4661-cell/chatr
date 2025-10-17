import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Reply, 
  Forward, 
  Star, 
  Copy, 
  Download, 
  Share2, 
  Edit, 
  Trash 
} from 'lucide-react';

interface MessageAction {
  icon: React.ElementType;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
  show?: boolean;
}

interface MessageContextMenuProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  actions: MessageAction[];
  message: any;
}

export const MessageContextMenu = ({ 
  open, 
  onClose, 
  actions 
}: MessageContextMenuProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Message Actions</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 p-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/10 active:scale-95'
                    : 'text-foreground hover:bg-accent active:scale-95'
                }`}
              >
                <div className={`p-3 rounded-full ${
                  action.variant === 'destructive' 
                    ? 'bg-destructive/10' 
                    : 'bg-primary/10'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

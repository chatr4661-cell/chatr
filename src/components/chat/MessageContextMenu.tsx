import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Message Actions</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/5 active:bg-destructive/10'
                    : 'text-foreground hover:bg-accent/50 active:bg-accent'
                }`}
              >
                <span className="text-[17px] font-normal">{action.label}</span>
                <Icon className="w-6 h-6" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

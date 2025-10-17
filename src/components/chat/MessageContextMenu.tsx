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
      <DialogContent className="sm:max-w-[260px] max-w-[240px] p-0 gap-0 bg-background/80 backdrop-blur-2xl border-border/30 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Message Actions</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/20">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/5 active:bg-destructive/10'
                    : 'text-foreground hover:bg-accent/30 active:bg-accent/50'
                }`}
              >
                <span className="text-[14px] font-normal">{action.label}</span>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

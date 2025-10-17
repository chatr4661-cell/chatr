import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="p-0 rounded-t-3xl border-t bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Message Actions</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors ${
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/5 active:bg-destructive/10'
                    : 'text-foreground hover:bg-accent/30 active:bg-accent/50'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-base font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

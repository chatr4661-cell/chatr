import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { cn } from '@/lib/utils';

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
  const haptics = useNativeHaptics();
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const handleActionClick = async (action: MessageAction, index: number) => {
    // Trigger haptic feedback
    await haptics.light();
    
    // Execute action
    action.action();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="p-0 pb-safe rounded-t-[20px] border-none bg-background/98 backdrop-blur-2xl shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12)] animate-slide-in-bottom"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Message Actions</SheetTitle>
          <SheetDescription>Choose an action for this message</SheetDescription>
        </SheetHeader>
        
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="py-1 px-2">
          {actions.map((action, index) => {
            if (action.show === false) return null;
            
            const Icon = action.icon;
            const isPressed = pressedIndex === index;
            const isDestructive = action.variant === 'destructive';
            
            return (
              <button
                key={index}
                onMouseDown={() => setPressedIndex(index)}
                onMouseUp={() => setPressedIndex(null)}
                onMouseLeave={() => setPressedIndex(null)}
                onTouchStart={() => setPressedIndex(index)}
                onTouchEnd={() => setPressedIndex(null)}
                onClick={() => handleActionClick(action, index)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 touch-manipulation",
                  "hover:bg-accent/40 active:scale-[0.98]",
                  isPressed && "bg-accent/50",
                  isDestructive 
                    ? "text-destructive hover:bg-destructive/10 active:bg-destructive/15" 
                    : "text-foreground"
                )}
              >
                <div className={cn(
                  "transition-transform duration-200",
                  isPressed && "scale-90"
                )}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span className="text-[15px] font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom spacing for safe area */}
        <div className="h-2" />
      </SheetContent>
    </Sheet>
  );
};

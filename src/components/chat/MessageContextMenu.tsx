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
import { Reply, Forward, Star, Pin, Trash2, AlertTriangle, Sparkles, Languages, MessageSquare, ListTodo } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MessageAction {
  icon: React.ElementType;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'ai';
  show?: boolean;
  section?: 'main' | 'ai';
}

interface MessageContextMenuProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  actions: MessageAction[];
  message: any;
  onReply?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onAISummarize?: () => void;
  onAITranslate?: () => void;
  onAISmartReply?: () => void;
  onAIExtractAction?: () => void;
  isStarred?: boolean;
  isPinned?: boolean;
}

export const MessageContextMenu = ({ 
  open, 
  onClose, 
  actions,
  message,
  onReply,
  onForward,
  onStar,
  onPin,
  onDelete,
  onReport,
  onAISummarize,
  onAITranslate,
  onAISmartReply,
  onAIExtractAction,
  isStarred = false,
  isPinned = false
}: MessageContextMenuProps) => {
  const haptics = useNativeHaptics();
  const [pressedIndex, setPressedIndex] = useState<string | null>(null);

  const handleActionClick = async (action: MessageAction, id: string) => {
    // Trigger haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
    await haptics.light();
    
    // Execute action
    action.action();
    onClose();
  };

  // Define default actions if not provided
  const defaultActions: MessageAction[] = [
    { icon: Reply, label: 'Reply', action: onReply || (() => {}), show: !!onReply, section: 'main' },
    { icon: Forward, label: 'Forward', action: onForward || (() => {}), show: !!onForward, section: 'main' },
    { icon: Star, label: isStarred ? 'Unstar' : 'Star', action: onStar || (() => {}), show: !!onStar, section: 'main' },
    { icon: Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin || (() => {}), show: !!onPin, section: 'main' },
    { icon: Trash2, label: 'Delete', action: onDelete || (() => {}), variant: 'destructive', show: !!onDelete, section: 'main' },
    { icon: AlertTriangle, label: 'Report', action: onReport || (() => {}), variant: 'destructive', show: !!onReport, section: 'main' },
  ];

  const aiActions: MessageAction[] = [
    { icon: Sparkles, label: 'Summarize Conversation', action: onAISummarize || (() => {}), variant: 'ai', show: !!onAISummarize, section: 'ai' },
    { icon: Languages, label: 'Translate Message', action: onAITranslate || (() => {}), variant: 'ai', show: !!onAITranslate, section: 'ai' },
    { icon: MessageSquare, label: 'Generate Smart Reply', action: onAISmartReply || (() => {}), variant: 'ai', show: !!onAISmartReply, section: 'ai' },
    { icon: ListTodo, label: 'Extract Action / Task', action: onAIExtractAction || (() => {}), variant: 'ai', show: !!onAIExtractAction, section: 'ai' },
  ];

  const allActions = actions.length > 0 ? actions : [...defaultActions, ...aiActions];
  const mainActions = allActions.filter(a => a.section !== 'ai' && a.show !== false);
  const aiSectionActions = allActions.filter(a => a.section === 'ai' && a.show !== false);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="p-0 pb-safe rounded-t-[20px] border-none bg-card/98 backdrop-blur-2xl shadow-[0_-4px_32px_-4px_rgba(0,0,0,0.1)] animate-slide-in-bottom"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Message Actions</SheetTitle>
          <SheetDescription>Choose an action for this message</SheetDescription>
        </SheetHeader>
        
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-3">
          <div className="w-12 h-1.5 rounded-full bg-muted/40" />
        </div>

        <div className="pb-4 px-3">
          {/* Main Actions */}
          {mainActions.length > 0 && (
            <div className="space-y-1">
              {mainActions.map((action, index) => {
                const Icon = action.icon;
                const id = `main-${index}`;
                const isPressed = pressedIndex === id;
                const isDestructive = action.variant === 'destructive';
                
                return (
                  <button
                    key={id}
                    onMouseDown={() => setPressedIndex(id)}
                    onMouseUp={() => setPressedIndex(null)}
                    onMouseLeave={() => setPressedIndex(null)}
                    onTouchStart={() => setPressedIndex(id)}
                    onTouchEnd={() => setPressedIndex(null)}
                    onClick={() => handleActionClick(action, id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 touch-manipulation",
                      "hover:bg-accent active:scale-[0.98]",
                      isPressed && "bg-accent/80 scale-[0.98]",
                      isDestructive 
                        ? "text-destructive hover:bg-destructive/10" 
                        : "text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                      isPressed && "scale-90",
                      isDestructive ? "bg-destructive/10" : "bg-primary/10"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isDestructive ? "text-destructive" : "text-primary"
                      )} strokeWidth={2} />
                    </div>
                    <span className="text-[15px] font-medium flex-1">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI Actions Section */}
          {aiSectionActions.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="px-4 py-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Actions</span>
              </div>
              <div className="space-y-1">
                {aiSectionActions.map((action, index) => {
                  const Icon = action.icon;
                  const id = `ai-${index}`;
                  const isPressed = pressedIndex === id;
                  
                  return (
                    <button
                      key={id}
                      onMouseDown={() => setPressedIndex(id)}
                      onMouseUp={() => setPressedIndex(null)}
                      onMouseLeave={() => setPressedIndex(null)}
                      onTouchStart={() => setPressedIndex(id)}
                      onTouchEnd={() => setPressedIndex(null)}
                      onClick={() => handleActionClick(action, id)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 touch-manipulation",
                        "hover:bg-primary/5 active:scale-[0.98]",
                        isPressed && "bg-primary/10 scale-[0.98]"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 transition-all duration-200",
                        isPressed && "scale-90"
                      )}>
                        <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                      </div>
                      <span className="text-[15px] font-medium text-foreground flex-1">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom safe area spacing */}
        <div className="h-2" />
      </SheetContent>
    </Sheet>
  );
};

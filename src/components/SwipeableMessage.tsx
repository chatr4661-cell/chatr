import { useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import { Reply, Trash2 } from 'lucide-react';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply?: () => void;
  onDelete?: () => void;
  messageId: string;
}

export const SwipeableMessage = ({ 
  children, 
  onReply, 
  onDelete,
  messageId 
}: SwipeableMessageProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const bind: any = useGesture({
    onDrag: ({ movement: [mx], direction: [xDir], cancel }) => {
      if (!ref.current) return;

      // Swipe right to reply
      if (xDir > 0 && mx > 80) {
        onReply?.();
        cancel();
        ref.current.style.transform = 'translateX(0px)';
        return;
      }

      // Swipe left to delete
      if (xDir < 0 && mx < -80) {
        onDelete?.();
        cancel();
        ref.current.style.transform = 'translateX(0px)';
        return;
      }

      // Apply transform during drag
      if (Math.abs(mx) < 120) {
        ref.current.style.transform = `translateX(${mx}px)`;
      }
    },
    onDragEnd: () => {
      if (ref.current) {
        ref.current.style.transform = 'translateX(0px)';
      }
    }
  });

  return (
    <div className="relative">
      {/* Reply indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity">
        <Reply className="w-5 h-5 text-primary" />
      </div>

      {/* Delete indicator */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition-opacity">
        <Trash2 className="w-5 h-5 text-destructive" />
      </div>

      {/* Message content */}
      <div
        ref={ref}
        {...bind()}
        className="transition-transform touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
};

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Image, 
  MapPin, 
  User, 
  FileText, 
  BarChart3,
  Calendar,
  DollarSign,
  Sparkles,
  X
} from 'lucide-react';

interface AttachmentMenuProps {
  onClose: () => void;
  onPhotoVideo: () => void;
  onLocation: () => void;
  onContact: () => void;
  onDocument: () => void;
  onPoll: () => void;
  onEvent: () => void;
  onPayment: () => void;
  onAIImage: () => void;
}

export const AttachmentMenu = ({
  onClose,
  onPhotoVideo,
  onLocation,
  onContact,
  onDocument,
  onPoll,
  onEvent,
  onPayment,
  onAIImage,
}: AttachmentMenuProps) => {
  const options = [
    { icon: Image, label: 'Photos & Videos', onClick: onPhotoVideo, color: 'text-purple-500' },
    { icon: MapPin, label: 'Location', onClick: onLocation, color: 'text-green-500' },
    { icon: User, label: 'Contact', onClick: onContact, color: 'text-blue-500' },
    { icon: FileText, label: 'Document', onClick: onDocument, color: 'text-indigo-500' },
    { icon: BarChart3, label: 'Poll', onClick: onPoll, color: 'text-orange-500' },
    { icon: Calendar, label: 'Event', onClick: onEvent, color: 'text-red-500' },
    { icon: DollarSign, label: 'Payment', onClick: onPayment, color: 'text-emerald-500' },
    { icon: Sparkles, label: 'AI Image', onClick: onAIImage, color: 'text-amber-500' },
  ];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-card to-card/95 rounded-t-[2rem] p-5 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Share</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 hover:bg-muted/50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95 touch-manipulation"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center ${option.color} shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

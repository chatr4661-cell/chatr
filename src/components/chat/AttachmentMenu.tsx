import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Image, 
  Camera, 
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
  onCamera: () => void;
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
  onCamera,
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
    { icon: Camera, label: 'Camera', onClick: onCamera, color: 'text-pink-500' },
    { icon: MapPin, label: 'Location', onClick: onLocation, color: 'text-green-500' },
    { icon: User, label: 'Contact', onClick: onContact, color: 'text-blue-500' },
    { icon: FileText, label: 'Document', onClick: onDocument, color: 'text-indigo-500' },
    { icon: BarChart3, label: 'Poll', onClick: onPoll, color: 'text-orange-500' },
    { icon: Calendar, label: 'Event', onClick: onEvent, color: 'text-red-500' },
    { icon: DollarSign, label: 'Payment', onClick: onPayment, color: 'text-emerald-500' },
    { icon: Sparkles, label: 'AI Image', onClick: onAIImage, color: 'text-amber-500' },
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 shadow-elevated">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Share</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted transition-all active:scale-95"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-muted flex items-center justify-center ${option.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-center">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

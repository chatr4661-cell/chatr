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
  X,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AttachmentMenuProps {
  onClose: () => void;
  onPhotoVideo: () => void;
  onCamera?: () => void;
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
    { 
      icon: Camera, 
      label: 'Camera', 
      description: 'Take photo',
      onClick: onCamera || onPhotoVideo, 
      gradient: 'from-blue-500 to-blue-600' 
    },
    { 
      icon: Image, 
      label: 'Gallery', 
      description: 'Choose photo',
      onClick: onPhotoVideo, 
      gradient: 'from-purple-500 to-purple-600' 
    },
    { 
      icon: MapPin, 
      label: 'Location', 
      description: 'Share location',
      onClick: onLocation, 
      gradient: 'from-green-500 to-green-600' 
    },
    { 
      icon: User, 
      label: 'Contact', 
      description: 'Share contact',
      onClick: onContact, 
      gradient: 'from-cyan-500 to-cyan-600' 
    },
    { 
      icon: FileText, 
      label: 'Document', 
      description: 'Share file',
      onClick: onDocument, 
      gradient: 'from-indigo-500 to-indigo-600' 
    },
    { 
      icon: BarChart3, 
      label: 'Poll', 
      description: 'Create poll',
      onClick: onPoll, 
      gradient: 'from-orange-500 to-orange-600' 
    },
    { 
      icon: Calendar, 
      label: 'Event', 
      description: 'Schedule event',
      onClick: onEvent, 
      gradient: 'from-red-500 to-red-600' 
    },
    { 
      icon: DollarSign, 
      label: 'Payment', 
      description: 'Request payment',
      onClick: onPayment, 
      gradient: 'from-emerald-500 to-emerald-600' 
    },
    { 
      icon: Sparkles, 
      label: 'AI Image', 
      description: 'Generate image',
      onClick: onAIImage, 
      gradient: 'from-amber-500 to-amber-600' 
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] p-6 pb-10 shadow-2xl border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Send Attachment</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-9 w-9"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all active:scale-95 touch-manipulation"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} text-white shadow-lg flex items-center justify-center`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

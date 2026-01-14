import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, VideoOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoUpgradeModalProps {
  open: boolean;
  contactName: string;
  contactAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function VideoUpgradeModal({
  open,
  contactName,
  contactAvatar,
  onAccept,
  onReject,
}: VideoUpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept();
    setIsProcessing(false);
  };

  const handleReject = () => {
    onReject();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-sm bg-slate-900/95 border-slate-700 backdrop-blur-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-4"
        >
          {/* Avatar */}
          <div className="relative mb-4">
            {contactAvatar ? (
              <img 
                src={contactAvatar} 
                alt={contactName}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-500/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-4 ring-emerald-500/30">
                <span className="text-3xl font-bold text-white">
                  {contactName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center"
            >
              <Video className="w-4 h-4 text-white" />
            </motion.div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white mb-1">
            Video Request
          </h3>
          <p className="text-sm text-slate-400 text-center mb-6">
            <span className="text-white font-medium">{contactName}</span> wants to switch to video call
          </p>

          {/* Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={handleReject}
              disabled={isProcessing}
            >
              <VideoOff className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAccept}
              disabled={isProcessing}
            >
              <Video className="w-4 h-4 mr-2" />
              {isProcessing ? 'Enabling...' : 'Accept'}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

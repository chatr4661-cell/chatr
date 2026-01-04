import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Heart, 
  Users,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface EmergencyButtonProps {
  onEmergency?: () => void;
}

export function EmergencyButton({ onEmergency }: EmergencyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<'confirm' | 'processing' | 'complete'>('confirm');
  const [progress, setProgress] = useState(0);

  const handleEmergency = async () => {
    setStage('processing');
    
    // Simulate emergency actions
    const steps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 1000 },
      { progress: 60, delay: 1500 },
      { progress: 80, delay: 2000 },
      { progress: 100, delay: 2500 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay - (steps.indexOf(step) > 0 ? steps[steps.indexOf(step) - 1].delay : 0)));
      setProgress(step.progress);
    }

    setStage('complete');
    onEmergency?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStage('confirm');
      setProgress(0);
    }, 300);
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button 
          variant="destructive"
          size="lg"
          className="w-full h-14 text-base font-bold gap-2 bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-200"
          onClick={() => setIsOpen(true)}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AlertTriangle className="h-5 w-5" />
          </motion.div>
          Emergency SOS
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <AnimatePresence mode="wait">
            {stage === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency SOS
                  </DialogTitle>
                  <DialogDescription>
                    This will immediately:
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 my-4">
                  {[
                    { icon: MapPin, text: 'Share your live location' },
                    { icon: Heart, text: 'Send your health profile' },
                    { icon: Users, text: 'Alert your emergency contacts' },
                    { icon: Phone, text: 'Connect to nearest hospital' },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-red-50 rounded-lg"
                    >
                      <item.icon className="h-5 w-5 text-red-500" />
                      <span className="text-sm">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={handleEmergency}
                  >
                    Confirm Emergency
                  </Button>
                </div>
              </motion.div>
            )}

            {stage === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4"
                >
                  <Loader2 className="w-16 h-16 text-red-500" />
                </motion.div>
                <h3 className="font-semibold text-lg mb-2">Activating Emergency</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {progress < 30 && 'Sharing location...'}
                  {progress >= 30 && progress < 60 && 'Sending health profile...'}
                  {progress >= 60 && progress < 90 && 'Alerting contacts...'}
                  {progress >= 90 && 'Connecting to hospital...'}
                </p>
                <Progress value={progress} className="h-2" />
              </motion.div>
            )}

            {stage === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-green-600" />
                </motion.div>
                <h3 className="font-semibold text-lg mb-2">Emergency Activated</h3>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p>✓ Location shared</p>
                  <p>✓ Family notified</p>
                  <p>✓ Hospital alerted</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-red-700">Ambulance ETA: ~8 mins</p>
                  <p className="text-xs text-red-600">Apollo Hospital, Jubilee Hills</p>
                </div>
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

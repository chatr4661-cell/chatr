import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ContactSyncOnboardingProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function ContactSyncOnboarding({ open, onClose, onComplete }: ContactSyncOnboardingProps) {
  const [step, setStep] = useState<'permission' | 'syncing' | 'complete'>('permission');

  const handleAllow = () => {
    setStep('syncing');
    // Simulate syncing
    setTimeout(() => {
      setStep('complete');
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center py-6">
          {step === 'permission' && (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Sync Your Contacts</h2>
              <p className="text-muted-foreground mb-6">
                CHATR needs access to your contacts to help you connect with friends and family who are already using the app.
              </p>
              <div className="w-full space-y-3 mb-6">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm">Find friends already on CHATR</p>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm">Invite contacts to join CHATR</p>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Your contacts are encrypted and never shared</p>
                </div>
              </div>
              <div className="w-full space-y-2">
                <Button onClick={handleAllow} className="w-full">
                  Allow Access
                </Button>
                <Button onClick={onClose} variant="ghost" className="w-full">
                  Not Now
                </Button>
              </div>
            </>
          )}

          {step === 'syncing' && (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 animate-pulse">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Syncing Contacts</h2>
              <p className="text-muted-foreground">Please wait while we sync your contacts...</p>
            </>
          )}

          {step === 'complete' && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">All Set!</h2>
              <p className="text-muted-foreground">Your contacts have been synced successfully.</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

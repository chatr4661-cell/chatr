import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Sparkles, Shield, ArrowRight, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ConversionActionBarProps {
  pageTitle?: string;
  useCaseLabel?: string;
  cityName?: string;
}

export const ConversionActionBar = ({ pageTitle, useCaseLabel, cityName }: ConversionActionBarProps) => {
  const navigate = useNavigate();
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleStartDirectChat = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setConnecting(true);
    try {
      const last10 = digits.slice(-10);
      const { data: matched } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`phone_search.ilike.%${last10}%,phone_number.ilike.%${last10}%`)
        .limit(1);

      if (matched && matched.length > 0) {
        navigate(`/chat?user=${matched[0].id}`);
      } else {
        // Direct to auth or WhatsApp invite
        const fullPhone = digits.length === 10 ? `91${digits}` : digits;
        window.open(
          `https://wa.me/${fullPhone}?text=${encodeURIComponent(
            "Hey! I'm messaging you from Chatr — free messaging, voice & live call translation: https://chatr.chat"
          )}`,
          '_blank'
        );
        navigate('/auth');
      }
    } catch {
      navigate('/auth');
    } finally {
      setConnecting(false);
      setShowNumberDialog(false);
    }
  };

  return (
    <>
      {/* Sticky Bottom Customer Acquisition Bar for All Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-md px-3 py-2.5 shadow-2xl transition-all sm:px-6 sm:py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          {/* Left Info: Value Prop */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {useCaseLabel
                  ? `${useCaseLabel}${cityName ? ` in ${cityName}` : ''} on Chatr`
                  : 'Chatr — Free AI Messaging & Calls'}
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block truncate">
              End-to-end encrypted · Works over any network · Sign in with your phone number
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Number Entry */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNumberDialog(true)}
              className="hidden h-9 rounded-xl border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/10 md:inline-flex"
            >
              <Phone className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Message a Number
            </Button>

            {/* Primary CTA */}
            <Button
              size="sm"
              onClick={() => navigate('/auth')}
              className="h-9 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:px-4"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Start Free Chat
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>

            {/* Dismiss button */}
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              aria-label="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Direct Phone Message Modal */}
      <Dialog open={showNumberDialog} onOpenChange={setShowNumberDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Phone className="h-4 w-4" />
              </div>
              Message Any Phone Number
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter any 10-digit mobile number to chat, call, or invite instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-xl bg-muted px-3 text-xs font-semibold text-muted-foreground">
                🇮🇳 +91
              </span>
              <Input
                type="tel"
                placeholder="Enter 10-digit number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && handleStartDirectChat()}
                className="h-10 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-600" />
                No credit card required
              </span>
              <span>100% Free</span>
            </div>

            <Button
              onClick={handleStartDirectChat}
              disabled={phoneNumber.length < 10 || connecting}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              {connecting ? 'Connecting...' : 'Start Conversation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

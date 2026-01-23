import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Share2, RotateCcw, Volume2 } from 'lucide-react';
import { useDhandhaVoice } from '@/hooks/useDhandhaVoice';
import { generateUPILink, generatePaymentCard, formatAmount } from '@/utils/upiGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceBillingCardProps {
  merchantProfile: {
    id: string;
    upi_id: string;
    business_name: string | null;
  };
  onTransactionCreated: () => void;
}

export const VoiceBillingCard = ({ merchantProfile, onTransactionCreated }: VoiceBillingCardProps) => {
  const { isListening, transcript, startListening, stopListening, extractAmount } = useDhandhaVoice();
  const [detectedAmount, setDetectedAmount] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTransaction, setCreatedTransaction] = useState<{
    id: string;
    upiLink: string;
    shareText: string;
  } | null>(null);

  // Real-time amount detection while speaking
  useEffect(() => {
    if (transcript) {
      const amount = extractAmount(transcript);
      if (amount && amount > 0) {
        setDetectedAmount(amount);
      }
    }
  }, [transcript, extractAmount]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setDetectedAmount(null);
      setCreatedTransaction(null);
      startListening();
    }
  };

  const handleCreateBill = async () => {
    if (!detectedAmount || detectedAmount <= 0) {
      toast.error('Please say an amount first');
      return;
    }

    setIsCreating(true);

    try {
      const upiLink = generateUPILink({
        upiId: merchantProfile.upi_id,
        amount: detectedAmount,
        businessName: merchantProfile.business_name || 'Shop',
      });

      const shareText = generatePaymentCard({
        upiId: merchantProfile.upi_id,
        amount: detectedAmount,
        businessName: merchantProfile.business_name || 'Shop',
      });

      // Save transaction to database
      const { data, error } = await supabase
        .from('dhandha_transactions')
        .insert({
          merchant_id: merchantProfile.id,
          amount: detectedAmount,
          fee_coins: 1,
          status: 'pending',
          upi_link: upiLink,
          voice_input: transcript
        })
        .select('id')
        .single();

      if (error) throw error;

      // Deduct 1 coin from user's balance via point_transactions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.from('point_transactions').insert({
            user_id: user.id,
            amount: -1,
            source: 'dhandha',
            transaction_type: 'fee',
            description: `Bill fee: ₹${detectedAmount}`
          });
        } catch (e) {
          console.log('Points deduction skipped');
        }
      }

      setCreatedTransaction({
        id: data.id,
        upiLink,
        shareText
      });

      toast.success('Bill created! ₹1 coin deducted');
      onTransactionCreated();
    } catch (error) {
      console.error('Create bill error:', error);
      toast.error('Failed to create bill');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async () => {
    if (!createdTransaction) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Payment Request - ${formatAmount(detectedAmount!)}`,
          text: createdTransaction.shareText,
          url: createdTransaction.upiLink
        });
      } else {
        await navigator.clipboard.writeText(createdTransaction.shareText);
        toast.success('Copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      await navigator.clipboard.writeText(createdTransaction.shareText);
      toast.success('Copied to clipboard!');
    }
  };

  const handleReset = () => {
    setDetectedAmount(null);
    setCreatedTransaction(null);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Voice Input Section */}
        <div className="text-center space-y-4">
          {/* Mic Button */}
          <motion.button
            onClick={handleVoiceToggle}
            disabled={!!createdTransaction}
            className={cn(
              "w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all",
              isListening 
                ? "bg-red-500 shadow-lg shadow-red-500/30" 
                : "bg-primary shadow-lg shadow-primary/30",
              createdTransaction && "opacity-50 cursor-not-allowed"
            )}
            animate={isListening ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
          >
            {isListening ? (
              <MicOff className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </motion.button>

          {/* Instructions / Transcript */}
          <div className="min-h-[60px]">
            {isListening ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  Listening...
                </p>
                {transcript && (
                  <p className="text-lg font-medium">"{transcript}"</p>
                )}
              </div>
            ) : createdTransaction ? (
              <p className="text-sm text-green-600 font-medium">✓ Bill Ready to Share</p>
            ) : (
              <p className="text-muted-foreground">
                Tap mic and say amount<br />
                <span className="text-sm">e.g., "₹450 ka bill"</span>
              </p>
            )}
          </div>

          {/* Detected Amount */}
          <AnimatePresence>
            {detectedAmount && detectedAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-4"
              >
                <p className="text-4xl font-bold text-primary">
                  {formatAmount(detectedAmount)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {createdTransaction ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Bill
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </>
            ) : (
              <Button
                className="w-full h-12 text-lg"
                disabled={!detectedAmount || detectedAmount <= 0 || isCreating || isListening}
                onClick={handleCreateBill}
              >
                {isCreating ? 'Creating...' : 'Create Bill (₹1 coin)'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share2, Copy, Users, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ReferralSystem = () => {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('code, uses')
        .eq('user_id', user.id)
        .maybeSingle();

      if (codeData) {
        setReferralCode(codeData.code);
        setReferralCount(codeData.uses || 0);
      } else {
        // Generate new code
        const { data: newCode, error } = await supabase
          .rpc('generate_user_referral_code');
        
        if (!error && newCode) {
          setReferralCode(newCode);
        }
      }
    } catch (error) {
      console.error('[REFERRAL] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!', {
      description: 'Share it with friends to earn 50 coins per referral!',
    });
  };

  const shareReferralCode = async () => {
    const shareData = {
      title: 'Join Chatr!',
      text: `Use my referral code ${referralCode} and get 25 bonus coins! 🎉`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

  const applyReferralCode = async () => {
    if (!inputCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('process_referral_reward', { referral_code_param: inputCode.toUpperCase() });

      if (error) throw error;

      if (data) {
        toast.success('Referral applied! 🎉', {
          description: 'You received 25 bonus coins!',
        });
        setInputCode('');
      } else {
        toast.error('Invalid referral code');
      }
    } catch (error: any) {
      console.error('[REFERRAL] Apply error:', error);
      toast.error(error.message || 'Failed to apply referral code');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your code and earn 50 coins for each friend who joins!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold tracking-wider">{referralCode}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={copyReferralCode} variant="outline" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
            <Button onClick={shareReferralCode} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">Successful Referrals</span>
            <Badge variant="secondary" className="text-lg">
              {referralCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Have a Referral Code?
          </CardTitle>
          <CardDescription>
            Enter a friend's code to get 25 bonus coins!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="uppercase"
            />
            <Button onClick={applyReferralCode}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

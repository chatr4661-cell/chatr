import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const JoinInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const inviteCode = searchParams.get('invite');

  useEffect(() => {
    // Track invite click
    const trackClick = async () => {
      if (inviteCode) {
        // Store invite code for after signup
        localStorage.setItem('pending_invite_code', inviteCode);

        // Update invite status to clicked
        await supabase
          .from('contact_invites')
          .update({ 
            status: 'clicked',
            clicked_at: new Date().toISOString()
          })
          .eq('invite_code', inviteCode);

        // Try to get inviter info
        const { data } = await supabase
          .from('contact_invites')
          .select('inviter_id')
          .eq('invite_code', inviteCode)
          .single();

        if (data?.inviter_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.inviter_id)
            .single();
          
          setInviterName(profile?.username || 'A friend');
        }
      }
      setLoading(false);
    };

    trackClick();
  }, [inviteCode]);

  const handleJoin = () => {
    navigate('/auth', { state: { inviteCode } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20">
        <div className="animate-pulse">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden border-primary/20 backdrop-blur-xl bg-background/80">
          <div className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 p-6 text-white text-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Gift className="h-16 w-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">You're Invited! 🎉</h1>
              {inviterName && (
                <p className="text-white/80">
                  {inviterName} wants you to join Chatr
                </p>
              )}
            </motion.div>
          </div>

          <CardContent className="p-6 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-lg mb-4">
                Join India's #1 super app for messaging, jobs, healthcare & more!
              </p>
              
              <div className="bg-yellow-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold text-xl">
                  <Sparkles className="h-6 w-6" />
                  Get 25 FREE Coins!
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Sign up now and start earning rewards
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-accent/50">
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs">Chat & Call</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-accent/50">
                  <Gift className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-xs">Local Jobs</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-accent/50">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-xs">Healthcare</p>
                </div>
              </div>

              <Button 
                onClick={handleJoin}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
              >
                Join Chatr Now
                <ArrowRight className="h-5 w-5" />
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Already have an account?{' '}
                <span 
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => navigate('/auth')}
                >
                  Login here
                </span>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default JoinInvite;

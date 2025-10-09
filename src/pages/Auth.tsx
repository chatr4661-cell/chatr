import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhoneAuth } from '@/components/PhoneAuth';
import logo from '@/assets/chatr-logo.png';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { hashPin } from '@/utils/pinSecurity';
import { updateUserPhoneHash } from '@/utils/phoneHashUtil';

const Auth = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Handle Google OAuth recovery flow (when user forgets PIN)
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, phone_hash')
          .eq('id', session.user.id)
          .maybeSingle();

        // If Google sign-in without phone number, this is a new device recovery
        if (!profile?.phone_number && session.user.email) {
          toast({
            title: 'Account Recovery',
            description: 'Please contact support to recover your account',
            variant: 'destructive'
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Update phone hash if missing
        if (profile?.phone_number && !profile.phone_hash) {
          await updateUserPhoneHash(supabase, session.user.id, profile.phone_number);
        }

        window.location.href = '/';
      } else {
        setLoading(false);
      }
    };

    handleAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Ensure existing users have phone_hash if they have a phone_number
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, phone_hash')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.phone_number && !profile.phone_hash) {
          await updateUserPhoneHash(supabase, session.user.id, profile.phone_number);
        }
        
        window.location.href = '/';
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background/50 backdrop-blur-3xl" />
        <div className="text-center">
          <img src={logo} alt="chatr.chat" className="h-20 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background/50 backdrop-blur-3xl" />
      
      <div className="relative w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <img src={logo} alt="chatr.chat" className="h-20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Secure messaging for everyone</p>
        </div>
        
        <PhoneAuth />
      </div>
    </div>
  );
};

export default Auth;


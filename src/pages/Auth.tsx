import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhoneAuth } from '@/components/PhoneAuth';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import logo from '@/assets/chatr-logo.png';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();
  const onboarding = useOnboarding(userId);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for active device session
        const deviceFingerprint = await getDeviceFingerprint();
        
        const { data: deviceSession } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('device_fingerprint', deviceFingerprint)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (deviceSession) {
          setUserId(deviceSession.user_id);
          
          // Check onboarding status
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', deviceSession.user_id)
            .single();
          
          if (profile?.onboarding_completed) {
            window.location.href = '/';
          }
          return;
        }

        // Check for Google OAuth callback
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setUserId(session.user.id);
          
          // Google OAuth recovery flow
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            // Check onboarding status
            if (profile.onboarding_completed) {
              toast({
                title: 'Account Recovered',
                description: 'Please set a new PIN for this device',
              });
              window.location.href = '/';
            }
          } else {
            // New Google user, needs to link phone number
            toast({
              title: 'Link Phone Number',
              description: 'Please link your phone number to continue',
              variant: 'destructive'
            });
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        
        // Check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.onboarding_completed) {
          window.location.href = '/';
        }
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
      
      {userId && (
        <OnboardingDialog
          isOpen={onboarding.isOpen}
          userId={userId}
          onComplete={async () => {
            await onboarding.completeOnboarding();
            navigate("/");
          }}
          onSkip={async () => {
            await onboarding.skipOnboarding();
            navigate("/");
          }}
        />
      )}
    </div>
  );
};

export default Auth;

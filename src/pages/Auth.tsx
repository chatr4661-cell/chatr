import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhoneAuth } from '@/components/PhoneAuth';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Footer } from '@/components/Footer';
import logo from '@/assets/chatr-logo.png';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import aiPoweredChatr from '@/assets/ai-powered-chatr.jpeg';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | undefined>();
  const onboarding = useOnboarding(userId);

  React.useEffect(() => {
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-mesh)' }} />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative w-full max-w-md z-10">
        {/* Brand Section */}
        <div className="text-center mb-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero blur-2xl opacity-50 rounded-full" />
              <img 
                src={chatrBrandLogo} 
                alt="Chatr - Say It. Share It. Live It." 
                className="h-24 w-auto relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              Chatr+
            </h1>
            <p className="text-muted-foreground text-sm">
              Smart Messaging, Privacy First
            </p>
          </div>
        </div>
        
        {/* Auth Card */}
        <PhoneAuth />
        
        {/* Footer Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-hero flex items-center justify-center">
              <span className="text-xl">🔒</span>
            </div>
            <p className="text-xs text-muted-foreground">Secure</p>
          </div>
          <div className="space-y-1">
            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-hero flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <p className="text-xs text-muted-foreground">Fast</p>
          </div>
          <div className="space-y-1">
            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-hero flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <p className="text-xs text-muted-foreground">AI Powered</p>
          </div>
        </div>
        </div>
        
        <Footer />
      
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

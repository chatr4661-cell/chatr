import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FirebasePhoneAuth } from '@/components/FirebasePhoneAuth';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Footer } from '@/components/Footer';
import logo from '@/assets/chatr-logo.png';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import aiPoweredChatr from '@/assets/ai-powered-chatr.jpeg';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { logAuthEvent, logAuthError } from '@/utils/authDebug';
import { BiometricLogin } from '@/components/BiometricLogin';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | undefined>();
  const onboarding = useOnboarding(userId);

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        logAuthEvent('Auth page: Checking session');
        
        // First check for existing auth session (including Google OAuth)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logAuthError('Session check', sessionError);
          setLoading(false);
          return;
        }

        if (session) {
          logAuthEvent('Active session found', {
            userId: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider,
          });
          
          console.log('[AUTH] Setting userId:', session.user.id);
          setUserId(session.user.id);
          
          // Ensure profile exists (Google users should have profile created by trigger)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('[AUTH] Profile fetch error:', profileError);
          }

          console.log('[AUTH] Profile status:', { 
            found: !!profile,
            username: profile?.username,
            onboardingCompleted: profile?.onboarding_completed 
          });

          if (profile) {
            // Check if user is admin
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            
            const isAdmin = roles?.some(r => r.role === "admin");
            
            // If onboarding is complete, redirect appropriately
            if (profile.onboarding_completed) {
              console.log('[AUTH] Onboarding already completed, redirecting...');
              
              // Check if there's a redirect path
              const redirectPath = sessionStorage.getItem('auth_redirect');
              sessionStorage.removeItem('auth_redirect');
              
              toast({
                title: 'Welcome back! 👋',
                description: `Signed in as ${profile.username || profile.email}`,
              });
              
              if (isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate(redirectPath || '/', { replace: true });
              }
              return;
            } else {
              console.log('[AUTH] Onboarding not completed - staying on auth page to show dialog');
              // Stay on auth page, onboarding dialog will show
            }
          } else {
            console.warn('[AUTH] No profile found for user, will be created by trigger or shown in onboarding');
          }
          
          setLoading(false);
          return;
        }

        // If no session, check for device session
        const deviceFingerprint = await getDeviceFingerprint();
        const { data: deviceSession } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('device_fingerprint', deviceFingerprint)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (deviceSession) {
          console.log('Active device session found');
          setUserId(deviceSession.user_id);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', deviceSession.user_id)
            .single();
          
          if (profile?.onboarding_completed) {
            navigate('/', { replace: true });
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes (phone auth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH STATE CHANGE]', event);
      
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        
        // INSTANT redirect - defer profile check
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, username, phone_number')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profile?.onboarding_completed) {
            const redirectPath = sessionStorage.getItem('auth_redirect');
            sessionStorage.removeItem('auth_redirect');
            toast({ title: 'Welcome back! 👋' });
            navigate(redirectPath || '/', { replace: true });
          } else {
            toast({ title: 'Welcome! 🎉', description: 'Complete your profile' });
          }
        }, 0);
      }
      
      if (event === 'SIGNED_OUT') {
        setUserId(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

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
        
        {/* Auth Options */}
        <div className="space-y-4">
          {/* Firebase Phone OTP Auth */}
          <FirebasePhoneAuth />

          {/* Biometric Login (Native Only) */}
          <BiometricLogin />
        </div>
        
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
        
        {/* Footer */}
        <Footer />
      </div>
      
      {/* Onboarding Dialog - Shows for new users */}
      {userId && (
        <>
          {console.log('[RENDER] Onboarding Dialog:', { 
            userId, 
            isOpen: onboarding.isOpen,
            shouldShow: !!userId 
          })}
          <OnboardingDialog
            isOpen={onboarding.isOpen}
            userId={userId}
            onComplete={async () => {
              console.log('[ONBOARDING] Completing onboarding...');
              await onboarding.completeOnboarding();
              
              // Check if there's a redirect path
              const redirectPath = sessionStorage.getItem('auth_redirect');
              sessionStorage.removeItem('auth_redirect');
              
              console.log('[ONBOARDING] Redirecting to:', redirectPath || '/');
              navigate(redirectPath || '/', { replace: true });
            }}
            onSkip={async () => {
              console.log('[ONBOARDING] Cannot skip - redirecting to complete onboarding');
              toast({
                title: "Complete Your Profile",
                description: "Please fill in your email and phone number to continue",
                variant: "destructive",
              });
            }}
          />
        </>
      )}
    </div>
  );
};

export default Auth;

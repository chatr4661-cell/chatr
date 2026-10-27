import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FirebasePhoneAuth } from '@/components/FirebasePhoneAuth';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Footer } from '@/components/Footer';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { logAuthEvent, logAuthError } from '@/utils/authDebug';
import { BiometricLogin } from '@/components/BiometricLogin';
import { AuthLoadingSkeleton } from '@/components/ui/PremiumEmptyStates';
import { AppleCard } from '@/components/ui/AppleCard';
import { motion } from 'framer-motion';

const checkHasLocalToken = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch {}
  return false;
};

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  // ⚡ Instant <5ms render: If user has no local token, render phone form immediately without blocking on network
  const hasLocalToken = React.useMemo(() => checkHasLocalToken(), []);
  const [loading, setLoading] = React.useState(hasLocalToken);
  const [userId, setUserId] = React.useState<string | undefined>();
  const onboarding = useOnboarding(userId);

  // Preserve a same-origin ?next= target (used by the agent-integration consent flow)
  React.useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      sessionStorage.setItem('auth_redirect', next);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        logAuthEvent('Auth page: Checking session');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

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
          
          setUserId(session.user.id);
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!mounted) return;

          if (profileError) {
            console.error('[AUTH] Profile fetch error:', profileError);
          }

          if (profile) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            
            const isAdmin = roles?.some(r => r.role === "admin");
            
            if (profile.onboarding_completed) {
              const redirectPath = sessionStorage.getItem('auth_redirect');
              sessionStorage.removeItem('auth_redirect');
              
              console.log('[AUTH] User signed in:', profile.username || profile.email);
              
              if (redirectPath) {
                navigate(redirectPath, { replace: true });
              } else if (isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
              return;
            }
          }
          
          setLoading(false);
          return;
        }

        // If no active session, ensure loading state is false immediately
        if (mounted) setLoading(false);

        // Non-blocking background device session re-hydration:
        // Runs in idle time so the user can interact with the phone form instantly without waiting
        const explicitSignout = sessionStorage.getItem('chatr_explicit_signout');
        if (!explicitSignout) {
          const runDeviceRehydrate = async () => {
            try {
              const deviceFingerprint = await getDeviceFingerprint();
              const { data: deviceSession } = await supabase
                .from('device_sessions')
                .select('*')
                .eq('device_fingerprint', deviceFingerprint)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

              if (!mounted) return;

              if (deviceSession) {
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
            } catch (err) {
              // Non-fatal background check
            }
          };

          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => runDeviceRehydrate());
          } else {
            setTimeout(runDeviceRehydrate, 50);
          }
        } else {
          sessionStorage.removeItem('chatr_explicit_signout');
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, username, phone_number')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!mounted) return;

          if (profile?.onboarding_completed) {
            const redirectPath = sessionStorage.getItem('auth_redirect');
            sessionStorage.removeItem('auth_redirect');
            console.log('[AUTH] Welcome back');
            navigate(redirectPath || '/', { replace: true });
          } else {
            console.log('[AUTH] New user - complete profile');
          }
        }, 0);
      }
      
      if (event === 'SIGNED_OUT') {
        setUserId(undefined);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast, navigate]);

  if (loading) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden safe-area-pt safe-area-pb">
      {/* Subtle gradient background - Apple style */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      {/* Floating blur elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <motion.div 
        className="relative w-full max-w-md z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Brand Section */}
        <div className="text-center mb-10 space-y-6">
          {/* Logo with subtle shadow */}
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <img 
              src={chatrBrandLogo} 
              alt="Chatr" 
              className="h-20 w-auto drop-shadow-lg"
            />
          </motion.div>
          
          {/* Title - Apple typography */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Chatr<span className="text-primary">+</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Smart Messaging, Privacy First
            </p>
          </motion.div>
        </div>
        
        {/* Auth Card - Apple glass style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <AppleCard glass padding="lg" rounded="2xl" className="space-y-4">
            <FirebasePhoneAuth />
            <BiometricLogin />
          </AppleCard>
        </motion.div>
        
        {/* Features Grid - Apple style */}
        <motion.div 
          className="mt-10 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {[
            { icon: '🔒', label: 'Secure' },
            { icon: '⚡', label: 'Fast' },
            { icon: '🤖', label: 'AI Powered' },
          ].map((feature) => (
            <div 
              key={feature.label}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted/50 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm">
                {feature.icon}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{feature.label}</span>
            </div>
          ))}
        </motion.div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Footer />
        </motion.div>
      </motion.div>
      
      {/* Onboarding Dialog */}
      {userId && (
        <OnboardingDialog
          isOpen={onboarding.isOpen}
          userId={userId}
          onComplete={async () => {
            await onboarding.completeOnboarding();
            const redirectPath = sessionStorage.getItem('auth_redirect');
            sessionStorage.removeItem('auth_redirect');
            navigate(redirectPath || '/', { replace: true });
          }}
          onSkip={async () => {
            toast({
              title: "Complete Your Profile",
              description: "Please fill in your email and phone number to continue",
              variant: "destructive",
            });
          }}
        />
      )}
    </div>
  );
};

export default Auth;

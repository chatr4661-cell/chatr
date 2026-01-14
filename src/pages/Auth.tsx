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
          
          setUserId(session.user.id);
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

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
            }
          }
          
          setLoading(false);
          return;
        }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand Section */}
        <div className="text-center mb-10 space-y-6">
          {/* Logo with subtle shadow */}
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <img 
              src={chatrBrandLogo} 
              alt="Chatr" 
              className="h-20 w-auto drop-shadow-lg"
            />
          </motion.div>
          
          {/* Title - Apple typography */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
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
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {[
            { icon: '🔒', label: 'Secure' },
            { icon: '⚡', label: 'Fast' },
            { icon: '🤖', label: 'AI Powered' },
          ].map((feature, i) => (
            <motion.div 
              key={feature.label}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-muted/50 backdrop-blur-sm flex items-center justify-center text-xl shadow-sm">
                {feature.icon}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
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

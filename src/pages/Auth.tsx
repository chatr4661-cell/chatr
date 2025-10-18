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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logAuthEvent, logAuthError } from '@/utils/authDebug';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | undefined>();
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const onboarding = useOnboarding(userId);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      logAuthEvent('Google sign-in initiated');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        logAuthError('Google OAuth', error);
        throw error;
      }
      
      logAuthEvent('Google OAuth redirect initiated');
      // Don't set loading to false here - let the redirect happen
    } catch (error: any) {
      logAuthError('Google sign-in', error);
      toast({
        title: 'Sign in failed',
        description: error.message || 'Failed to sign in with Google. Please try again.',
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

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
          setUserId(session.user.id);
          
          // Ensure profile exists (Google users should have profile created by trigger)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
          }

          if (profile) {
            console.log('Profile found:', profile.username, 'Onboarding:', profile.onboarding_completed);
            
            // If onboarding is complete, redirect to home
            if (profile.onboarding_completed) {
              toast({
                title: 'Welcome back!',
                description: `Signed in as ${profile.username || profile.email}`,
              });
              navigate('/');
              return;
            }
            // Otherwise, show onboarding dialog (handled by state)
          } else {
            console.warn('No profile found for user, will be created by trigger');
            // Profile will be created by handle_new_user trigger
            // Show onboarding for new users
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
            navigate('/');
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

    // Listen for auth state changes (Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logAuthEvent('Auth state changed', { event, userId: session?.user?.id });
      
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        setGoogleLoading(false);
        
        logAuthEvent('User signed in, waiting for profile creation');
        
        // Wait for the trigger to create profile (give it 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if profile exists and onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed, username, email, phone_number')
          .eq('id', session.user.id)
          .maybeSingle();
        
        logAuthEvent('Profile check after sign-in', { 
          profile, 
          error: profileError,
          hasProfile: !!profile 
        });
        
        if (profile?.onboarding_completed) {
          toast({
            title: 'Welcome back!',
            description: `Signed in as ${profile.username || profile.email}`,
          });
          navigate('/');
        } else {
          logAuthEvent('Showing onboarding for new user');
          // Let the onboarding dialog show
        }
      }
      
      if (event === 'SIGNED_OUT') {
        setUserId(undefined);
        setGoogleLoading(false);
        logAuthEvent('User signed out');
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
          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 group"
            variant="outline"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-semibold">
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </span>
          </Button>

          {/* Divider */}
          <div className="relative">
            <Separator className="my-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">
                or continue with phone
              </span>
            </div>
          </div>

          {/* Phone Auth */}
          <PhoneAuth />
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

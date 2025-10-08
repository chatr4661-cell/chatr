import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhoneAuth } from '@/components/PhoneAuth';
import logo from '@/assets/chatr-logo.png';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { hashPin } from '@/utils/pinSecurity';

const Auth = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if this is a registration callback
        const urlParams = new URLSearchParams(window.location.search);
        const isRegistration = urlParams.get('registration') === 'true';
        const phoneNumber = urlParams.get('phone_number');
        const pin = urlParams.get('pin');

        if (isRegistration && phoneNumber && pin) {
          // Complete registration by storing device session
          const deviceFingerprint = await getDeviceFingerprint();
          const { getDeviceName, getDeviceType } = await import('@/utils/deviceFingerprint');
          const deviceName = await getDeviceName();
          const deviceType = await getDeviceType();
          const pinHash = await hashPin(pin);

          // Update profile with phone number
          await supabase
            .from('profiles')
            .update({ phone_number: phoneNumber })
            .eq('id', session.user.id);

          // Create device session
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

          await supabase.from('device_sessions').insert({
            user_id: session.user.id,
            device_fingerprint: deviceFingerprint,
            device_name: deviceName,
            device_type: deviceType,
            session_token: session.access_token,
            pin_hash: pinHash,
            expires_at: expiresAt.toISOString(),
            quick_login_enabled: true,
          });

          toast({
            title: 'Registration Complete!',
            description: 'Your account has been created successfully',
          });
        }

        window.location.href = '/';
      } else {
        setLoading(false);
      }
    };

    handleAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
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


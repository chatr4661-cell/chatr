import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNativeBiometric } from '@/hooks/native/useNativeBiometric';
import { useFirebaseAnalytics } from '@/hooks/native/useFirebaseAnalytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fingerprint, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface BiometricLoginProps {
  onSuccess?: () => void;
}

/**
 * Biometric Login Component
 * Face ID / Fingerprint authentication
 */
export const BiometricLogin = ({ onSuccess }: BiometricLoginProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const {
    isAvailable,
    biometricType,
    checkAvailability,
    authenticate,
    getCredentials
  } = useNativeBiometric();

  const { logEvent } = useFirebaseAnalytics();

  React.useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      logEvent('biometric_login_attempt');

      // Authenticate with biometrics
      const authSuccess = await authenticate('Login to Chatr+');
      
      if (!authSuccess) {
        setLoading(false);
        return;
      }

      // Retrieve stored credentials
      const credentials = await getCredentials();
      
      if (!credentials) {
        toast({
          title: 'No credentials found',
          description: 'Please login with phone/Google first to enable biometric login',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Login with stored credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password
      });

      if (error) throw error;

      logEvent('biometric_login_success');
      
      toast({
        title: 'Login successful',
        description: `Welcome back!`
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }

    } catch (error: any) {
      console.error('Biometric login failed:', error);
      logEvent('biometric_login_failed', { error: error.message });
      
      toast({
        title: 'Login failed',
        description: error.message || 'Biometric authentication failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!Capacitor.isNativePlatform() || !isAvailable) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Fingerprint className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h3 className="font-semibold text-lg mb-1">
            Biometric Login
          </h3>
          <p className="text-sm text-muted-foreground">
            Quick and secure authentication
          </p>
        </div>

        <Button
          onClick={handleBiometricLogin}
          disabled={loading}
          className="w-full"
          variant="default"
        >
          {loading ? (
            'Authenticating...'
          ) : (
            <>
              <Fingerprint className="mr-2 h-4 w-4" />
              Login with Biometrics
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

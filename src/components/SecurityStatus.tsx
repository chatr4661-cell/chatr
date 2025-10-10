import React, { useEffect, useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';

export const SecurityStatus = () => {
  const [securityLevel, setSecurityLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [has2FA, setHas2FA] = useState(false);
  const [activeSessions, setActiveSessions] = useState(0);

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const checkSecurityStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check 2FA status
      const { data: twoFactor } = await supabase
        .from('two_factor_auth')
        .select('is_enabled')
        .eq('user_id', user.id)
        .single();

      setHas2FA(twoFactor?.is_enabled || false);

      // Check active sessions
      const { data: sessions } = await supabase
        .from('device_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setActiveSessions(sessions?.length || 0);

      // Calculate security level
      if (twoFactor?.is_enabled && (sessions?.length || 0) <= 2) {
        setSecurityLevel('high');
      } else if (!twoFactor?.is_enabled || (sessions?.length || 0) > 3) {
        setSecurityLevel('low');
      } else {
        setSecurityLevel('medium');
      }
    } catch (error) {
      console.error('Error checking security status:', error);
    }
  };

  const Icon = securityLevel === 'high' ? ShieldCheck : 
                securityLevel === 'medium' ? Shield : ShieldAlert;

  const colorClass = securityLevel === 'high' ? 'text-green-500' :
                     securityLevel === 'medium' ? 'text-yellow-500' : 'text-red-500';

  return (
    <Alert className="bg-background/95 backdrop-blur-xl border-2">
      <Icon className={`h-5 w-5 ${colorClass}`} />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span className="font-medium">Security Level: {securityLevel.toUpperCase()}</span>
          <div className="flex gap-2">
            <Badge variant={has2FA ? 'default' : 'secondary'}>
              2FA: {has2FA ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant="outline">
              {activeSessions} Active Session{activeSessions !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

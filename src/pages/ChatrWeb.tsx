import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, RefreshCw, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import chatrLogo from '@/assets/chatr-icon-logo.png';

type QRStatus = 'generating' | 'pending' | 'scanned' | 'authenticated' | 'expired' | 'error';

const ChatrWeb = () => {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [status, setStatus] = useState<QRStatus>('generating');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);

  const generateQRCode = useCallback(async () => {
    setStatus('generating');
    try {
      const deviceInfo = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
        os: navigator.platform,
        deviceName: `${navigator.platform} - Web Browser`
      };

      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'generate', deviceInfo }
      });

      if (error) throw error;

      if (data.success) {
        setQrToken(data.token);
        setExpiresAt(new Date(data.expiresAt));
        setTimeLeft(120);
        setStatus('pending');
      } else {
        throw new Error(data.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR generation error:', error);
      setStatus('error');
      toast.error('Failed to generate QR code');
    }
  }, []);

  // Generate QR on mount
  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending' || !expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setStatus('expired');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, expiresAt]);

  // Subscribe to realtime updates for this QR session
  useEffect(() => {
    if (!qrToken || status !== 'pending') return;

    const channel = supabase
      .channel(`qr-session-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_login_sessions',
          filter: `token=eq.${qrToken}`
        },
        async (payload) => {
          const newStatus = payload.new.status;
          console.log('QR session update:', newStatus);

          if (newStatus === 'authenticated') {
            setStatus('authenticated');
            toast.success('Login successful! Redirecting...');

            // Check session and get auth
            const { data } = await supabase.functions.invoke('qr-login', {
              body: { action: 'check', token: qrToken }
            });

            if (data?.magicLink) {
              // Use the magic link to sign in
              window.location.href = data.magicLink;
            } else {
              // Fallback - redirect to home after brief delay
              setTimeout(() => {
                navigate('/');
              }, 1500);
            }
          } else if (newStatus === 'scanned') {
            setStatus('scanned');
          } else if (newStatus === 'expired') {
            setStatus('expired');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrToken, status, navigate]);

  // Polling fallback (in case realtime fails)
  useEffect(() => {
    if (!qrToken || status !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('qr-login', {
          body: { action: 'check', token: qrToken }
        });

        if (data?.status === 'authenticated') {
          setStatus('authenticated');
          toast.success('Login successful!');
          
          if (data.magicLink) {
            window.location.href = data.magicLink;
          } else {
            setTimeout(() => navigate('/'), 1500);
          }
        } else if (data?.status === 'expired') {
          setStatus('expired');
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [qrToken, status, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={chatrLogo} alt="Chatr" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">CHATR Web</h1>
          <p className="text-muted-foreground text-sm">
            Use CHATR on your computer
          </p>
        </div>

        {/* QR Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold mb-2">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground">
              Open CHATR on your phone → Tap Menu → Scan QR
            </p>
          </div>

          {/* QR Display */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {status === 'generating' && (
                <div className="w-64 h-64 bg-muted rounded-xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {status === 'pending' && qrToken && (
                <div className="relative">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG
                      value={`chatr://qr-login?token=${qrToken}`}
                      size={224}
                      level="M"
                      includeMargin={false}
                      imageSettings={{
                        src: chatrLogo,
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>
                  {/* Timer overlay */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-3 py-1 text-xs font-medium">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}

              {status === 'scanned' && (
                <div className="w-64 h-64 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                  <Smartphone className="h-12 w-12 text-primary mb-3 animate-pulse" />
                  <p className="text-sm font-medium">Confirm on your phone</p>
                </div>
              )}

              {status === 'authenticated' && (
                <div className="w-64 h-64 bg-green-500/10 rounded-xl flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-3" />
                  <p className="text-sm font-medium text-green-600">Login Successful!</p>
                  <p className="text-xs text-muted-foreground mt-1">Redirecting...</p>
                </div>
              )}

              {status === 'expired' && (
                <div className="w-64 h-64 bg-muted rounded-xl flex flex-col items-center justify-center">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">QR Code Expired</p>
                  <Button onClick={generateQRCode} size="sm">
                    Generate New Code
                  </Button>
                </div>
              )}

              {status === 'error' && (
                <div className="w-64 h-64 bg-destructive/10 rounded-xl flex flex-col items-center justify-center">
                  <p className="text-sm text-destructive mb-3">Something went wrong</p>
                  <Button onClick={generateQRCode} size="sm" variant="destructive">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Refresh button for pending state */}
          {status === 'pending' && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={generateQRCode} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh QR Code
              </Button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-muted-foreground">Open CHATR on your phone</p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-muted-foreground">Tap <strong>Menu</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong></p>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-muted-foreground">Point your phone at this screen to scan the QR code</p>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>End-to-end encrypted</span>
        </div>

        {/* Desktop features preview */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Monitor className="h-4 w-4" />
              <span>Desktop optimized</span>
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              <span>Synced with phone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatrWeb;
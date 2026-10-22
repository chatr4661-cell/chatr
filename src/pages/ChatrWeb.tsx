import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, RefreshCw, Shield, CheckCircle2, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import chatrLogo from '@/assets/chatr-icon-logo.png';

type QRStatus = 'generating' | 'pending' | 'scanned' | 'authenticated' | 'expired' | 'error';

const ChatrWeb: React.FC = () => {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [status, setStatus] = useState<QRStatus>('generating');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const isAuthenticatingRef = useRef(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is already authenticated, redirect directly to desktop interface
        navigate('/desktop/chat', { replace: true });
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const generateQRCode = useCallback(async () => {
    setStatus('generating');
    try {
      const deviceInfo = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Web Browser',
        os: navigator.platform,
        deviceName: `${navigator.platform} - CHATR Web`
      };

      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { action: 'generate', deviceInfo }
      });

      if (error) throw error;

      if (data?.success && data?.token) {
        setQrToken(data.token);
        setExpiresAt(new Date(data.expiresAt));
        setTimeLeft(120);
        setStatus('pending');
      } else {
        throw new Error(data?.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR generation error:', error);
      setStatus('error');
      toast.error('Failed to generate QR code');
    }
  }, []);

  // Generate QR on mount (only if not authenticated)
  useEffect(() => {
    if (!checkingAuth) {
      generateQRCode();
    }
  }, [generateQRCode, checkingAuth]);

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

  // Unified login handler for Realtime and Polling
  const handleSuccessfulAuth = useCallback(async (token: string, sessionData?: any) => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;
    setStatus('authenticated');

    try {
      let data = sessionData;
      if (!data?.sessionTokens) {
        const res = await supabase.functions.invoke('qr-login', {
          body: { action: 'check', token }
        });
        data = res.data;
      }

      // If mobile passed session tokens, log in immediately without redirects
      if (data?.sessionTokens?.access_token && data?.sessionTokens?.refresh_token) {
        toast.success('Connected! Loading your chats...');

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.sessionTokens.access_token,
          refresh_token: data.sessionTokens.refresh_token,
        });

        if (sessionError) {
          console.error('Session establishment error:', sessionError);
        }

        setTimeout(() => {
          navigate('/desktop/chat', { replace: true });
        }, 500);
      } else if (data?.magicLink) {
        window.location.href = data.magicLink;
      } else {
        setTimeout(() => {
          navigate('/desktop/chat', { replace: true });
        }, 800);
      }
    } catch (err) {
      console.error('Session handling error:', err);
      navigate('/desktop/chat', { replace: true });
    }
  }, [navigate]);

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
          const newStatus = payload.new?.status;
          console.log('Realtime QR session status:', newStatus);

          if (newStatus === 'authenticated') {
            await handleSuccessfulAuth(qrToken);
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
  }, [qrToken, status, handleSuccessfulAuth]);

  // Polling fallback (every 1.5s for instant recognition)
  useEffect(() => {
    if (!qrToken || status !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('qr-login', {
          body: { action: 'check', token: qrToken }
        });

        if (data?.status === 'authenticated') {
          clearInterval(pollInterval);
          await handleSuccessfulAuth(qrToken, data);
        } else if (data?.status === 'scanned') {
          setStatus('scanned');
        } else if (data?.status === 'expired') {
          setStatus('expired');
          clearInterval(pollInterval);
        }
      } catch (e) {
        console.error('Polling check error:', e);
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [qrToken, status, handleSuccessfulAuth]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={chatrLogo} alt="CHATR" className="h-16 w-16" />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-neutral-950 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Brand Banner */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 sm:pb-10 pt-2 sm:pt-4">
        <div className="flex items-center gap-3">
          <img src={chatrLogo} alt="CHATR" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              CHATR Web
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Secure
              </span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              End-to-end encrypted messaging on desktop
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Protected by End-to-End Encryption</span>
        </div>
      </header>

      {/* Main WhatsApp-Style Card */}
      <main className="max-w-5xl w-full mx-auto bg-card border border-border/80 rounded-3xl shadow-xl p-6 sm:p-10 transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Instructions Column */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                Use CHATR on your computer
              </h2>
              <p className="text-sm text-muted-foreground">
                Follow these simple steps to link your device seamlessly:
              </p>
            </div>

            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  1
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Open CHATR on your phone</p>
                  <p className="text-muted-foreground text-xs">Ensure your account is active on mobile.</p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  2
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    Tap <span className="font-bold text-foreground">Menu</span> or <span className="font-bold text-foreground">Settings</span> → <span className="font-bold text-foreground">Linked Devices</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Tap "Link a Device" to open the scanner.</p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  3
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Point your camera at this QR code</p>
                  <p className="text-muted-foreground text-xs">
                    Works instantly with both the <strong>in-app scanner</strong> and your phone's <strong>native Camera app</strong>.
                  </p>
                </div>
              </li>
            </ol>

            <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Native Camera Tip:</strong> Open your iPhone or Android Camera app and point it directly at the QR code. Tap the link popup to confirm and log in within seconds!
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <button 
                onClick={() => navigate('/help')} 
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Need help to get started?
              </button>
            </div>
          </div>

          {/* QR Code Column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative p-5 bg-white rounded-3xl shadow-md border border-neutral-200/80">
              
              {/* Generating / Loading State */}
              {status === 'generating' && (
                <div className="w-[260px] h-[260px] bg-neutral-50 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-xs text-neutral-500 font-medium">Generating secure code...</p>
                </div>
              )}

              {/* Pending QR State */}
              {status === 'pending' && qrToken && (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden bg-white">
                    <QRCodeSVG
                      value={`https://chatr.chat/qr-login?token=${qrToken}`}
                      size={260}
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: chatrLogo,
                        height: 32,
                        width: 32,
                        excavate: true,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Scanned / Confirming State */}
              {status === 'scanned' && (
                <div className="w-[260px] h-[260px] bg-primary/5 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                  <Smartphone className="h-12 w-12 text-primary mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-foreground">Scanned!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please tap <strong>Confirm</strong> on your phone to complete login.
                  </p>
                </div>
              )}

              {/* Authenticated / Success State (WhatsApp-style transition) */}
              {status === 'authenticated' && (
                <div className="w-[260px] h-[260px] bg-emerald-50 rounded-2xl flex flex-col items-center justify-center p-4 text-center border border-emerald-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-pulse" />
                  </div>
                  <p className="text-base font-bold text-emerald-800">Connected to CHATR</p>
                  <p className="text-xs text-emerald-600 mt-1 mb-4">Loading your chats and messages...</p>
                  <div className="w-40 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              {/* Expired State with WhatsApp-style reload overlay */}
              {status === 'expired' && (
                <div className="relative w-[260px] h-[260px] rounded-2xl overflow-hidden bg-neutral-100 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center mb-3">
                    <RefreshCw className="h-6 w-6 text-neutral-700" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-800 mb-1">QR Code Expired</p>
                  <p className="text-xs text-neutral-500 mb-3">Click below to generate a new code</p>
                  <Button onClick={generateQRCode} size="sm" className="rounded-full shadow-sm">
                    Reload QR Code
                  </Button>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="w-[260px] h-[260px] bg-red-50 rounded-2xl flex flex-col items-center justify-center p-4 text-center border border-red-200">
                  <p className="text-sm font-semibold text-red-600 mb-2">Connection Error</p>
                  <p className="text-xs text-neutral-600 mb-4">Failed to load login code.</p>
                  <Button onClick={generateQRCode} size="sm" variant="destructive" className="rounded-full">
                    Try Again
                  </Button>
                </div>
              )}
            </div>

            {/* Timer and reload status pill */}
            {status === 'pending' && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground bg-card border border-border px-3 py-1 rounded-full shadow-sm">
                  Expires in <strong className="text-foreground">{formatTime(timeLeft)}</strong>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateQRCode} 
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-6">
          <span className="flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            Optimized for Desktop
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            Realtime Phone Sync
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Zero-Trust Privacy
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ChatrWeb;
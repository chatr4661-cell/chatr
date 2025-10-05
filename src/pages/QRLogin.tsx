import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QRLogin = () => {
  const [qrToken, setQrToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateQRToken = async () => {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60000); // 60 seconds

    setQrToken(token);
    setCountdown(60);

    // Store token temporarily in database
    const { error } = await supabase
      .from('device_sessions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Temporary, will be updated on scan
        device_type: 'desktop',
        device_name: 'Desktop Browser',
        session_token: crypto.randomUUID(),
        qr_token: token,
        is_active: false,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Error generating QR token:', error);
    }
  };

  useEffect(() => {
    generateQRToken();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === 0) {
      generateQRToken();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Listen for authentication via realtime
  useEffect(() => {
    if (!qrToken) return;

    const channel = supabase
      .channel(`qr-auth-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_sessions',
          filter: `qr_token=eq.${qrToken}`
        },
        async (payload) => {
          if (payload.new.is_active && payload.new.user_id) {
            setLoading(true);
            
            // Exchange QR token for actual session
            const { data, error } = await supabase.auth.signInWithPassword({
              email: 'qr-session@temp.com', // This is handled by mobile scan
              password: payload.new.session_token
            });

            if (!error && data.session) {
              toast({
                title: 'Login Successful',
                description: 'You are now logged in via QR code'
              });
              navigate('/');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrToken, navigate, toast]);

  const qrData = JSON.stringify({
    token: qrToken,
    type: 'desktop-login',
    timestamp: Date.now()
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Login with QR Code</CardTitle>
          <CardDescription>
            Scan this code with your Chatr mobile app to login
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="bg-white p-6 rounded-lg shadow-inner flex justify-center">
            {qrToken ? (
              <QRCodeSVG
                value={qrData}
                size={200}
                level="H"
                includeMargin={true}
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              QR code expires in
            </p>
            <div className="text-3xl font-bold text-primary">
              {countdown}s
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={generateQRToken}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate New QR Code
          </Button>

          {/* Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="font-semibold text-sm">How to login:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open Chatr app on your mobile device</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Tap "Link New Device"</li>
              <li>Point your camera at this screen</li>
            </ol>
          </div>

          {/* Alternative Login */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-sm"
            >
              Login with email instead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRLogin;

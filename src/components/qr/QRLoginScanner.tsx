import React, { useState, useEffect, useRef } from 'react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, CheckCircle2, Loader2, AlertCircle, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface QRLoginScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

const QRLoginScanner: React.FC<QRLoginScannerProps> = ({ open, onOpenChange }) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isNative = Capacitor.isNativePlatform();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const stopScanning = async () => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (isNative) {
        document.body.classList.remove('scanner-active');
        await BarcodeScanner.showBackground();
        await BarcodeScanner.stopScan();
      }
    } catch (e) {
      console.error('Stop scan error:', e);
    }
  };

  const startScanning = async () => {
    try {
      setStatus('scanning');
      setErrorMessage('');

      if (isNative) {
        // Native Capacitor scanner
        const permStatus = await BarcodeScanner.checkPermission({ force: true });
        
        if (!permStatus.granted) {
          setStatus('error');
          setErrorMessage('Camera permission is required to scan QR codes');
          return;
        }

        document.body.classList.add('scanner-active');
        await BarcodeScanner.hideBackground();

        const result = await BarcodeScanner.startScan();

        if (result.hasContent && result.content) {
          await handleQRContent(result.content);
        } else {
          setStatus('idle');
        }
      } else {
        // In-browser / PWA web camera scanning using @zxing/browser
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser');
        }

        const codeReader = new BrowserQRCodeReader();
        
        // Wait for video element in DOM
        setTimeout(async () => {
          if (!videoRef.current) return;
          try {
            const controls = await codeReader.decodeFromVideoDevice(
              undefined,
              videoRef.current,
              (result, _error, controls) => {
                if (result) {
                  controls.stop();
                  controlsRef.current = null;
                  handleQRContent(result.getText());
                }
              }
            );
            controlsRef.current = controls;
          } catch (err: any) {
            console.error('Web camera start error:', err);
            setStatus('error');
            setErrorMessage(err?.message || 'Could not access camera. Please allow camera permissions.');
          }
        }, 120);
      }
    } catch (error: any) {
      console.error('Scanning error:', error);
      setStatus('error');
      setErrorMessage(error?.message || 'Failed to start camera. Please try again.');
    }
  };

  const handleQRContent = async (content: string) => {
    setStatus('processing');
    await stopScanning();

    try {
      let token: string | null = null;
      try {
        if (content.includes('token=')) {
          const match = content.match(/token=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            token = match[1];
          } else {
            const url = new URL(content.startsWith('http') ? content : `https://chatr.chat/${content}`);
            token = url.searchParams.get('token');
          }
        } else {
          token = content.trim();
        }
      } catch {
        token = content.trim();
      }

      if (!token) {
        throw new Error('Invalid QR code format');
      }

      // Fetch active session credentials to transfer to desktop
      const { data: { session } } = await supabase.auth.getSession();

      // Device metadata
      const deviceInfo = {
        deviceName: isNative ? 'CHATR Mobile App' : 'CHATR Web Mobile',
        browser: isNative ? 'Capacitor App' : 'Mobile Browser',
        os: isNative ? Capacitor.getPlatform() : navigator.platform
      };

      // Authenticate the QR session with session tokens
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { 
          action: 'authenticate', 
          token,
          deviceInfo,
          sessionTokens: session ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token
          } : undefined
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        toast.success('Web device linked successfully!');
        
        setTimeout(() => {
          onOpenChange(false);
          setStatus('idle');
        }, 1500);
      } else {
        throw new Error(data?.error || 'Failed to authenticate');
      }
    } catch (error) {
      console.error('QR auth error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Invalid or expired QR code');
    }
  };

  const handleManualEntry = () => {
    const token = prompt('Enter QR token:');
    if (token) {
      handleQRContent(token);
    }
  };

  const handleClose = () => {
    stopScanning();
    setStatus('idle');
    setErrorMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Link a Device
          </DialogTitle>
          <DialogDescription>
            Scan the QR code shown on CHATR Web to link your account
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {status === 'idle' && (
            <div className="text-center">
              <div className="w-56 h-56 mx-auto bg-muted/60 rounded-2xl flex items-center justify-center mb-4 border border-border">
                <Camera className="h-16 w-16 text-muted-foreground" />
              </div>
              <Button onClick={startScanning} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera Scan
              </Button>
            </div>
          )}

          {status === 'scanning' && (
            <div className="text-center">
              {isNative ? (
                <div className="w-64 h-64 mx-auto bg-black rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-4 border-2 border-primary rounded-xl animate-pulse" />
                  <Camera className="h-16 w-16 text-white opacity-40" />
                </div>
              ) : (
                <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-primary/40 shadow-inner flex items-center justify-center mb-4">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-4 border-2 border-primary/80 rounded-xl pointer-events-none animate-pulse" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-4">
                Point your camera at the QR code on your computer screen
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button variant="ghost" size="sm" onClick={handleManualEntry} className="text-xs">
                  Enter Code Manually
                </Button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm font-semibold">Linking CHATR Web...</p>
              <p className="text-xs text-muted-foreground mt-1">Transferring session securely</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-600">Device Linked!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can now use CHATR on your computer
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-6">
              <AlertCircle className="h-14 w-14 text-destructive mx-auto mb-3" />
              <p className="text-sm font-semibold text-destructive mb-1">Scan Failed</p>
              <p className="text-xs text-muted-foreground mb-4 px-4">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={startScanning}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRLoginScanner;
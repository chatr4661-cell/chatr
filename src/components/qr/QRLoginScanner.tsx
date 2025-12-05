import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, CheckCircle2, Loader2, AlertCircle, QrCode } from 'lucide-react';
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

  useEffect(() => {
    if (open && isNative) {
      startScanning();
    }

    return () => {
      if (isNative) {
        stopScanning();
      }
    };
  }, [open, isNative]);

  const startScanning = async () => {
    try {
      setStatus('scanning');

      // Check permission
      const permStatus = await BarcodeScanner.checkPermission({ force: true });
      
      if (!permStatus.granted) {
        setStatus('error');
        setErrorMessage('Camera permission is required to scan QR codes');
        return;
      }

      // Hide webview background for camera preview
      document.body.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();

      // Start scanning
      const result = await BarcodeScanner.startScan();

      if (result.hasContent && result.content) {
        await handleQRContent(result.content);
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Scanning error:', error);
      setStatus('error');
      setErrorMessage('Failed to start camera. Please try again.');
    }
  };

  const stopScanning = async () => {
    try {
      document.body.classList.remove('scanner-active');
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (e) {
      console.error('Stop scan error:', e);
    }
  };

  const handleQRContent = async (content: string) => {
    setStatus('processing');
    await stopScanning();

    try {
      // Parse QR content - expecting: chatr://qr-login?token=xxx
      let token: string | null = null;

      if (content.startsWith('chatr://qr-login?token=')) {
        token = content.replace('chatr://qr-login?token=', '');
      } else if (content.includes('token=')) {
        const url = new URL(content.replace('chatr://', 'https://chatr.chat/'));
        token = url.searchParams.get('token');
      } else {
        // Maybe it's just the raw token
        token = content;
      }

      if (!token) {
        throw new Error('Invalid QR code format');
      }

      // Get device info
      const deviceInfo = {
        deviceName: 'CHATR Mobile',
        browser: 'Mobile App',
        os: Capacitor.getPlatform()
      };

      // Authenticate the QR session
      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: { 
          action: 'authenticate', 
          token,
          deviceInfo
        }
      });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        toast.success('Web device linked successfully!');
        
        setTimeout(() => {
          onOpenChange(false);
          setStatus('idle');
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to authenticate');
      }
    } catch (error) {
      console.error('QR auth error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Invalid or expired QR code');
    }
  };

  const handleManualEntry = () => {
    // For web/testing - allow manual token entry
    const token = prompt('Enter QR token (for testing):');
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
            <QrCode className="h-5 w-5" />
            Link a Device
          </DialogTitle>
          <DialogDescription>
            Scan the QR code shown on CHATR Web to link your account
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {status === 'idle' && (
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-muted rounded-xl flex items-center justify-center mb-4">
                <Camera className="h-16 w-16 text-muted-foreground" />
              </div>
              <Button onClick={isNative ? startScanning : handleManualEntry}>
                {isNative ? 'Start Scanning' : 'Enter Code Manually'}
              </Button>
            </div>
          )}

          {status === 'scanning' && (
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-black rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 border-2 border-primary animate-pulse" />
                <Camera className="h-16 w-16 text-white opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Point camera at QR code on computer screen
              </p>
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm font-medium">Linking device...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait</p>
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
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <p className="text-sm font-medium text-destructive mb-2">Scan Failed</p>
              <p className="text-xs text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={isNative ? startScanning : handleManualEntry}>
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
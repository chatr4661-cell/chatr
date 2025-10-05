import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRScanner = ({ open, onOpenChange }: QRScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const scanQRCode = async () => {
    setScanning(true);
    try {
      // Request camera permission and take photo
      const image = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: false
      });

      if (!image.dataUrl) {
        throw new Error('No QR code data found');
      }

      // In a real implementation, you would use a QR code parser library
      // For now, we'll simulate the QR code scanning
      toast({
        title: 'QR Scan Feature',
        description: 'QR code scanning will be implemented with a native scanner library'
      });

      // Parse QR data (this would be actual parsing in production)
      // const qrData = parseQRCode(image.dataUrl);
      // await authenticateWithQR(qrData);

    } catch (error: any) {
      console.error('QR scan error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast({
          title: 'Scan Failed',
          description: 'Could not scan QR code. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setScanning(false);
      onOpenChange(false);
    }
  };

  const authenticateWithQR = async (qrToken: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update the device session with user ID
      const { error } = await supabase
        .from('device_sessions')
        .update({
          user_id: user.id,
          is_active: true
        })
        .eq('qr_token', qrToken);

      if (error) throw error;

      toast({
        title: 'Device Linked',
        description: 'Desktop device has been successfully linked'
      });
    } catch (error) {
      console.error('Error authenticating QR:', error);
      toast({
        title: 'Error',
        description: 'Failed to link device',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the QR code on your desktop screen
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-48 h-48 border-4 border-dashed border-primary rounded-lg flex items-center justify-center">
            {scanning ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : (
              <QrCode className="h-12 w-12 text-primary/40" />
            )}
          </div>

          <Button
            onClick={scanQRCode}
            disabled={scanning}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <QrCode className="mr-2 h-4 w-4" />
                Start Scanning
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Make sure the QR code is clearly visible and well-lit
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface QRDeepLinkProps {
  path?: string;
  title?: string;
  size?: number;
  trigger?: React.ReactNode;
  showDownload?: boolean;
}

const BASE_URL = 'https://chatr.chat';

export const QRDeepLink = ({ 
  path, 
  title = 'Scan QR Code',
  size = 200,
  trigger,
  showDownload = true
}: QRDeepLinkProps) => {
  const [copied, setCopied] = useState(false);

  const currentPath = path || window.location.pathname;
  const deepLink = `${BASE_URL}${currentPath}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx?.drawImage(img, 0, 0, size * 2, size * 2);
      
      const link = document.createElement('a');
      link.download = `chatr-qr-${currentPath.replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR Code downloaded!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="w-4 h-4" />
            QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              id="qr-code-svg"
              value={deepLink}
              size={size}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: '/favicon.ico',
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>

          {/* Link Display */}
          <div className="w-full flex gap-2">
            <Input 
              value={deepLink} 
              readOnly 
              className="bg-muted text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Download Button */}
          {showDownload && (
            <Button onClick={downloadQR} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Download QR Code
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Scan this code to open this page in Chatr app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Inline QR Code component (no dialog)
export const InlineQRCode = ({ 
  path, 
  size = 150,
  showLink = true 
}: { 
  path?: string; 
  size?: number;
  showLink?: boolean;
}) => {
  const currentPath = path || window.location.pathname;
  const deepLink = `${BASE_URL}${currentPath}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-lg">
        <QRCodeSVG
          value={deepLink}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      {showLink && (
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
          {deepLink}
        </p>
      )}
    </div>
  );
};

// Generate QR code data URL programmatically
export const generateQRDataURL = (path: string, size: number = 200): Promise<string> => {
  return new Promise((resolve) => {
    const deepLink = `${BASE_URL}${path}`;
    
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Render QR code
    const { createRoot } = require('react-dom/client');
    const root = createRoot(container);
    
    root.render(
      <QRCodeSVG
        id="temp-qr"
        value={deepLink}
        size={size}
        level="H"
      />
    );

    setTimeout(() => {
      const svg = container.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const dataURL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        resolve(dataURL);
      }
      root.unmount();
      document.body.removeChild(container);
    }, 100);
  });
};

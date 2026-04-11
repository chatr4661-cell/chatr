import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface QRIdentityShareProps {
  handle: string;
  username?: string;
  avatarUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRIdentityShare: React.FC<QRIdentityShareProps> = ({
  handle,
  username,
  avatarUrl,
  open,
  onOpenChange,
}) => {
  const profileUrl = `https://chatr.chat/u/${handle}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username || handle} on CHATR`,
          text: `Connect with me on CHATR!`,
          url: profileUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('chatr-qr-svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 512;
    canvas.width = size;
    canvas.height = size + 80;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 56, 20, 400, 400);

      // Footer
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`chatr.me/${handle}`, size / 2, size + 50);

      const link = document.createElement('a');
      link.download = `chatr-${handle}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code downloaded!');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Share Your CHATR ID</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG
              id="chatr-qr-svg"
              value={profileUrl}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={avatarUrl ? {
                src: avatarUrl,
                height: 40,
                width: 40,
                excavate: true,
              } : undefined}
            />
          </div>

          {/* Handle */}
          <div className="text-center">
            <p className="font-mono text-lg font-bold">@{handle}</p>
            <p className="text-xs text-muted-foreground">{profileUrl}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1.5" /> Copy
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" /> Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

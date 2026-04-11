import React, { useRef, useState } from 'react';
import { Download, Share2, User, Briefcase, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ShareableProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  username: string;
  avatarUrl?: string;
  headline?: string;
  company?: string;
  city?: string;
  trustScore?: number;
}

export const ShareableProfileCard: React.FC<ShareableProfileCardProps> = ({
  open,
  onOpenChange,
  handle,
  username,
  avatarUrl,
  headline,
  company,
  city,
  trustScore,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const getTrustColor = (score?: number) => {
    if (!score) return '#6b7280';
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = 600;
      const h = 340;
      canvas.width = w;
      canvas.height = h;

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(1, '#16213e');
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, w, h, 20);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      ctx.roundRect(0, 0, w, h, 20);
      ctx.stroke();

      // Avatar circle
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.beginPath();
      ctx.arc(80, h / 2, 45, 0, Math.PI * 2);
      ctx.fill();

      // User initial
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((username || '?')[0].toUpperCase(), 80, h / 2 + 11);

      // Username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(username || handle, 150, h / 2 - 40);

      // Handle
      ctx.fillStyle = '#818cf8';
      ctx.font = '16px monospace';
      ctx.fillText(`@${handle}`, 150, h / 2 - 15);

      // Headline
      if (headline) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px sans-serif';
        ctx.fillText(headline.substring(0, 50), 150, h / 2 + 10);
      }

      // Company & City
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px sans-serif';
      let metaY = h / 2 + 35;
      if (company) {
        ctx.fillText(`🏢 ${company}`, 150, metaY);
        metaY += 20;
      }
      if (city) {
        ctx.fillText(`📍 ${city}`, 150, metaY);
      }

      // Trust score
      if (trustScore !== undefined) {
        const trustColor = getTrustColor(trustScore);
        ctx.fillStyle = trustColor;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`🛡 ${trustScore}% Trusted`, w - 30, 35);
      }

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`chatr.chat/u/${handle}`, w / 2, h - 20);

      // CHATR brand
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('CHATR++', w - 25, h - 18);

      const link = document.createElement('a');
      link.download = `chatr-card-${handle}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Profile card downloaded!');
    } catch {
      toast.error('Failed to export card');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const url = `https://chatr.chat/u/${handle}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username} on CHATR`,
          text: `Connect with ${username} on CHATR! ${headline || ''}`,
          url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Your Profile Card</DialogTitle>
        </DialogHeader>

        {/* Card Preview */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <div className="p-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-400/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center border-2 border-indigo-400/30">
                  <span className="text-3xl font-bold text-indigo-400">{(username || '?')[0].toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white truncate">{username || handle}</h3>
                {trustScore !== undefined && trustScore >= 70 && (
                  <Shield className="h-4 w-4 text-green-400" />
                )}
              </div>
              <p className="text-indigo-400 font-mono text-sm mb-2">@{handle}</p>
              {headline && (
                <p className="text-gray-400 text-sm truncate">{headline}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {company && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {company}
                  </span>
                )}
                {city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-black/20 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-mono">chatr.chat/u/{handle}</span>
            <span className="text-xs font-bold text-indigo-400">CHATR++</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" /> {exporting ? 'Exporting...' : 'Download'}
          </Button>
          <Button className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1.5" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

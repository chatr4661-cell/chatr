import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  shareUrl: string;
}

export function SocialShareDialog({ open, onOpenChange, referralCode, shareUrl }: SocialShareDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const shareText = `Join me on Chatr and earn ₹50 + network bonuses! Use my code: ${referralCode}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const socialPlatforms = [
    {
      name: "WhatsApp",
      icon: "💬",
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: "bg-[#25D366] hover:bg-[#20BD5A]"
    },
    {
      name: "Facebook",
      icon: "📘",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      color: "bg-[#1877F2] hover:bg-[#0D65D9]"
    },
    {
      name: "Twitter",
      icon: "🐦",
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "bg-[#1DA1F2] hover:bg-[#0C8BD9]"
    },
    {
      name: "Telegram",
      icon: "✈️",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "bg-[#0088cc] hover:bg-[#0077b3]"
    },
    {
      name: "LinkedIn",
      icon: "💼",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "bg-[#0A66C2] hover:bg-[#004182]"
    },
    {
      name: "Instagram",
      icon: "📷",
      url: shareUrl,
      color: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90",
      isSpecial: true
    },
    {
      name: "Email",
      icon: "📧",
      url: `mailto:?subject=Join Chatr&body=${encodedText}%20${encodedUrl}`,
      color: "bg-slate-600 hover:bg-slate-700"
    },
    {
      name: "SMS",
      icon: "💬",
      url: `sms:?body=${encodedText}%20${encodedUrl}`,
      color: "bg-green-600 hover:bg-green-700"
    }
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: typeof socialPlatforms[0]) => {
    if (platform.isSpecial) {
      toast.info("Copy your referral link and paste it in your Instagram story or bio!");
      copyToClipboard();
    } else {
      window.open(platform.url, '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Referral Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share message preview */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground mb-2">Your message:</p>
            <p className="font-medium">{shareText}</p>
            <p className="text-primary text-xs mt-1 break-all">{shareUrl}</p>
          </div>

          {/* Copy button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>

          {/* Social media grid */}
          <div>
            <p className="text-sm font-medium mb-3">Share on:</p>
            <div className="grid grid-cols-4 gap-2">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleShare(platform)}
                  className={`${platform.color} text-white p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95`}
                  title={platform.name}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="text-[10px] font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Share to earn ₹50 per referral + network bonuses! 🎉
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

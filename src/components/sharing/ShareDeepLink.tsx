import { useState } from 'react';
import { Share2, Copy, Check, Link2, MessageCircle, Mail } from 'lucide-react';
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

interface ShareDeepLinkProps {
  path?: string;
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
}

const BASE_URL = 'https://chatr.chat';

export const ShareDeepLink = ({ 
  path, 
  title = 'Share this page',
  description,
  trigger 
}: ShareDeepLinkProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const currentPath = path || window.location.pathname;
  const deepLink = `${BASE_URL}${currentPath}`;
  const customSchemeLink = `chatr:/${currentPath}`;

  const shareTitle = title || document.title;
  const shareDescription = description || document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: deepLink,
        });
        setOpen(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      copyToClipboard(deepLink);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${shareTitle}\n${shareDescription}\n${deepLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareDescription}\n\nCheck it out: ${deepLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`${shareTitle}\n${deepLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${text}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Share Link
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Deep Link Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Web Link</label>
            <div className="flex gap-2">
              <Input 
                value={deepLink} 
                readOnly 
                className="bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(deepLink)}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* App Deep Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">App Link</label>
            <div className="flex gap-2">
              <Input 
                value={customSchemeLink} 
                readOnly 
                className="bg-muted text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(customSchemeLink)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Share Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Share via</label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={handleNativeShare}
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs">Share</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="w-5 h-5 text-green-500" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={shareViaTelegram}
              >
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
                <span className="text-xs">Telegram</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={shareViaEmail}
              >
                <Mail className="w-5 h-5 text-red-500" />
                <span className="text-xs">Email</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Utility function for programmatic sharing
export const shareDeepLink = async (path: string, title?: string, description?: string) => {
  const deepLink = `${BASE_URL}${path}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'Chatr',
        text: description || '',
        url: deepLink,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
    }
  }
  
  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(deepLink);
    toast.success('Link copied to clipboard!');
    return true;
  } catch {
    return false;
  }
};

// Generate deep link URL
export const generateDeepLink = (path: string, params?: Record<string, string>) => {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
};

// Generate app scheme link
export const generateAppLink = (path: string, params?: Record<string, string>) => {
  let url = `chatr:/${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
};

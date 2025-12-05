import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Copy, Check, Share2, MessageSquare, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface ShareInviteSheetProps {
  userId: string;
  contactName?: string;
  contactPhone?: string;
  children: React.ReactNode;
}

export const ShareInviteSheet = ({ userId, contactName, contactPhone, children }: ShareInviteSheetProps) => {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const referralLink = `https://chatr.chat/join?ref=${userId}`;
  const inviteMessage = `Hey${contactName ? ` ${contactName}` : ''}! Join me on Chatr - India's super app for messaging, jobs, healthcare & more. Download now: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsApp = () => {
    const phoneNumber = contactPhone?.replace(/\D/g, '') || '';
    const url = phoneNumber 
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(inviteMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
    window.open(url, '_blank');
    setOpen(false);
  };

  const handleSMS = () => {
    const phoneNumber = contactPhone?.replace(/\D/g, '') || '';
    const url = phoneNumber
      ? `sms:${phoneNumber}?body=${encodeURIComponent(inviteMessage)}`
      : `sms:?body=${encodeURIComponent(inviteMessage)}`;
    window.open(url, '_blank');
    setOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Chatr',
          text: inviteMessage,
          url: referralLink,
        });
        setOpen(false);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            Invite {contactName || 'a Friend'} to Chatr
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Referral Link */}
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="bg-muted/50 text-sm"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="flex flex-col h-auto py-4 gap-2 hover:bg-green-500/10 hover:border-green-500/50"
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleSMS}
              className="flex flex-col h-auto py-4 gap-2 hover:bg-blue-500/10 hover:border-blue-500/50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs">SMS</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="flex flex-col h-auto py-4 gap-2 hover:bg-primary/10 hover:border-primary/50"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Share2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xs">More</span>
            </Button>
          </div>

          {/* Reward Info */}
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              🎁 Earn <span className="font-semibold text-primary">50 coins</span> when they join!
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

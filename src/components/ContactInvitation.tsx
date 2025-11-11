import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mail, Copy, Gift, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  createInviteLink,
  shareViaWhatsApp,
  shareViaSMS,
  shareViaEmail,
  copyInviteLink,
} from '@/utils/inviteLinkGenerator';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

interface ContactInvitationProps {
  userId: string;
  username?: string;
}

export const ContactInvitation = ({ userId, username }: ContactInvitationProps) => {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralStats, setReferralStats] = useState({ count: 0, rewards: 0 });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadInviteLink();
    loadReferralStats();
  }, [userId]);

  const loadInviteLink = async () => {
    const link = await createInviteLink(userId);
    setInviteLink(link);
  };

  const loadReferralStats = async () => {
    const { data } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    if (data) {
      setReferralStats({
        count: data.length,
        rewards: data.filter(r => r.reward_claimed).length * 100, // 100 coins per referral
      });
    }
  };

  const handleCopyLink = async () => {
    const success = await copyInviteLink(inviteLink);
    if (success) {
      toast.success('Invite link copied to clipboard!');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsAppShare = () => {
    shareViaWhatsApp(inviteLink, username);
  };

  const handleSMSShare = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    shareViaSMS(phoneNumber, inviteLink, username);
    setPhoneNumber('');
  };

  const handleEmailShare = () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    shareViaEmail(email, inviteLink, username);
    setEmail('');
  };

  const syncAndInviteContacts = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Contact sync only available on mobile devices');
      return;
    }

    setLoading(true);
    try {
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts === 'granted') {
        const result = await Contacts.getContacts({
          projection: { name: true, phones: true }
        });
        
        // Show contact picker UI
        toast.success(`Found ${result.contacts.length} contacts. Select contacts to invite.`);
        
        // You would implement a contact picker UI here
        // For now, we'll just show a success message
      } else {
        toast.error('Contact permission denied');
      }
    } catch (error) {
      console.error('Contact sync error:', error);
      toast.error('Failed to access contacts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Invite Friends</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">{referralStats.rewards} coins earned</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input 
              value={inviteLink} 
              readOnly 
              className="text-sm"
            />
            <Button onClick={handleCopyLink} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleWhatsAppShare} variant="outline" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={syncAndInviteContacts} variant="outline" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : 'Contacts'}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                type="tel"
              />
              <Button onClick={handleSMSShare} variant="outline" size="icon">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <Button onClick={handleEmailShare} variant="outline" size="icon">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <p>Earn 100 Chatr Coins for each friend who joins!</p>
          <p className="text-primary font-medium mt-1">{referralStats.count} friends invited</p>
        </div>
      </Card>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mail, Copy, Gift, UserPlus, Share2, Users } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 mb-3">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-[#2E1065]">Invite Friends</h2>
        <p className="text-sm text-muted-foreground">Share Chatr+ and earn rewards together</p>
      </div>

      {/* Rewards Banner */}
      <Card className="p-5 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-2 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-xl font-bold text-[#2E1065]">{referralStats.rewards} Coins</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Friends Invited</p>
            <p className="text-xl font-bold text-[#9333EA]">{referralStats.count}</p>
          </div>
        </div>
      </Card>

      {/* Share Link Card */}
      <Card className="p-6 space-y-4 border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
            <Share2 className="h-6 w-6 text-[#9333EA]" />
          </div>
          <div>
            <h3 className="font-bold text-[#2E1065]">Your Invite Link</h3>
            <p className="text-xs text-muted-foreground">Share this link to earn 100 coins per friend</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input 
            value={inviteLink} 
            readOnly 
            className="text-sm h-12 border-2 bg-gray-50 font-mono"
          />
          <Button 
            onClick={handleCopyLink} 
            variant="outline" 
            size="icon"
            className="h-12 w-12 border-2 hover:border-purple-300 hover:bg-purple-50 transition-all"
          >
            <Copy className="h-5 w-5 text-[#9333EA]" />
          </Button>
        </div>
      </Card>

      {/* Quick Share Options */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-2 hover:border-green-200 transition-all duration-300 hover:shadow-lg cursor-pointer group" onClick={handleWhatsAppShare}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-[#2E1065]">WhatsApp</h4>
              <p className="text-xs text-muted-foreground">Share instantly</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-2 hover:border-blue-200 transition-all duration-300 hover:shadow-lg cursor-pointer group" onClick={syncAndInviteContacts}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-[#2E1065]">{loading ? 'Loading...' : 'Contacts'}</h4>
              <p className="text-xs text-muted-foreground">From your phone</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Manual Invite Section */}
      <Card className="p-6 space-y-4 border-2 hover:border-purple-200 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
            <Mail className="h-6 w-6 text-[#9333EA]" />
          </div>
          <div>
            <h3 className="font-bold text-[#2E1065]">Send Direct Invite</h3>
            <p className="text-xs text-muted-foreground">Invite via SMS or Email</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="📱 Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
              className="h-12 border-2"
            />
            <Button 
              onClick={handleSMSShare} 
              className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Send
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="✉️ Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="h-12 border-2"
            />
            <Button 
              onClick={handleEmailShare}
              className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Send
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Footer */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-100">
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#2E1065]">🎉 Earn 100 Chatr Coins per referral!</p>
          <p className="text-xs text-muted-foreground">Your friends get 50 welcome coins too</p>
        </div>
      </Card>
    </div>
  );
};

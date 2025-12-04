import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Mail, Phone, MessageCircle, Send, Check, 
  RefreshCw, Gift, UserPlus, Share2, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGmailContacts } from '@/hooks/useGmailContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GmailContactsSyncProps {
  providerToken?: string;
  onContactSelect?: (userId: string) => void;
}

export const GmailContactsSync: React.FC<GmailContactsSyncProps> = ({
  providerToken,
  onContactSelect,
}) => {
  const {
    contacts,
    loading,
    syncing,
    stats,
    loadContacts,
    syncGoogleContacts,
    sendInvite,
    bulkShareWhatsApp,
  } = useGmailContacts();

  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
    
    // Check for stored provider token
    const checkToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        setStoredToken(session.provider_token);
      }
    };
    checkToken();
  }, [loadContacts]);

  // Auto-sync when provider token is available
  useEffect(() => {
    const token = providerToken || storedToken;
    if (token && contacts.length === 0 && !syncing) {
      syncGoogleContacts(token);
    }
  }, [providerToken, storedToken, contacts.length, syncing, syncGoogleContacts]);

  const handleSync = async () => {
    const token = providerToken || storedToken;
    if (!token) {
      toast.error('Please login with Google to sync contacts');
      return;
    }
    await syncGoogleContacts(token);
  };

  const handleInvite = async (contact: any, method: 'email' | 'sms' | 'whatsapp') => {
    setSendingInvite(`${contact.id}-${method}`);
    try {
      await sendInvite(contact, method);
    } finally {
      setSendingInvite(null);
    }
  };

  const chatrContacts = contacts.filter(c => c.is_chatr_user);
  const inviteContacts = contacts.filter(c => !c.is_chatr_user);

  return (
    <div className="space-y-6">
      {/* Stats Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gmail Contacts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-green-500">{stats.onChatr}</p>
                <p className="text-xs text-muted-foreground">On Chatr</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{stats.toInvite}</p>
                <p className="text-xs text-muted-foreground">To Invite</p>
              </div>
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reward Banner */}
      <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="font-semibold">Earn 50 Coins per invite!</p>
              <p className="text-sm text-muted-foreground">Friends get 25 coins too 🎉</p>
            </div>
          </div>
          <Button
            onClick={() => bulkShareWhatsApp(inviteContacts)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Share2 className="h-4 w-4" />
            Share All via WhatsApp
          </Button>
        </CardContent>
      </Card>

      {/* Contacts Tabs */}
      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite ({stats.toInvite})
          </TabsTrigger>
          <TabsTrigger value="onchatr" className="gap-2">
            <Check className="h-4 w-4" />
            On Chatr ({stats.onChatr})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inviteContacts.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No contacts to invite</p>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.total === 0 
                  ? 'Sync your Gmail contacts to invite friends!'
                  : 'All your contacts are already on Chatr! 🎉'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {inviteContacts.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={contact.photo_url || undefined} />
                            <AvatarFallback>
                              {contact.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{contact.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {contact.email || contact.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {contact.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInvite(contact, 'email')}
                              disabled={sendingInvite === `${contact.id}-email`}
                              className="gap-1"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          {contact.phone && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInvite(contact, 'sms')}
                                disabled={sendingInvite === `${contact.id}-sms`}
                                className="gap-1"
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleInvite(contact, 'whatsapp')}
                                disabled={sendingInvite === `${contact.id}-whatsapp`}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="onchatr" className="mt-4">
          {chatrContacts.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No contacts on Chatr yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Invite your friends to connect!
              </p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {chatrContacts.map((contact) => (
                <Card 
                  key={contact.id} 
                  className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => contact.chatr_user_id && onContactSelect?.(contact.chatr_user_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.photo_url || undefined} />
                        <AvatarFallback>
                          {contact.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{contact.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email || contact.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        On Chatr
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

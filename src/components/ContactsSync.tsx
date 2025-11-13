import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';

export function ContactsSync() {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  const handleSyncContacts = async () => {
    setSyncing(true);
    
    try {
      if (!isNative) {
        toast({
          title: '📱 Mobile Only Feature',
          description: 'Contact sync is only available on mobile devices',
        });
        setSyncing(false);
        return;
      }

      // Request permission to access contacts
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts !== 'granted') {
        toast({
          title: '❌ Permission Denied',
          description: 'Please allow access to contacts in settings',
          variant: 'destructive'
        });
        setSyncing(false);
        return;
      }

      toast({
        title: '🔄 Syncing Contacts...',
        description: 'Reading contacts from your phone',
      });

      // Get all contacts
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        }
      });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare contacts data for sync
      const contactsData = result.contacts.map(contact => {
        const phone = contact.phones?.[0]?.number || '';
        const email = contact.emails?.[0]?.address || '';
        
        return {
          name: contact.name?.display || 'Unknown',
          phone: phone,
          email: email
        };
      }).filter(c => c.phone || c.email); // Only include contacts with phone or email

      // Call the sync function
      const { error } = await supabase.rpc('sync_user_contacts', {
        user_uuid: user.id,
        contact_list: contactsData
      });

      if (error) throw error;

      toast({
        title: '✅ Contacts Synced!',
        description: `Successfully synced ${contactsData.length} contacts`,
      });

      // Update the last sync timestamp
      await supabase
        .from('profiles')
        .update({ 
          contacts_synced: true,
          last_contact_sync: new Date().toISOString()
        })
        .eq('id', user.id);

    } catch (error) {
      console.error('Contact sync error:', error);
      toast({
        title: '❌ Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync contacts',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Phone Contacts
        </h3>
        {!isNative && (
          <span className="text-xs text-muted-foreground">(Mobile only)</span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Sync your phone contacts to find friends on chatr
      </p>

      <Button
        onClick={handleSyncContacts}
        disabled={syncing || !isNative}
        className="w-full gap-2"
        variant="outline"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Contacts'}
      </Button>
    </Card>
  );
}

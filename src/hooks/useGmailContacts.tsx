import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GmailContact {
  id: string;
  user_id: string;
  google_contact_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  is_chatr_user: boolean;
  chatr_user_id: string | null;
  imported_at: string;
}

interface SyncResult {
  success: boolean;
  total_imported: number;
  on_chatr: number;
  to_invite: number;
  contacts: GmailContact[];
}

export const useGmailContacts = () => {
  const [contacts, setContacts] = useState<GmailContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ total: 0, onChatr: 0, toInvite: 0 });

  // Load existing imported contacts
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gmail_imported_contacts')
        .select('*')
        .order('name');

      if (error) throw error;

      const typedData = data as GmailContact[];
      setContacts(typedData || []);
      
      const onChatr = typedData?.filter(c => c.is_chatr_user).length || 0;
      setStats({
        total: typedData?.length || 0,
        onChatr,
        toInvite: (typedData?.length || 0) - onChatr,
      });
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync contacts from Google
  const syncGoogleContacts = useCallback(async (providerToken: string) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('sync-google-contacts', {
        body: { provider_token: providerToken },
      });

      if (response.error) throw response.error;

      const result = response.data as SyncResult;
      
      setContacts(result.contacts || []);
      setStats({
        total: result.total_imported,
        onChatr: result.on_chatr,
        toInvite: result.to_invite,
      });

      toast.success(
        `Imported ${result.total_imported} contacts! ${result.on_chatr} already on Chatr.`
      );

      return result;
    } catch (error: any) {
      console.error('Error syncing contacts:', error);
      toast.error('Failed to sync contacts. Please try again.');
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  // Send invite to a contact
  const sendInvite = useCallback(async (
    contact: GmailContact,
    method: 'email' | 'sms' | 'whatsapp'
  ) => {
    try {
      const response = await supabase.functions.invoke('send-invite', {
        body: {
          contact_name: contact.name,
          contact_email: contact.email,
          contact_phone: contact.phone,
          invite_method: method,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;

      if (method === 'whatsapp' && result.invite_link) {
        // Open WhatsApp share
        const text = `Hey ${contact.name || 'friend'}! 🎉 I'm using Chatr - India's super app for messaging, jobs, healthcare & more. Join me and we both get 50 coins! ${result.invite_link}`;
        const whatsappUrl = `https://wa.me/${contact.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
      }

      toast.success(result.message || 'Invite sent!');
      return result;
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invite');
      throw error;
    }
  }, []);

  // Bulk invite via WhatsApp
  const bulkShareWhatsApp = useCallback((contactsToInvite: GmailContact[]) => {
    const names = contactsToInvite.slice(0, 5).map(c => c.name).join(', ');
    const text = `Hey friends! 🎉 I'm using Chatr - India's super app for messaging, jobs, healthcare & more. Join now: https://chatr.chat/join - Let's connect! 🚀`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  }, []);

  return {
    contacts,
    loading,
    syncing,
    stats,
    loadContacts,
    syncGoogleContacts,
    sendInvite,
    bulkShareWhatsApp,
  };
};

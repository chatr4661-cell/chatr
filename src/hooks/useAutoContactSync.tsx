import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';

/**
 * Auto-sync contacts hook - runs on app launch
 * Syncs phone contacts with Chatr users automatically
 */
export const useAutoContactSync = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;
    
    const autoSync = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;
        
        const lastSync = localStorage.getItem(`auto_sync_${userId}`);
        const now = Date.now();
        
        // Auto-sync every 12 hours
        if (!lastSync || (now - parseInt(lastSync)) > 12 * 60 * 60 * 1000) {
          const permission = await Contacts.requestPermissions();
          
          if (permission.contacts === 'granted') {
            const result = await Contacts.getContacts({
              projection: {
                name: true,
                phones: true,
                emails: true,
              }
            });
            
            if (result.contacts && result.contacts.length > 0) {
              const contactsData = result.contacts
                .map(contact => ({
                  name: contact.name?.display || 'Unknown',
                  phone: contact.phones?.[0]?.number || '',
                  email: contact.emails?.[0]?.address || ''
                }))
                .filter(c => c.phone || c.email);
              
              // Sync to database
              await supabase.rpc('sync_user_contacts', {
                user_uuid: userId,
                contact_list: contactsData
              });
              
              localStorage.setItem(`auto_sync_${userId}`, now.toString());
              console.log(`✅ Auto-synced ${contactsData.length} contacts`);
            }
          }
        }
      } catch (error) {
        console.log('Auto-sync skipped:', error);
      }
    };
    
    // Run after 5 seconds to avoid blocking initial render
    const timer = setTimeout(autoSync, 5000);
    return () => clearTimeout(timer);
  }, [userId]);
};

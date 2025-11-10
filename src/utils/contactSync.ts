import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sync device contacts with Chatr users
 */
export const syncContacts = async (userId: string) => {
  try {
    // Request permission
    const permission = await Contacts.requestPermissions();
    if (permission.contacts !== 'granted') {
      throw new Error('Contacts permission denied');
    }

    // Fetch all device contacts
    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
      }
    });

    if (!result.contacts || result.contacts.length === 0) {
      console.log('No contacts found');
      return;
    }

    // Extract phone numbers and emails
    const phoneNumbers = result.contacts
      .flatMap(contact => contact.phones?.map(p => p.number) || [])
      .filter(Boolean);

    const emails = result.contacts
      .flatMap(contact => contact.emails?.map(e => e.address) || [])
      .filter(Boolean);

    // Query Supabase for matching users
    const { data: matchingUsers, error } = await supabase
      .from('profiles')
      .select('id, phone_number, email, username, avatar_url')
      .or(`phone_number.in.(${phoneNumbers.join(',')}),email.in.(${emails.join(',')})`);

    if (error) throw error;

    console.log(`✅ Found ${matchingUsers?.length || 0} Chatr users in contacts`);

    // Store synced contacts in database (skip if table doesn't exist)
    if (matchingUsers && matchingUsers.length > 0) {
      try {
        const contactRecords = matchingUsers.map(user => ({
          user_id: userId,
          contact_user_id: user.id,
          synced_at: new Date().toISOString(),
        }));

        // Attempt to upsert (will fail silently if table doesn't exist)
        await supabase
          .from('user_contacts' as any)
          .upsert(contactRecords, {
            onConflict: 'user_id,contact_user_id'
          });
      } catch (err) {
        // Silently fail if user_contacts table doesn't exist yet
        console.log('user_contacts table not available');
      }
    }

    return matchingUsers;
  } catch (error) {
    console.error('Contact sync failed:', error);
    throw error;
  }
};

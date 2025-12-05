import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export interface DeviceContact {
  name: string;
  phone: string;
}

/**
 * Get device contacts (Telegram-style - native device contacts only)
 * Works on Android via ContactsContract and iOS via CNContactStore
 */
export const getDeviceContacts = async (): Promise<DeviceContact[]> => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Device contacts only available on mobile');
  }

  // Request permission (READ_CONTACTS on Android, CNContactStore on iOS)
  const permission = await Contacts.requestPermissions();
  
  if (permission.contacts !== 'granted') {
    throw new Error('Contacts permission denied');
  }

  // Fetch all device contacts
  const result = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
    }
  });

  if (!result.contacts || result.contacts.length === 0) {
    return [];
  }

  // Extract name and phone number
  return result.contacts
    .map(contact => ({
      name: contact.name?.display || contact.name?.given || 'Unknown',
      phone: contact.phones?.[0]?.number || '',
    }))
    .filter(c => c.phone); // Only contacts with phone numbers
};

/**
 * Normalize phone number for consistent matching
 */
const normalizePhone = (phone: string): string => {
  return phone.replace(/[\s\-\(\)\.]/g, '');
};

/**
 * Sync device contacts with Supabase (Telegram-style)
 * Reads native device contacts and syncs to contacts table
 */
export const syncContacts = async (userId: string): Promise<number> => {
  // Get device contacts
  const deviceContacts = await getDeviceContacts();
  
  if (deviceContacts.length === 0) {
    console.log('No contacts found on device');
    return 0;
  }

  // Prepare contacts for sync
  const contactList = deviceContacts.map(c => ({
    name: c.name,
    phone: normalizePhone(c.phone),
  }));

  // Call RPC function to sync contacts
  const { error } = await supabase.rpc('sync_user_contacts', {
    user_uuid: userId,
    contact_list: contactList,
  });

  if (error) {
    console.error('Contact sync RPC error:', error);
    throw error;
  }

  console.log(`✅ Synced ${contactList.length} device contacts`);
  return contactList.length;
};

/**
 * Check if contacts permission is granted
 */
export const checkContactsPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  try {
    const permission = await Contacts.checkPermissions();
    return permission.contacts === 'granted';
  } catch {
    return false;
  }
};

import { supabase } from '@/integrations/supabase/client';

// Test users for the Chatr app
export const TEST_USERS = [
  'arsh.wani1@gmail.com',
  'arsh.wani@gmail.com',
  'arshid.wani@icloud.com',
  'chatr4661@gmail.com'
];

/**
 * Creates mutual contacts between all test users
 * This function should be called after all test users have signed up
 */
export const setupTestUserContacts = async () => {
  try {
    console.log('Setting up test user contacts...');
    
    for (let i = 0; i < TEST_USERS.length; i++) {
      for (let j = i + 1; j < TEST_USERS.length; j++) {
        const user1 = TEST_USERS[i];
        const user2 = TEST_USERS[j];
        
        console.log(`Creating mutual contact between ${user1} and ${user2}`);
        
        const { error } = await supabase
          .rpc('create_mutual_contact', {
            user1_email: user1,
            user2_email: user2
          });
        
        if (error) {
          console.error(`Error creating contact between ${user1} and ${user2}:`, error);
        } else {
          console.log(`✓ Created mutual contact between ${user1} and ${user2}`);
        }
      }
    }
    
    console.log('Test user contacts setup complete!');
    return { success: true };
  } catch (error) {
    console.error('Error setting up test contacts:', error);
    return { success: false, error };
  }
};

/**
 * Check if current user is a test user
 */
export const isTestUser = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return TEST_USERS.includes(user.email);
};

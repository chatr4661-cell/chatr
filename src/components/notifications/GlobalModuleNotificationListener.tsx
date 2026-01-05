import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useModuleNotifications } from '@/hooks/useModuleNotifications';
import { useVendorNotifications } from '@/hooks/useVendorNotifications';

interface GlobalModuleNotificationListenerProps {
  children?: React.ReactNode;
}

type VendorType = 'food' | 'services' | 'healthcare' | 'chatr_plus';

// Helper to check vendor status with explicit type handling
const checkVendorTable = async (
  userId: string, 
  tableName: string
): Promise<string | null> => {
  try {
    // Use any to bypass deep type instantiation
    const client = supabase as any;
    const { data, error } = await client
      .from(tableName)
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0]?.id || null;
  } catch {
    return null;
  }
};

export const GlobalModuleNotificationListener = ({ children }: GlobalModuleNotificationListenerProps) => {
  const [userId, setUserId] = useState<string | undefined>();
  const [vendorInfo, setVendorInfo] = useState<{ id?: string; type?: VendorType }>();

  // Initialize module notifications for current user
  useModuleNotifications(userId);
  
  // Initialize vendor notifications if user is a vendor
  useVendorNotifications(vendorInfo?.id, vendorInfo?.type);

  useEffect(() => {
    const fetchUserAndVendorInfo = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      setUserId(user.id);

      // Check vendor status in priority order
      const foodVendorId = await checkVendorTable(user.id, 'food_vendors');
      if (foodVendorId) {
        setVendorInfo({ id: foodVendorId, type: 'food' });
        return;
      }

      const sellerId = await checkVendorTable(user.id, 'chatr_plus_sellers');
      if (sellerId) {
        setVendorInfo({ id: sellerId, type: 'chatr_plus' });
        return;
      }

      const doctorId = await checkVendorTable(user.id, 'chatr_healthcare');
      if (doctorId) {
        setVendorInfo({ id: doctorId, type: 'healthcare' });
      }
    };

    fetchUserAndVendorInfo();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchUserAndVendorInfo();
      } else {
        setUserId(undefined);
        setVendorInfo(undefined);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
};

export default GlobalModuleNotificationListener;

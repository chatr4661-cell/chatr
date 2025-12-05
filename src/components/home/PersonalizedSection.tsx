import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { Skeleton } from '@/components/ui/skeleton';

export const PersonalizedSection: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { location, loading: locationLoading } = useChatrLocation();

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            const name = profile.full_name || profile.username || user.email?.split('@')[0] || 'there';
            setUserName(name.split(' ')[0]); // First name only
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, []);

  const cityName = location?.city || 'your area';

  if (loading || locationLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  // Only show for authenticated users
  if (!userName) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">
        Hello {userName} 👋
      </h2>
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
        <MapPin className="h-3.5 w-3.5" />
        <span>Services near you in {cityName}</span>
      </div>
    </div>
  );
};

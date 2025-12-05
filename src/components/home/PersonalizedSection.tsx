import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { Skeleton } from '@/components/ui/skeleton';

export const PersonalizedSection: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { location, loading: locationLoading } = useChatrLocation();

  // Get time-based gradient colors
  const getTimeBasedStyle = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      // Morning - warm sunrise colors
      return {
        gradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500',
        emoji: '🌅'
      };
    } else if (hour >= 12 && hour < 17) {
      // Afternoon - bright sunny colors
      return {
        gradient: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500',
        emoji: '☀️'
      };
    } else if (hour >= 17 && hour < 21) {
      // Evening - sunset colors
      return {
        gradient: 'bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500',
        emoji: '🌆'
      };
    } else {
      // Night - calm night colors
      return {
        gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600',
        emoji: '🌙'
      };
    }
  };

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
  const { gradient, emoji } = getTimeBasedStyle();

  if (loading || locationLoading) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  // Only show for authenticated users
  if (!userName) return null;

  return (
    <div className="text-center">
      <h2 className="text-xl font-bold">
        <span className={`${gradient} bg-clip-text text-transparent`}>
          Hello {userName}
        </span>
        <span className="ml-1">{emoji}</span>
      </h2>
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mt-1">
        <MapPin className="h-3.5 w-3.5" />
        <span>Services near you in {cityName}</span>
      </div>
    </div>
  );
};

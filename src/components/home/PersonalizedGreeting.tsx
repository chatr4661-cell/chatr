import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sun, Moon, Sunset, Coffee } from 'lucide-react';

export const PersonalizedGreeting = () => {
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<{ text: string; icon: React.ReactNode }>({
    text: 'Welcome',
    icon: <Sun className="w-5 h-5" />
  });

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const firstName = profile.full_name?.split(' ')[0] || profile.username || 'there';
        setUserName(firstName);
      }
    };

    const getGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        return {
          text: 'Good morning',
          icon: <Coffee className="w-5 h-5 text-amber-500" />
        };
      } else if (hour >= 12 && hour < 17) {
        return {
          text: 'Good afternoon',
          icon: <Sun className="w-5 h-5 text-yellow-500" />
        };
      } else if (hour >= 17 && hour < 21) {
        return {
          text: 'Good evening',
          icon: <Sunset className="w-5 h-5 text-orange-500" />
        };
      } else {
        return {
          text: 'Good night',
          icon: <Moon className="w-5 h-5 text-indigo-400" />
        };
      }
    };

    setGreeting(getGreeting());
    fetchUserName();

    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {greeting.icon}
      <div>
        <p className="text-lg font-bold text-foreground">
          {greeting.text}, {userName || 'there'}!
        </p>
        <p className="text-xs text-muted-foreground">
          What would you like to do today?
        </p>
      </div>
    </div>
  );
};

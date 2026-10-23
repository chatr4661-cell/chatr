import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sun, Moon, Sunset, Coffee, Sparkles, ShieldCheck } from 'lucide-react';

export const PersonalizedGreeting = () => {
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<{ text: string; icon: React.ReactNode; glowColor: string }>({
    text: 'Welcome',
    icon: <Sun className="w-5 h-5 text-amber-500" />,
    glowColor: 'from-amber-500/20 to-orange-500/10'
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
          icon: <Coffee className="w-5 h-5 text-amber-500" />,
          glowColor: 'from-amber-500/20 to-orange-500/10'
        };
      } else if (hour >= 12 && hour < 17) {
        return {
          text: 'Good afternoon',
          icon: <Sun className="w-5 h-5 text-yellow-500" />,
          glowColor: 'from-yellow-500/20 to-amber-500/10'
        };
      } else if (hour >= 17 && hour < 21) {
        return {
          text: 'Good evening',
          icon: <Sunset className="w-5 h-5 text-orange-500" />,
          glowColor: 'from-orange-500/20 to-rose-500/10'
        };
      } else {
        return {
          text: 'Good night',
          icon: <Moon className="w-5 h-5 text-indigo-400" />,
          glowColor: 'from-indigo-500/20 to-purple-500/10'
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
    <div className="relative overflow-hidden rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-4 sm:p-5 shadow-xs transition-all hover:border-primary/30">
      <div className={`absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-gradient-to-br ${greeting.glowColor} rounded-full blur-2xl pointer-events-none opacity-70`} />
      
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-background/80 border border-border/50 shadow-xs flex items-center justify-center shrink-0">
            {greeting.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {greeting.text}, <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">{userName || 'friend'}</span>!
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              What would you like to do today?
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] font-medium text-primary">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>E2E Encrypted</span>
        </div>
      </div>
    </div>
  );
};

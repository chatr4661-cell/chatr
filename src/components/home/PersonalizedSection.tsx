import React, { useEffect, useState } from 'react';
import { MapPin, Utensils, Briefcase, Stethoscope, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChatrLocation } from '@/hooks/useChatrLocation';
import { PersonalizedCard } from './PersonalizedCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Suggestion {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  route: string;
}

export const PersonalizedSection: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { location, loading: locationLoading } = useChatrLocation();

  // Get time-based suggestions
  const getTimeSuggestions = (): Suggestion[] => {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 11) {
      // Morning
      return [
        { icon: Utensils, title: 'Breakfast', description: 'Start your day right', gradient: 'bg-gradient-to-br from-orange-400 to-amber-500', route: '/chatr-world/food' },
        { icon: Stethoscope, title: 'Doctors', description: 'Book appointments', gradient: 'bg-gradient-to-br from-blue-400 to-indigo-500', route: '/local-healthcare' },
        { icon: Briefcase, title: 'Jobs', description: 'Find opportunities', gradient: 'bg-gradient-to-br from-purple-400 to-violet-500', route: '/local-jobs' },
        { icon: Sparkles, title: 'AI Assistant', description: 'Get help instantly', gradient: 'bg-gradient-to-br from-teal-400 to-cyan-500', route: '/ai-assistant' },
      ];
    } else if (hour >= 11 && hour < 17) {
      // Afternoon
      return [
        { icon: Briefcase, title: 'Jobs', description: 'Local opportunities', gradient: 'bg-gradient-to-br from-purple-400 to-violet-500', route: '/local-jobs' },
        { icon: Utensils, title: 'Lunch', description: 'Order food nearby', gradient: 'bg-gradient-to-br from-orange-400 to-red-500', route: '/chatr-world/food' },
        { icon: Stethoscope, title: 'Healthcare', description: 'Find clinics', gradient: 'bg-gradient-to-br from-blue-400 to-indigo-500', route: '/local-healthcare' },
        { icon: Sparkles, title: 'AI Browser', description: 'Search smarter', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-500', route: '/ai-browser-home' },
      ];
    } else if (hour >= 17 && hour < 22) {
      // Evening
      return [
        { icon: Utensils, title: 'Dinner', description: 'Evening meals', gradient: 'bg-gradient-to-br from-red-400 to-rose-500', route: '/chatr-world/food' },
        { icon: Sparkles, title: 'Deals', description: 'Evening offers', gradient: 'bg-gradient-to-br from-green-400 to-emerald-500', route: '/local-deals' },
        { icon: Stethoscope, title: 'Emergency', description: '24/7 care access', gradient: 'bg-gradient-to-br from-red-500 to-red-600', route: '/emergency' },
        { icon: Briefcase, title: 'Services', description: 'Home services', gradient: 'bg-gradient-to-br from-indigo-400 to-purple-500', route: '/home-services' },
      ];
    } else {
      // Night
      return [
        { icon: Utensils, title: 'Late Night', description: 'Food delivery', gradient: 'bg-gradient-to-br from-purple-500 to-pink-500', route: '/chatr-world/food' },
        { icon: Stethoscope, title: 'Emergency', description: '24/7 hospitals', gradient: 'bg-gradient-to-br from-red-500 to-red-600', route: '/emergency' },
        { icon: Sparkles, title: 'AI Chat', description: 'Always available', gradient: 'bg-gradient-to-br from-teal-400 to-cyan-500', route: '/ai-assistant' },
        { icon: Briefcase, title: 'Jobs', description: 'Night shift roles', gradient: 'bg-gradient-to-br from-slate-400 to-slate-600', route: '/local-jobs' },
      ];
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

  const suggestions = getTimeSuggestions();
  const cityName = location?.city || 'your area';

  if (loading || locationLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-32 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  // Only show for authenticated users
  if (!userName) return null;

  return (
    <div className="space-y-3">
      {/* Greeting Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Hello {userName} 👋
        </h2>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
          <MapPin className="h-3.5 w-3.5" />
          <span>Services near you in {cityName}</span>
        </div>
      </div>

      {/* Suggestions Title */}
      <p className="text-sm font-medium text-muted-foreground">Suggested for you</p>

      {/* Horizontal Scroll Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {suggestions.map((suggestion, index) => (
          <PersonalizedCard
            key={index}
            icon={suggestion.icon}
            title={suggestion.title}
            description={suggestion.description}
            gradient={suggestion.gradient}
            route={suggestion.route}
          />
        ))}
      </div>
    </div>
  );
};

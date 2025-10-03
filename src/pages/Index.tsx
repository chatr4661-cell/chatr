import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ServiceCard from '@/components/ServiceCard';
import { Bot, Stethoscope, AlertTriangle, Activity, Trophy, ShoppingBag, MessageCircle, Heart, User, Mic, Paperclip, LogOut } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const services = [
    {
      icon: Bot,
      title: 'AI Health Assistant',
      description: 'Get instant health advice and symptom checking',
      iconColor: 'bg-gradient-to-br from-teal-400 to-emerald-500',
      route: '/ai-assistant'
    },
    {
      icon: Stethoscope,
      title: 'Doctor/Nurse Booking',
      description: 'Book appointments with healthcare professionals',
      iconColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      route: '/booking'
    },
    {
      icon: AlertTriangle,
      title: 'Emergency / Panic Button',
      description: 'Quick access to emergency services',
      iconColor: 'bg-gradient-to-br from-red-400 to-red-600',
      route: '/emergency'
    },
    {
      icon: Activity,
      title: 'Wellness Tracking',
      description: 'Track your health metrics and goals',
      iconColor: 'bg-gradient-to-br from-pink-400 to-pink-600',
      route: '/wellness'
    },
    {
      icon: Trophy,
      title: 'Youth Engagement',
      description: 'Health programs and activities',
      iconColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      route: '/youth'
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace',
      description: 'Order medicines and health products',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/marketplace'
    },
    {
      icon: MessageCircle,
      title: 'Messaging',
      description: 'Chat with healthcare providers',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat'
    },
    {
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Access specialized healthcare services',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/allied-healthcare'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-6">
      {/* Header */}
      <div className="p-4 backdrop-blur-glass bg-gradient-glass border-b border-glass-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">HealthMessenger</h1>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full bg-destructive/10 hover:bg-destructive/20"
            >
              <LogOut className="h-5 w-5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Message Input Bar */}
      <div className="p-4 max-w-4xl mx-auto">
        <div className="relative">
          <Input
            placeholder="Type a message..."
            className="rounded-full bg-card/50 backdrop-blur-glass border-glass-border pr-24 shadow-card"
            readOnly
            onClick={() => navigate('/chat')}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={() => navigate('/chat')}
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9"
              onClick={() => navigate('/chat')}
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="p-4 max-w-4xl mx-auto space-y-3">
        {services.map((service) => (
          <div key={service.title} onClick={() => navigate(service.route)}>
            <ServiceCard {...service} />
          </div>
        ))}

        {/* AI Assistant Message Bubble */}
        <div className="flex justify-end px-4 py-2">
          <div className="bg-gradient-to-br from-teal-400/20 to-emerald-500/20 backdrop-blur-glass border border-teal-400/30 rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] shadow-glow">
            <p className="text-sm text-foreground">Hi! How can I assist you today?</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

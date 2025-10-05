import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ServiceCard from '@/components/ServiceCard';
import { 
  Bot, 
  Stethoscope, 
  AlertTriangle, 
  Activity, 
  Trophy, 
  ShoppingBag, 
  MessageCircle, 
  Heart, 
  Mic, 
  Paperclip, 
  LogOut, 
  Briefcase,
  FileText,
  Pill,
  Users,
  Coins,
  Shield,
  QrCode
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

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

  const messagingServices = [
    {
      icon: MessageCircle,
      title: 'Messaging',
      description: 'Chat with anyone, anywhere',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat'
    },
    {
      icon: MessageCircle,
      title: 'Contacts',
      description: 'View and manage contacts',
      iconColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      route: '/contacts'
    },
  ];

  const healthcareServices = [
    {
      icon: Coins,
      title: 'Chatr Points',
      description: 'Earn, redeem & buy rewards',
      iconColor: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      route: '/chatr-points'
    },
    {
      icon: Bot,
      title: 'AI Health Assistant',
      description: 'Get instant health advice and symptom checking',
      iconColor: 'bg-gradient-to-br from-teal-400 to-emerald-500',
      route: '/ai-assistant'
    },
    {
      icon: FileText,
      title: 'Lab Reports',
      description: 'Upload and manage medical test results',
      iconColor: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
      route: '/lab-reports'
    },
    {
      icon: Pill,
      title: 'Medicine Reminders',
      description: 'Never miss your medication schedule',
      iconColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
      route: '/medicine-reminders'
    },
    {
      icon: Shield,
      title: 'Health Passport',
      description: 'Your complete digital health identity',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-green-600',
      route: '/health-passport'
    },
    {
      icon: QrCode,
      title: 'QR Login',
      description: 'Link desktop and mobile devices',
      iconColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
      route: '/qr-login'
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
      icon: Users,
      title: 'Youth Feed',
      description: 'Share wellness journey with community',
      iconColor: 'bg-gradient-to-br from-violet-400 to-violet-600',
      route: '/youth-feed'
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
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Access specialized healthcare services',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/allied-healthcare'
    },
    {
      icon: Briefcase,
      title: 'Become a Provider',
      description: 'Register as a healthcare provider',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      route: '/provider-register'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-6">
      {/* Header */}
      <div className="p-2 backdrop-blur-glass bg-gradient-glass border-b border-glass-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src={logo} alt="chatr+ Logo" className="h-8 object-contain" />
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full bg-destructive/10 hover:bg-destructive/20 h-7 px-2"
            >
              <LogOut className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Messaging Product Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                chatr+ Messaging
              </h2>
            </div>
          </div>
          
          {/* Quick Message Input */}
          <div className="relative">
            <Input
              placeholder="Start a new message..."
              className="rounded-full bg-card/50 backdrop-blur-glass border-glass-border pr-20 shadow-card h-10 text-sm"
              readOnly
              onClick={() => navigate('/chat')}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-7 w-7 p-0"
                onClick={() => navigate('/chat')}
              >
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-7 w-7 p-0"
                onClick={() => navigate('/chat')}
              >
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Messaging Features */}
          <div className="grid grid-cols-2 gap-2">
            {messagingServices.map((service) => (
              <div key={service.title} onClick={() => navigate(service.route)}>
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-glass-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Separate Business</span>
          </div>
        </div>

        {/* Healthcare Product Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Healthcare Platform
              </h2>
              <p className="text-xs text-muted-foreground">Professional Health Services & Wellness</p>
            </div>
          </div>

          {/* Healthcare Services Grid */}
          <div className="space-y-2">
            {healthcareServices.map((service) => (
              <div key={service.title} onClick={() => navigate(service.route)}>
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

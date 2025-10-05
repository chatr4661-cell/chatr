import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ServiceCard from '@/components/ServiceCard';
import { setupTestUserContacts, isTestUser } from '@/utils/testUserSetup';
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
  QrCode,
  Phone,
  Sparkles
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isSettingUpContacts, setIsSettingUpContacts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        checkAndSetupTestUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        checkAndSetupTestUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAndSetupTestUser = async (user: any) => {
    if (user?.email && await isTestUser()) {
      const hasSetup = localStorage.getItem(`contacts_setup_${user.email}`);
      if (!hasSetup) {
        setIsSettingUpContacts(true);
        await setupTestUserContacts();
        localStorage.setItem(`contacts_setup_${user.email}`, 'true');
        setIsSettingUpContacts(false);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const messagingServices = [
    {
      icon: MessageCircle,
      title: 'Messages',
      description: 'Chat with anyone, anywhere',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat'
    },
    {
      icon: Phone,
      title: 'Calls',
      description: 'Voice & video calling',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/chat'
    },
    {
      icon: Users,
      title: 'Contacts',
      description: 'Manage your contacts',
      iconColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      route: '/contacts'
    },
  ];

  const chatrPlatformServices = [
    {
      icon: Coins,
      title: 'Chatr Points',
      description: 'Earn, redeem & buy rewards',
      iconColor: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      route: '/chatr-points'
    },
    {
      icon: QrCode,
      title: 'QR Login',
      description: 'Link desktop and mobile',
      iconColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
      route: '/qr-login'
    },
  ];

  const healthcareServices = [
    {
      icon: Bot,
      title: 'AI Health Assistant',
      description: 'Get instant health advice',
      iconColor: 'bg-gradient-to-br from-teal-400 to-emerald-500',
      route: '/ai-assistant'
    },
    {
      icon: Stethoscope,
      title: 'Doctor Booking',
      description: 'Book healthcare appointments',
      iconColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      route: '/booking'
    },
    {
      icon: FileText,
      title: 'Lab Reports',
      description: 'Manage medical test results',
      iconColor: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
      route: '/lab-reports'
    },
    {
      icon: Pill,
      title: 'Medicine Reminders',
      description: 'Never miss your medication',
      iconColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
      route: '/medicine-reminders'
    },
    {
      icon: Shield,
      title: 'Health Passport',
      description: 'Digital health identity',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-green-600',
      route: '/health-passport'
    },
    {
      icon: AlertTriangle,
      title: 'Emergency Button',
      description: 'Quick emergency access',
      iconColor: 'bg-gradient-to-br from-red-400 to-red-600',
      route: '/emergency'
    },
    {
      icon: Activity,
      title: 'Wellness Tracking',
      description: 'Track health metrics',
      iconColor: 'bg-gradient-to-br from-pink-400 to-pink-600',
      route: '/wellness'
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace',
      description: 'Order medicines & products',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/marketplace'
    },
    {
      icon: Heart,
      title: 'Allied Healthcare',
      description: 'Specialized health services',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/allied-healthcare'
    },
    {
      icon: Briefcase,
      title: 'Become a Provider',
      description: 'Register as healthcare provider',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      route: '/provider-register'
    },
  ];

  const youthServices = [
    {
      icon: Users,
      title: 'Youth Feed',
      description: 'Share wellness journey',
      iconColor: 'bg-gradient-to-br from-violet-400 to-violet-600',
      route: '/youth-feed'
    },
    {
      icon: Trophy,
      title: 'Youth Engagement',
      description: 'Health programs & activities',
      iconColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      route: '/youth'
    },
  ];

  return (
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000]">
      {/* iOS-style Header */}
      <div className="bg-background/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <img src={logo} alt="chatr+ Logo" className="h-7 object-contain" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/download')}
              className="rounded-full h-8 px-3 text-[15px] text-primary"
            >
              Download
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="rounded-full h-8 w-8"
              >
                <LogOut className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {isSettingUpContacts && (
          <div className="mx-4 mt-4 bg-primary/10 border border-primary/20 rounded-xl p-3">
            <p className="text-[15px] text-primary text-center">Setting up test contacts...</p>
          </div>
        )}

        {/* Tabs for Different Platforms */}
        <Tabs defaultValue="messaging" className="w-full mt-4">
          <TabsList className="w-full grid grid-cols-3 mx-4 mb-4 bg-muted/50">
            <TabsTrigger value="messaging" className="text-[15px] data-[state=active]:bg-background">
              Messaging
            </TabsTrigger>
            <TabsTrigger value="healthcare" className="text-[15px] data-[state=active]:bg-background">
              Healthcare
            </TabsTrigger>
            <TabsTrigger value="youth" className="text-[15px] data-[state=active]:bg-background">
              Youth
            </TabsTrigger>
          </TabsList>

          {/* Messaging Tab */}
          <TabsContent value="messaging" className="px-4 space-y-4">
            <div className="space-y-3">
              <h2 className="text-[28px] font-bold text-foreground">chatr+ Messaging</h2>
              
              <div className="relative">
                <Input
                  placeholder="Start a new message..."
                  className="rounded-2xl bg-muted/50 dark:bg-muted/30 border-0 pr-20 h-11 text-[15px]"
                  readOnly
                  onClick={() => navigate('/chat')}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                    onClick={() => navigate('/chat')}
                  >
                    <Paperclip className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                    onClick={() => navigate('/chat')}
                  >
                    <Mic className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {messagingServices.map((service) => (
                  <div key={service.title} onClick={() => navigate(service.route)}>
                    <ServiceCard {...service} />
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <h3 className="text-[17px] font-semibold mb-3">Chatr Platform</h3>
                <div className="grid grid-cols-2 gap-3">
                  {chatrPlatformServices.map((service) => (
                    <div key={service.title} onClick={() => navigate(service.route)}>
                      <ServiceCard {...service} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Healthcare Tab */}
          <TabsContent value="healthcare" className="px-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-7 w-7 text-red-500" />
                <div>
                  <h2 className="text-[28px] font-bold text-foreground leading-none">Healthcare</h2>
                  <p className="text-[13px] text-muted-foreground">Professional Health Services</p>
                </div>
              </div>

              <div className="space-y-2">
                {healthcareServices.map((service) => (
                  <div key={service.title} onClick={() => navigate(service.route)}>
                    <ServiceCard {...service} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Youth Tab */}
          <TabsContent value="youth" className="px-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-yellow-500" />
                <div>
                  <h2 className="text-[28px] font-bold text-foreground leading-none">Youth</h2>
                  <p className="text-[13px] text-muted-foreground">Wellness & Community</p>
                </div>
              </div>

              <div className="space-y-2">
                {youthServices.map((service) => (
                  <div key={service.title} onClick={() => navigate(service.route)}>
                    <ServiceCard {...service} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
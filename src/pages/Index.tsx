import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ServiceCard from '@/components/ServiceCard';
import { setupTestUserContacts, isTestUser } from '@/utils/testUserSetup';
import { toast } from 'sonner';
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
  Flame
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isSettingUpContacts, setIsSettingUpContacts] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);

  // Auto-sync contacts on app load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        checkAndSetupTestUser(session.user);
        // Trigger auto-sync after user is set
        autoSyncContactsOnLoad(session.user.id);
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

  const autoSyncContactsOnLoad = async (userId: string) => {
    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      const { Capacitor } = await import('@capacitor/core');
      
      // Only on native platforms
      if (!Capacitor.isNativePlatform()) return;
      
      const lastSync = localStorage.getItem(`last_sync_${userId}`);
      const now = new Date().getTime();
      
      // Auto-sync if never synced or last sync was more than 6 hours ago
      if (!lastSync || (now - parseInt(lastSync)) > 6 * 60 * 60 * 1000) {
        console.log('🔄 Auto-syncing contacts on app load...');
        
        const permission = await Contacts.requestPermissions();
        if (permission.contacts === 'granted') {
          const result = await Contacts.getContacts({
            projection: { name: true, phones: true, emails: true }
          });
          
          if (result.contacts && result.contacts.length > 0) {
            // Batch import contacts
            let syncedCount = 0;
            for (const contact of result.contacts.slice(0, 100)) { // Limit to first 100 for speed
              const name = contact.name?.display || 'Unknown';
              const phone = contact.phones?.[0]?.number;
              const email = contact.emails?.[0]?.address;
              
              if (!phone && !email) continue;
              
              const identifier = email || phone || '';
              
              // Quick check if user is registered
              let matchedUser = null;
              if (email) {
                const { data } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('email', email)
                  .maybeSingle();
                matchedUser = data;
              }
              
              await supabase
                .from('contacts')
                .upsert({
                  user_id: userId,
                  contact_name: name,
                  contact_phone: identifier,
                  contact_user_id: matchedUser?.id || null,
                  is_registered: !!matchedUser
                }, { onConflict: 'user_id,contact_phone' });
              
              syncedCount++;
            }
            
            localStorage.setItem(`last_sync_${userId}`, now.toString());
            console.log(`✅ Auto-synced ${syncedCount} contacts`);
          }
        }
      }
    } catch (error) {
      console.log('Auto-sync not available:', error);
    }
  };

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pointsData } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      setPointsBalance(pointsData?.balance || 0);
      setCurrentStreak(streakData?.current_streak || 0);
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  };

  const processDailyLogin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('process-daily-login');
      
      if (error) throw error;
      
      if (data?.pointsAwarded > 0) {
        toast.success(`🎉 Daily Login Bonus: ${data.pointsAwarded} points!`, {
          description: data.message
        });
        loadPointsData();
      }
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };

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
    
    // Load points and process daily login for all users
    await loadPointsData();
    await processDailyLogin();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const chatrServices = [
    {
      icon: MessageCircle,
      title: 'Chat',
      description: 'Messages, calls & contacts',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat'
    },
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
    {
      icon: Flame,
      title: 'Stories',
      description: 'Share moments with friends',
      iconColor: 'bg-gradient-to-br from-pink-400 to-purple-600',
      route: '/stories'
    },
    {
      icon: Users,
      title: 'Communities',
      description: 'Join & discover groups',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-purple-600',
      route: '/communities'
    },
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
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000] pb-6">
      {/* iOS-style Header */}
      <div className="bg-background/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <img src={logo} alt="Chatr Logo" className="h-7 object-contain" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chatr-points')}
              className="h-8 px-2 gap-1.5 rounded-full bg-gradient-to-br from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 transition-all"
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-[15px] font-semibold text-amber-600 dark:text-amber-400">
                {isLoadingPoints ? '...' : pointsBalance.toLocaleString()}
              </span>
              {currentStreak > 0 && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[13px] font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
                </div>
              )}
            </Button>
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

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {isSettingUpContacts && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <p className="text-[15px] text-primary text-center">Setting up test contacts...</p>
          </div>
        )}

        {/* Chatr Brand Header */}
        <div className="space-y-2">
          <h1 className="text-[34px] font-bold text-foreground tracking-tight">Chatr</h1>
          <p className="text-[15px] text-muted-foreground">All-in-one messaging & health platform</p>
        </div>

        {/* Quick Message Input */}
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

        {/* All Services Grid */}
        <div className="grid grid-cols-2 gap-3">
          {chatrServices.map((service) => (
            <div key={service.title} onClick={() => navigate(service.route)}>
              <ServiceCard {...service} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
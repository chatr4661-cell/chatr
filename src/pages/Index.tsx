import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Bot, 
  Stethoscope, 
  AlertTriangle, 
  MessageCircle, 
  Heart, 
  Mic, 
  Paperclip, 
  LogOut, 
  Users,
  Coins,
  QrCode,
  Flame,
  Grid3x3,
  CheckCircle
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

// Lazy load heavy components
const ServiceCard = React.lazy(() => import('@/components/ServiceCard'));

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [pointsBalance, setPointsBalance] = React.useState<number>(0);
  const [currentStreak, setCurrentStreak] = React.useState<number>(0);
  const [mounted, setMounted] = React.useState(false);

  // Fast initial auth check - non-blocking
  React.useEffect(() => {
    setMounted(true);
    
    let authCheckTimeout: NodeJS.Timeout;
    
    // Defer auth check slightly to allow UI to render first
    authCheckTimeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          navigate('/auth');
        } else {
          setUser(session.user);
          // Defer all heavy operations
          deferHeavyOperations(session.user);
        }
      });
    }, 50);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Defer all heavy operations to after page load
  const deferHeavyOperations = (user: any) => {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadPointsData();
        processDailyLogin();
        autoSyncContactsOnLoad(user.id);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        loadPointsData();
        processDailyLogin();
        autoSyncContactsOnLoad(user.id);
      }, 100);
    }
  };

  const autoSyncContactsOnLoad = async (userId: string) => {
    // Run in background - heavily deferred
    setTimeout(async () => {
      try {
        const [{ Contacts }, { Capacitor }] = await Promise.all([
          import('@capacitor-community/contacts'),
          import('@capacitor/core')
        ]);
        
        if (!Capacitor.isNativePlatform()) return;
        
        const lastSync = localStorage.getItem(`last_sync_${userId}`);
        const now = new Date().getTime();
        
        if (!lastSync || (now - parseInt(lastSync)) > 6 * 60 * 60 * 1000) {
          const permission = await Contacts.requestPermissions();
          if (permission.contacts !== 'granted') return;
          
          const result = await Contacts.getContacts({
            projection: { name: true, phones: true, emails: true }
          });
          
          if (!result.contacts || result.contacts.length === 0) return;
          
          const contactsToSync = result.contacts.slice(0, 50);
          
          const contactData = await Promise.all(
            contactsToSync.map(async (contact) => {
              const name = contact.name?.display || 'Unknown';
              const phone = contact.phones?.[0]?.number;
              const email = contact.emails?.[0]?.address;
              
              if (!phone && !email) return null;
              
              const identifier = email || phone || '';
              
              let matchedUserId = null;
              if (email) {
                const { data } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('email', email)
                  .maybeSingle();
                matchedUserId = data?.id;
              }
              
              return {
                user_id: userId,
                contact_name: name,
                contact_phone: identifier,
                contact_user_id: matchedUserId,
                is_registered: !!matchedUserId
              };
            })
          );
          
          const validContacts = contactData.filter(c => c !== null);
          if (validContacts.length > 0) {
            await supabase
              .from('contacts')
              .upsert(validContacts, { 
                onConflict: 'user_id,contact_phone',
                ignoreDuplicates: true 
              });
          }
          
          localStorage.setItem(`last_sync_${userId}`, now.toString());
        }
      } catch (error) {
        console.log('Auto-sync error:', error);
      }
    }, 5000); // Delay 5 seconds - page is fully loaded by then
  };

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: pointsData }, { data: streakData }] = await Promise.all([
        supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).maybeSingle()
      ]);

      setPointsBalance(pointsData?.balance || 0);
      setCurrentStreak(streakData?.current_streak || 0);
    } catch (error) {
      console.error('Error loading points:', error);
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


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const mainHubs = [
    {
      icon: MessageCircle,
      title: 'Chat',
      description: 'Messages, calls & video',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat',
      isNew: false
    },
    {
      icon: Heart,
      title: 'Health Hub',
      description: 'AI assistant, vitals & reports',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-teal-600',
      route: '/health',
      isNew: true
    },
    {
      icon: Stethoscope,
      title: 'Care Access',
      description: 'Book doctors & emergency',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/care',
      isNew: true
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Groups, stories & challenges',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-600',
      route: '/community',
      isNew: true
    },
    {
      icon: Coins,
      title: 'Rewards',
      description: 'Points, wallet & premium',
      iconColor: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      route: '/chatr-points',
      isNew: false
    },
    {
      icon: Grid3x3,
      title: 'Mini-Apps',
      description: 'Discover & install apps',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/mini-apps',
      isNew: true
    },
    {
      icon: CheckCircle,
      title: 'Official',
      description: 'Verified accounts & services',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      route: '/official-accounts',
      isNew: true
    },
  ];

  const quickAccessServices = [
    {
      icon: QrCode,
      title: 'QR Login',
      description: 'Link desktop and mobile',
      iconColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
      route: '/qr-login'
    },
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Instant health advice',
      iconColor: 'bg-gradient-to-br from-teal-400 to-emerald-500',
      route: '/ai-assistant'
    },
    {
      icon: AlertTriangle,
      title: 'Emergency',
      description: 'Quick emergency access',
      iconColor: 'bg-gradient-to-br from-red-400 to-red-600',
      route: '/emergency'
    },
  ];

  // Show skeleton while mounting
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000]">
        <div className="bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
            <img src={logo} alt="Chatr Logo" className="h-7 object-contain" />
          </div>
        </div>
      </div>
    );
  }

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
                {pointsBalance.toLocaleString()}
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

        {/* Chatr Brand Header */}
        <div className="space-y-2">
          <h1 className="text-[34px] font-bold text-foreground tracking-tight">Chatr+</h1>
          <p className="text-[15px] text-muted-foreground">Your complete health & wellness ecosystem</p>
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

        {/* Main Feature Hubs */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Main Features</h2>
          <div className="grid grid-cols-1 gap-3">
            <React.Suspense fallback={
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            }>
              {mainHubs.map((hub) => (
                <div 
                  key={hub.title} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Hub clicked:', hub.title, hub.route);
                    navigate(hub.route);
                  }}
                  className="relative cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <ServiceCard {...hub} />
                  {hub.isNew && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                      NEW
                    </div>
                  )}
                </div>
              ))}
            </React.Suspense>
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Quick Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickAccessServices.map((service) => (
              <div 
                key={service.title} 
                onClick={() => navigate(service.route)}
                className="aspect-square"
              >
                <div className={`h-full rounded-2xl ${service.iconColor} p-3 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all`}>
                  <service.icon className="w-8 h-8 text-white mb-2" />
                  <span className="text-[11px] text-white text-center font-medium">{service.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
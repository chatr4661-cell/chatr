import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';
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
  Utensils,
  Percent,
  Flame,
  Grid3x3,
  CheckCircle,
  Building2,
  Share2,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { QuickAccessMenu } from '@/components/QuickAccessMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share } from 'lucide-react';

// Import ServiceCard directly (small component, no need for lazy loading)
import ServiceCard from '@/components/ServiceCard';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [pointsBalance, setPointsBalance] = React.useState<number>(0);
  const [currentStreak, setCurrentStreak] = React.useState<number>(0);
  const [mounted, setMounted] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [referralCode, setReferralCode] = React.useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  // Load user and check authentication
  React.useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // User is not logged in, redirect to auth
        navigate('/auth', { replace: true });
        return;
      }
      
      // Set the user state for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setMounted(true);
    };
    
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
        setUser(null);
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user);
          setMounted(true);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Defer all heavy operations to after page is visible
  React.useEffect(() => {
    if (!user) return;
    
    // CRITICAL: Use requestIdleCallback for non-critical operations
    // This prevents blocking the main thread during initial render
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadPointsData();
        // Process daily login after points load
        setTimeout(() => processDailyLogin(), 500);
      });
      
      // Contact sync is non-critical - defer heavily
      requestIdleCallback(() => {
        setTimeout(() => autoSyncContactsOnLoad(user.id), 60000); // 1 minute
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        loadPointsData();
        setTimeout(() => processDailyLogin(), 500);
        setTimeout(() => autoSyncContactsOnLoad(user.id), 60000);
      }, 300);
    }

    return () => {};
  }, [user]);

  const autoSyncContactsOnLoad = async (userId: string) => {
    // Auto-sync contacts on first load (background)
    setTimeout(async () => {
      try {
        const [{ Contacts }, { Capacitor }] = await Promise.all([
          import('@capacitor-community/contacts'),
          import('@capacitor/core')
        ]);
        
        if (!Capacitor.isNativePlatform()) return;
        
        const lastSync = localStorage.getItem(`last_sync_${userId}`);
        const now = new Date().getTime();
        
        // Auto-sync every 6 hours or on first launch
        if (!lastSync || (now - parseInt(lastSync)) > 6 * 60 * 60 * 1000) {
          const permission = await Contacts.requestPermissions();
          if (permission.contacts !== 'granted') {
            console.log('Contacts permission not granted - sync skipped');
            return;
          }
          
          const result = await Contacts.getContacts({
            projection: { name: true, phones: true, emails: true }
          });
          
          if (!result.contacts || result.contacts.length === 0) return;
          
          // Process in batches of 100 for better performance
          const batchSize = 100;
          for (let i = 0; i < result.contacts.length; i += batchSize) {
            const batch = result.contacts.slice(i, i + batchSize);
            
            const contactData = batch
              .map((contact) => {
                const name = contact.name?.display || 'Unknown';
                const phone = contact.phones?.[0]?.number;
                const email = contact.emails?.[0]?.address;
                
                if (!phone && !email) return null;
                
                return {
                  name: name,
                  phone: phone || '',
                  email: email || ''
                };
              })
              .filter(c => c !== null);
            
            if (contactData.length > 0) {
              // Use the database function for efficient sync
              await supabase.rpc('sync_user_contacts', {
                user_uuid: userId,
                contact_list: contactData
              });
            }
          }
          
          localStorage.setItem(`last_sync_${userId}`, now.toString());
          console.log(`✅ Synced ${result.contacts.length} contacts successfully`);
        }
      } catch (error) {
        console.log('Auto-sync error:', error);
      }
    }, 3000); // Delay 3 seconds after page load
  };

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel for speed
      const [pointsData, streakData, referralData] = await Promise.all([
        supabase.from('user_points').select('balance').eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).maybeSingle().then(r => r.data),
        supabase.from('chatr_referral_codes').select('code, qr_code_url').eq('user_id', user.id).maybeSingle().then(r => r.data)
      ]);

      setPointsBalance(pointsData?.balance || 0);
      setCurrentStreak(streakData?.current_streak || 0);
      
      if (referralData) {
        setReferralCode(referralData.code);
        setQrCodeUrl(referralData.qr_code_url || '');
      }
    } catch (error) {
      // Silently fail to not block UI
      console.error('Error loading points:', error);
    }
  };

  const processDailyLogin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already processed today to avoid redundant calls
      const lastProcessed = localStorage.getItem('last_daily_login');
      const today = new Date().toDateString();
      if (lastProcessed === today) return;

      const { data, error } = await supabase.functions.invoke('process-daily-login');
      
      if (error) throw error;
      
      if (data?.pointsAwarded > 0) {
        toast.success(`🎉 Daily Login Bonus: ${data.pointsAwarded} points!`, {
          description: data.message
        });
        loadPointsData();
      }
      
      localStorage.setItem('last_daily_login', today);
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleShareClick = async () => {
    if (!referralCode) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-referral-code');
        if (error) throw error;
        if (data) {
          setReferralCode(data.referralCode);
          setQrCodeUrl(data.qrCodeUrl || '');
        }
      } catch (error) {
        console.error('Error generating referral code:', error);
        toast.error('Failed to load referral code');
        return;
      }
    }
    setShowShareDialog(true);
  };

  const copyReferralLink = async () => {
    const link = `https://chatr.chat/auth?ref=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareReferralLink = async () => {
    const link = `https://chatr.chat/auth?ref=${referralCode}`;
    const text = `Join me on Chatr+ and earn rewards! Use my code: ${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Chatr+', text, url: link });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  const mainHubs = [
    {
      icon: Zap,
      title: 'Chatr World',
      description: 'Conversational Multiverse AI',
      iconColor: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
      route: '/chatr-world',
      isNew: true
    },
    {
      icon: MessageCircle,
      title: 'Chat',
      description: 'Messages, calls & video',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat',
      isNew: false
    },
    {
      icon: Search,
      title: 'Chatr Browser',
      description: 'Deep Multiverse Search Engine',
      iconColor: 'bg-gradient-to-br from-violet-400 to-purple-600',
      route: '/home',
      isNew: true
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
    {
      icon: Building2,
      title: 'Business',
      description: 'CRM, inbox & analytics',
      iconColor: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      route: '/business',
      isNew: true
    },
  ];

  const quickAccessServices = [
    {
      icon: QrCode,
      title: 'Chatr Studio',
      description: 'Build your own mini-apps',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-500',
      route: '/chatr-studio'
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

  const ecosystemServices = [
    {
      icon: Bot,
      title: 'Food Ordering',
      description: 'Order from local restaurants',
      iconColor: 'bg-gradient-to-br from-orange-400 to-red-500',
      route: '/food-ordering'
    },
    {
      icon: Percent,
      title: 'Local Deals',
      description: 'Exclusive community offers',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-500',
      route: '/local-deals'
    },
    {
      icon: QrCode,
      title: 'Chatr Growth',
      description: 'Earn rewards & invite friends',
      iconColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
      route: '/growth'
    },
  ];

  const growthPrograms = [
    {
      icon: Flame,
      title: 'Chatr Champions',
      description: 'Referral network & earnings dashboard',
      iconColor: 'bg-gradient-to-br from-orange-400 to-red-500',
      route: '/growth',
      badge: 'Earn ₹'
    },
    {
      icon: Users,
      title: 'Chatr Partner',
      description: 'Join our campus partner program',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-500',
      route: '/ambassador-program',
      badge: 'Apply'
    },
    {
      icon: Stethoscope,
      title: 'Doctor Portal',
      description: 'Healthcare provider registration',
      iconColor: 'bg-gradient-to-br from-cyan-400 to-blue-500',
      route: '/doctor-onboarding',
      badge: 'Join'
    },
  ];

  // Show minimal skeleton while checking auth (no animations for speed)
  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
        <div className="bg-background/95 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
            <img src={chatrIconLogo} alt="Chatr" className="h-12 w-12" loading="eager" />
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-cyan-500 bg-clip-text text-transparent">
                Chatr+
              </div>
              <div className="text-xs font-medium text-muted-foreground">Say It. Share It. Live It.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 pb-6">
      {/* Enhanced Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrIconLogo} alt="Chatr Logo" className="h-10 w-10" loading="eager" />
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-primary via-primary to-cyan-500 bg-clip-text text-transparent">
                Chatr+
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">Say It. Share It. Live It.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <QuickAccessMenu />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chatr-points')}
              className="h-9 px-3 gap-1.5 rounded-full bg-gradient-to-br from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 transition-all hover:shadow-md"
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {pointsBalance.toLocaleString()}
              </span>
              {currentStreak > 0 && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
                </div>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareClick}
              className="rounded-full h-9 px-4 text-sm font-medium bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 text-orange-600 dark:text-orange-400 transition-all gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Share & Earn</span>
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="rounded-full h-9 w-9 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">

        {/* Quick Message Input */}
        <div 
          onClick={() => navigate('/chat')}
          className="cursor-pointer group hover:scale-[1.02] transition-all duration-300"
        >
          <div className="relative bg-gradient-to-r from-primary/5 to-cyan-500/5 rounded-3xl border-2 border-primary/20 p-4 shadow-lg hover:shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors duration-300">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Start a new conversation...</p>
                <p className="text-xs text-muted-foreground">Message, voice call, or video chat</p>
              </div>
              <div className="flex gap-1">
                <div className="p-2 bg-background/50 rounded-full">
                  <Paperclip className="h-4 w-4 text-primary" />
                </div>
                <div className="p-2 bg-background/50 rounded-full">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Feature Hubs */}
        <div className="grid grid-cols-1 gap-3">
          {mainHubs.map((hub, index) => (
            <div 
              key={hub.title} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Hub clicked:', hub.title, hub.route);
                navigate(hub.route);
              }}
              className="relative cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
              role="button"
              tabIndex={0}
            >
              <ServiceCard {...hub} />
              {hub.isNew && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none">
                  NEW
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Growth & Opportunities */}
        <div className="grid grid-cols-1 gap-3">
          {growthPrograms.map((program, index) => (
            <div 
              key={program.title} 
              onClick={() => navigate(program.route)}
              className="group cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative bg-gradient-to-br from-background to-muted/30 rounded-2xl border-2 border-border/40 p-4 shadow-lg hover:shadow-2xl hover:border-primary/40 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`${program.iconColor} p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                    <program.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{program.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                        {program.badge}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">→</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ecosystem Services */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Ecosystem</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {ecosystemServices.map((service, index) => (
              <div 
                key={service.title} 
                onClick={() => navigate(service.route)}
                className="aspect-square transform hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`h-full rounded-3xl ${service.iconColor} p-4 flex flex-col items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}>
                  <service.icon className="w-9 h-9 text-white mb-2" />
                  <span className="text-xs text-white text-center font-semibold">{service.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Quick Access</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickAccessServices.map((service, index) => (
              <div 
                key={service.title} 
                onClick={() => navigate(service.route)}
                className="aspect-square transform hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`h-full rounded-3xl ${service.iconColor} p-4 flex flex-col items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all`}>
                  <service.icon className="w-9 h-9 text-white mb-2" />
                  <span className="text-xs text-white text-center font-semibold">{service.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent font-bold">
              Chatr Champions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Referral Code Display */}
            {referralCode && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Your Referral Code</p>
                <p className="text-xs text-muted-foreground">Your unique code</p>
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent tracking-wider">
                    {referralCode}
                  </p>
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Referral QR Code" className="w-48 h-48" />
                ) : referralCode ? (
                  <QRCodeSVG 
                    value={`https://chatr.chat/auth?ref=${referralCode}`}
                    size={192}
                    level="H"
                    includeMargin
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Scan to join with your code</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={copyReferralLink}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button
                onClick={shareReferralLink}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
              >
                <Share className="w-4 h-4" />
                Share
              </Button>
            </div>

            {/* Info */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4">
              <p className="text-sm text-center text-muted-foreground">
                Share your code and earn <span className="font-bold text-orange-600 dark:text-orange-400">₹50</span> per referral + network bonuses!
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setShowShareDialog(false);
                  navigate('/growth');
                }}
                className="w-full mt-2 text-orange-600 dark:text-orange-400"
              >
                View Full Dashboard →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

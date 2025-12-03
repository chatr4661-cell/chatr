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
  Zap,
  Briefcase,
  Crown
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { QuickAccessMenu } from '@/components/QuickAccessMenu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';


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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchSuggestions, setSearchSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  // Load recent searches from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Voice search using Web Speech API
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice search not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info('Listening... Speak now!');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
      
      // Auto search after voice input
      setTimeout(() => {
        handleSearch(transcript);
      }, 500);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error('Speech recognition error:', event.error);
      toast.error('Voice search failed. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Fetch AI search suggestions
  const fetchSuggestions = React.useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('search-suggestions', {
        body: { query, recentSearches }
      });

      if (error) throw error;
      setSearchSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [recentSearches]);

  // Debounce search suggestions
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchSuggestions(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  const handleSearch = (query?: string) => {
    const searchText = query || searchQuery;
    if (!searchText.trim()) return;

    // Save to recent searches
    const updated = [searchText, ...recentSearches.filter(s => s !== searchText)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));

    // Navigate to search
    navigate(`/search?q=${encodeURIComponent(searchText)}`);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const trendingSearches = [
    { query: 'Plumber near me', icon: '🔧' },
    { query: 'Biryani delivery', icon: '🍛' },
    { query: 'Doctor consultation', icon: '👨‍⚕️' },
    { query: 'Electrician services', icon: '⚡' },
    { query: 'Salon near me', icon: '💇' },
    { query: 'Home cleaning', icon: '🧹' },
    { query: 'Pizza delivery', icon: '🍕' },
    { query: 'AC repair', icon: '❄️' },
  ];

  React.useEffect(() => {
    let isCancelled = false;
    let authInitialized = false;
    
    const initAuth = async () => {
      if (authInitialized) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (isCancelled) return;
      
      authInitialized = true;
      
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!isCancelled && user) {
        setUser(user);
        setMounted(true);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isCancelled) return;
      
      // Prevent reload on token refresh
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      if (!session) {
        setUser(null);
        navigate('/auth', { replace: true });
      } else if (event === 'SIGNED_IN') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!isCancelled && user) {
            setUser(user);
            setMounted(true);
          }
        });
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Defer all heavy operations to after page is visible
  React.useEffect(() => {
    if (!user || !mounted) return;
    
    let cancelled = false;
    
    // CRITICAL: Use requestIdleCallback for non-critical operations
    // This prevents blocking the main thread during initial render
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (cancelled) return;
        loadPointsData();
        // Process daily login after points load
        setTimeout(() => {
          if (!cancelled) processDailyLogin();
        }, 500);
      });
      
      // Contact sync is non-critical - defer heavily
      requestIdleCallback(() => {
        setTimeout(() => {
          if (!cancelled) autoSyncContactsOnLoad(user.id);
        }, 60000); // 1 minute
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        if (cancelled) return;
        loadPointsData();
        setTimeout(() => {
          if (!cancelled) processDailyLogin();
        }, 500);
        setTimeout(() => {
          if (!cancelled) autoSyncContactsOnLoad(user.id);
        }, 60000);
      }, 300);
    }

    return () => {
      cancelled = true;
    };
  }, [user, mounted]);

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
      icon: MessageCircle,
      title: 'Chat',
      description: 'Messages, calls & video',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat'
    },
    {
      icon: Sparkles,
      title: 'AI Agents',
      description: 'Create your AI self',
      iconColor: 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600',
      route: '/ai-agents'
    },
    {
      icon: Zap,
      title: 'Chatr World',
      description: 'AI Search + Location',
      iconColor: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
      route: '/chatr-world'
    },
    {
      icon: Briefcase,
      title: 'Local Jobs',
      description: 'Jobs near you',
      iconColor: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600',
      route: '/local-jobs'
    },
    {
      icon: Stethoscope,
      title: 'Healthcare',
      description: 'Clinics & doctors nearby',
      iconColor: 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600',
      route: '/local-healthcare'
    },
    {
      icon: Search,
      title: 'Chatr Browser',
      description: 'Deep Multiverse Search Engine',
      iconColor: 'bg-gradient-to-br from-violet-400 to-purple-600',
      route: '/home'
    },
    {
      icon: Heart,
      title: 'Health Hub',
      description: 'AI assistant, vitals & reports',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-teal-600',
      route: '/health'
    },
    {
      icon: Stethoscope,
      title: 'Care Access',
      description: 'Book doctors & emergency',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/care'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Groups, stories & challenges',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-600',
      route: '/community'
    },
    {
      icon: Grid3x3,
      title: 'Chatr App',
      description: 'Discover & install apps',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/native-apps'
    },
    {
      icon: CheckCircle,
      title: 'Official',
      description: 'Verified accounts & services',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      route: '/official-accounts'
    },
    {
      icon: Building2,
      title: 'Business',
      description: 'CRM, inbox & analytics',
      iconColor: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      route: '/business'
    },
  ];

  const quickAccessServices = [
    {
      icon: Coins,
      title: 'ChatrPay Wallet',
      description: 'UPI, cashback & rewards',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-500',
      route: '/wallet'
    },
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
      icon: Utensils,
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
      icon: Crown,
      title: 'Chatr Premium',
      description: 'Upgrade to unlock everything',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-500',
      route: '/subscription',
      badge: '₹99/mo'
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
            <img 
              src={chatrIconLogo} 
              alt="Chatr" 
              className="h-12 w-12" 
              width={48}
              height={48}
              loading="eager" 
            />
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-cyan-500 bg-clip-text text-transparent">
                Chatr+
              </div>
              <div className="text-xs font-medium text-muted-foreground">The AI Superapp for India</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Chatr+ - The AI Superapp for India | Chat, Healthcare, Jobs & More"
        description="Chatr+ is India's all-in-one AI superapp. Chat with friends, find healthcare providers, discover local jobs, order food, and access 100+ services - all in one app."
        keywords="chatr, superapp, india, messaging app, healthcare app, job search, food delivery, AI assistant, local services, telemedicine"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          "name": "Chatr+",
          "description": "India's AI Superapp - Chat, Healthcare, Jobs & More",
          "applicationCategory": "LifestyleApplication",
          "operatingSystem": "Android, iOS, Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "10000"
          }
        }}
      />
      <div className="min-h-screen bg-background pb-0">{/* Removed pb-32 for full screen */}
      {/* Enhanced Header */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrIconLogo} alt="Chatr Logo" className="h-10 w-10" loading="eager" />
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-primary via-primary to-cyan-500 bg-clip-text text-transparent">
                Chatr+
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">The AI Superapp for India</div>
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
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="rounded-full h-9 w-9 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">

        {/* Search Bar - Compact */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-primary/20 p-3 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Find plumber, order biryani, dentist near me..."
                className="pl-9 pr-10 h-11 bg-background/80 backdrop-blur text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
              </button>
            </div>
            <Button onClick={() => handleSearch()} size="sm" className="h-11 px-4">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            AI-powered search across services, jobs, healthcare, food & more
          </p>
        </div>

        {/* Main Category Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {mainHubs.map((category, index) => (
            <button
              key={category.title}
              onClick={() => navigate(category.route)}
              className="group flex flex-col items-center gap-2 p-2.5 rounded-xl bg-card hover:bg-muted/50 border border-border/50 hover:border-primary/30 transition-all active:scale-95"
            >
              <div className={`w-12 h-12 rounded-xl ${category.iconColor} flex items-center justify-center shadow-md`}>
                <category.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight">
                {category.title}
              </span>
            </button>
          ))}
        </div>

        {/* Chatr Champions Card */}
        <ServiceCard
          icon={Flame}
          title="Chatr Champions"
          description="Referral network & earnings dashboard"
          iconColor="bg-gradient-to-br from-orange-400 to-red-500"
          route="/chatr-growth"
          badge="Earn ₹"
        />

        {/* Chatr Partner Card */}
        <ServiceCard
          icon={Users}
          title="Chatr Partner"
          description="Join our campus partner program"
          iconColor="bg-gradient-to-br from-purple-400 to-pink-500"
          route="/ambassador-program"
          badge="Apply"
        />

        {/* Doctor Portal Card */}
        <ServiceCard
          icon={Stethoscope}
          title="Doctor Portal"
          description="Healthcare provider registration"
          iconColor="bg-gradient-to-br from-cyan-400 to-blue-500"
          route="/doctor-onboarding"
          badge="Join"
        />

        {/* Ecosystem Section */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Ecosystem</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/food-ordering')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <Utensils className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">Food Ordering</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/local-deals')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <Percent className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">Local Deals</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/chatr-plus-subscribe')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-purple-400 to-pink-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <Crown className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">Chatr Premium</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mt-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Quick Access</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/chatr-wallet')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-green-400 to-teal-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <Coins className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">ChatrPay Wallet</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/chatr-studio')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-purple-400 to-pink-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <QrCode className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">Chatr Studio</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/ai-assistant')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <Bot className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">AI Assistant</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/emergency-services')}
              className="aspect-square transform hover:scale-105 transition-all duration-300 hover:shadow-xl col-span-1"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-red-400 to-rose-500 p-6 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                <AlertTriangle className="w-8 h-8 text-white mb-2" />
                <span className="text-sm text-white text-center font-semibold">Emergency</span>
              </div>
            </button>
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
    </>
  );
};

export default Index;

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Mic, 
  MessageCircle, 
  Phone, 
  Stethoscope, 
  Utensils,
  Briefcase,
  Percent,
  Heart,
  Brain,
  Sparkles,
  Gamepad2,
  Users,
  Wallet,
  Bell,
  Settings,
  ChevronRight,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';
import { AppleCard, AppleGroupedList, AppleListItem } from '@/components/ui/apple';
import { AppleSearchBar } from '@/components/ui/AppleInput';
import { AppleIconButton } from '@/components/ui/AppleButton';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

// Quick Actions Data
const quickActions = [
  { icon: MessageCircle, label: 'Chat', color: 'from-green-500 to-emerald-600', route: '/chat' },
  { icon: Phone, label: 'Call', color: 'from-blue-500 to-indigo-600', route: '/calls' },
  { icon: Stethoscope, label: 'Doctor', color: 'from-red-500 to-rose-600', route: '/local-healthcare' },
  { icon: Utensils, label: 'Food', color: 'from-orange-500 to-amber-600', route: '/food-ordering' },
  { icon: Briefcase, label: 'Jobs', color: 'from-emerald-500 to-teal-600', route: '/jobs' },
  { icon: Percent, label: 'Deals', color: 'from-purple-500 to-pink-600', route: '/local-deals' },
];

// Services Grid Data
const services = [
  { icon: Brain, label: 'AI Brain', color: 'from-cyan-500 to-blue-600', route: '/chat-ai' },
  { icon: Sparkles, label: 'AI Agents', color: 'from-violet-500 to-purple-600', route: '/ai-agents' },
  { icon: Heart, label: 'Health Hub', color: 'from-rose-500 to-pink-600', route: '/health' },
  { icon: Gamepad2, label: 'Games', color: 'from-indigo-500 to-purple-600', route: '/chatr-games' },
  { icon: Users, label: 'Community', color: 'from-blue-500 to-cyan-600', route: '/community' },
  { icon: Wallet, label: 'Wallet', color: 'from-amber-500 to-orange-600', route: '/chatr-wallet' },
  { icon: Zap, label: 'Chatr World', color: 'from-yellow-500 to-orange-600', route: '/chatr-world' },
  { icon: Settings, label: 'Settings', color: 'from-gray-500 to-slate-600', route: '/settings' },
];

export default function ChatrHome() {
  const navigate = useNavigate();
  const haptics = useNativeHaptics();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('Welcome');
  const [activityData, setActivityData] = useState({
    unreadChats: 0,
    appointments: 0,
    walletBalance: 0,
    notifications: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good evening');
    else setGreeting('Good night');
  }, []);

  // Fetch user data and activity
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const firstName = profile.full_name?.split(' ')[0] || profile.username || 'there';
          setUserName(firstName);
        }

        // Fetch activity counts
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        const { count: apptCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', user.id)
          .gte('appointment_date', new Date().toISOString());

        const { data: walletData } = await supabase
          .from('chatr_coin_balances')
          .select('total_coins')
          .eq('user_id', user.id)
          .maybeSingle();

        setActivityData({
          unreadChats: 0,
          appointments: apptCount || 0,
          walletBalance: walletData?.total_coins || 0,
          notifications: notifCount || 0
        });

        // Fetch recent conversations
        const { data: convs } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations!inner(id, updated_at, is_group, group_name)
          `)
          .eq('user_id', user.id)
          .order('conversations(updated_at)', { ascending: false })
          .limit(3);

        if (convs) {
          setRecentActivity(convs.map((c: any) => ({
            id: c.conversations.id,
            title: c.conversations.is_group ? (c.conversations.group_name || 'Group Chat') : 'Conversation',
            type: 'chat',
            route: `/chat/${c.conversations.id}`
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSearch = useCallback((searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    haptics.light();
    navigate(`/chatr-results?q=${encodeURIComponent(q)}`);
  }, [query, navigate, haptics]);

  const startVoiceSearch = () => {
    haptics.medium();
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice search not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      setTimeout(() => handleSearch(transcript), 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleQuickAction = (route: string) => {
    haptics.light();
    navigate(route);
  };

  const handleServicePress = (route: string) => {
    haptics.light();
    navigate(route);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-pt safe-area-pb">
        <div className="flex flex-col items-center gap-3">
          <img src={chatrIconLogo} alt="CHATR" className="w-16 h-16 animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 safe-area-pt">
      {/* Apple-style Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-pt">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrIconLogo} alt="CHATR" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="text-base font-bold text-foreground">{greeting}, {userName}!</p>
              <p className="text-xs text-muted-foreground">What would you like to do?</p>
            </div>
          </div>
          <div className="relative">
            <AppleIconButton 
              variant="ghost"
              icon={<Bell className="w-5 h-5" />}
              onClick={() => {
                haptics.light();
                navigate('/notifications');
              }}
            />
            {activityData.notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center pointer-events-none">
                {activityData.notifications > 9 ? '9+' : activityData.notifications}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-4">
        {/* Activity Widgets */}
        <div className="grid grid-cols-3 gap-3">
          <AppleCard 
            pressable 
            onClick={() => handleQuickAction('/chat')}
            className="flex flex-col items-center gap-1 p-3"
            padding="none"
          >
            <MessageCircle className="w-6 h-6 text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">Chats</span>
            <span className="text-sm font-bold text-primary">Open</span>
          </AppleCard>
          <AppleCard 
            pressable 
            onClick={() => handleQuickAction('/care')}
            className="flex flex-col items-center gap-1 p-3"
            padding="none"
          >
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <span className="text-[11px] font-medium text-muted-foreground">Appointments</span>
            <span className="text-sm font-bold text-blue-600">{activityData.appointments}</span>
          </AppleCard>
          <AppleCard 
            pressable 
            onClick={() => handleQuickAction('/chatr-wallet')}
            className="flex flex-col items-center gap-1 p-3"
            padding="none"
          >
            <Wallet className="w-6 h-6 text-amber-600" />
            <span className="text-[11px] font-medium text-muted-foreground">Balance</span>
            <span className="text-sm font-bold text-amber-600">₹{activityData.walletBalance.toLocaleString()}</span>
          </AppleCard>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.route)}
                className="flex flex-col items-center gap-1.5 min-w-[56px] group touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  "bg-gradient-to-br shadow-md group-hover:shadow-lg group-active:scale-90",
                  action.color
                )}>
                  <action.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Apple-style Search Bar */}
        <AppleCard variant="glass" className="p-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <AppleSearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search jobs, doctors, food..."
                onSubmit={() => handleSearch()}
                rightIcon={
                  <button
                    onClick={startVoiceSearch}
                    disabled={isListening}
                    className="p-1.5 rounded-full hover:bg-muted/50 transition-colors touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Mic className={cn("w-4 h-4", isListening ? "text-destructive animate-pulse" : "text-muted-foreground")} />
                  </button>
                }
              />
            </div>
          </div>
        </AppleCard>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Recent Activity</h2>
              <button 
                onClick={() => {
                  haptics.light();
                  navigate('/chat');
                }} 
                className="text-xs text-primary hover:underline touch-manipulation"
              >
                View all
              </button>
            </div>
            <AppleGroupedList>
              {recentActivity.map((item, index) => (
                <AppleListItem
                  key={item.id}
                  leading={
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                  }
                  title={item.title}
                  subtitle="Tap to continue"
                  chevron
                  onClick={() => handleQuickAction(item.route)}
                  last={index === recentActivity.length - 1}
                />
              ))}
            </AppleGroupedList>
          </div>
        )}

        {/* All Services Grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">All Services</h2>
          <div className="grid grid-cols-4 gap-3">
            {services.map((service) => (
              <AppleCard
                key={service.label}
                pressable
                onClick={() => handleServicePress(service.route)}
                className="flex flex-col items-center gap-2 p-3"
                padding="none"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md",
                  service.color
                )}>
                  <service.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight">{service.label}</span>
              </AppleCard>
            ))}
          </div>
        </div>

        {/* Trust Banner */}
        <AppleCard variant="glass" className="flex items-center gap-4 p-4">
          <Shield className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Secure & Private</p>
            <p className="text-xs text-muted-foreground">Your data stays with you. Always.</p>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <div className="text-center">
              <div className="font-bold text-primary">AI</div>
              <div>Powered</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-primary">24/7</div>
              <div>Available</div>
            </div>
          </div>
        </AppleCard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

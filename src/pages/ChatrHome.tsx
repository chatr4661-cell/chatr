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
  Clock,
  TrendingUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';
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

// Trending searches
const trendingSearches = [
  'plumber near me', 'doctor available now', 'biryani delivery', 
  'AC repair', 'yoga classes', 'job openings'
];

export default function ChatrHome() {
  const navigate = useNavigate();
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
    navigate(`/chatr-results?q=${encodeURIComponent(q)}`);
  }, [query, navigate]);

  const startVoiceSearch = () => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src={chatrIconLogo} alt="CHATR" className="w-16 h-16 animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={chatrIconLogo} alt="CHATR" className="w-10 h-10" />
            <div>
              <p className="text-base font-bold text-foreground">{greeting}, {userName}!</p>
              <p className="text-xs text-muted-foreground">What would you like to do?</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {activityData.notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activityData.notifications > 9 ? '9+' : activityData.notifications}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-4">
        {/* Activity Widgets */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all"
          >
            <MessageCircle className="w-6 h-6 text-green-600" />
            <span className="text-[11px] font-medium text-muted-foreground">Chats</span>
            <span className="text-sm font-bold text-green-600">Open</span>
          </button>
          <button
            onClick={() => navigate('/care')}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all"
          >
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <span className="text-[11px] font-medium text-muted-foreground">Appointments</span>
            <span className="text-sm font-bold text-blue-600">{activityData.appointments}</span>
          </button>
          <button
            onClick={() => navigate('/chatr-wallet')}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all"
          >
            <Wallet className="w-6 h-6 text-amber-600" />
            <span className="text-[11px] font-medium text-muted-foreground">Balance</span>
            <span className="text-sm font-bold text-amber-600">₹{activityData.walletBalance.toLocaleString()}</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Quick Actions</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="flex flex-col items-center gap-1.5 min-w-[56px] group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  "bg-gradient-to-br shadow-md group-hover:shadow-lg group-hover:scale-105 group-active:scale-95",
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

        {/* Search Bar */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-primary/20 p-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search jobs, doctors, food, services..."
                className="pl-9 pr-10 h-11 bg-background/80 backdrop-blur text-sm"
              />
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <Mic className={cn("w-4 h-4", isListening ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
              </button>
            </div>
            <Button onClick={() => handleSearch()} size="sm" className="h-11 px-4">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Trending Searches */}
        <div className="flex gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {trendingSearches.slice(0, 4).map((term) => (
            <button
              key={term}
              onClick={() => handleSearch(term)}
              className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Recent Activity</h2>
              <button onClick={() => navigate('/chat')} className="text-xs text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.route)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Tap to continue</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Services Grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">All Services</h2>
          <div className="grid grid-cols-4 gap-3">
            {services.map((service) => (
              <button
                key={service.label}
                onClick={() => navigate(service.route)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 hover:border-primary/30 transition-all active:scale-95"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md",
                  service.color
                )}>
                  <service.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight">{service.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Banner */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-2xl border border-primary/10 p-4 flex items-center gap-4">
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
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

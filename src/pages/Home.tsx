import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Mic, MessageCircle, Phone, Stethoscope, Utensils,
  Briefcase, Percent, Heart, Brain, Sparkles, Gamepad2,
  Users, Wallet, Bell, Settings, ChevronRight, Zap, Shield,
  TrendingUp, Calendar, ArrowRight, Store, Building2, Crown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';
import { SEOHead } from '@/components/SEOHead';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

// Quick Actions - Circular buttons
const quickActions = [
  { icon: MessageCircle, label: 'Chat', color: 'from-green-500 to-emerald-600', route: '/chat' },
  { icon: Phone, label: 'Call', color: 'from-blue-500 to-indigo-600', route: '/calls' },
  { icon: Stethoscope, label: 'Doctor', color: 'from-red-500 to-rose-600', route: '/local-healthcare' },
  { icon: Utensils, label: 'Food', color: 'from-orange-500 to-amber-600', route: '/food-ordering' },
  { icon: Briefcase, label: 'Jobs', color: 'from-emerald-500 to-teal-600', route: '/jobs' },
  { icon: Percent, label: 'Deals', color: 'from-purple-500 to-pink-600', route: '/local-deals' },
];

// Main Services Grid
const mainServices = [
  { icon: Brain, label: 'AI Brain', desc: 'Unified AI Assistant', color: 'from-cyan-500 to-blue-600', route: '/chat-ai' },
  { icon: Sparkles, label: 'AI Agents', desc: 'Create your AI self', color: 'from-violet-500 to-purple-600', route: '/ai-agents' },
  { icon: Heart, label: 'Health Hub', desc: 'Vitals & Reports', color: 'from-rose-500 to-pink-600', route: '/health' },
  { icon: Stethoscope, label: 'Care Access', desc: 'Book doctors', color: 'from-blue-500 to-indigo-600', route: '/care' },
  { icon: Gamepad2, label: 'Games', desc: 'AI-native games', color: 'from-indigo-500 to-purple-600', route: '/chatr-games' },
  { icon: Users, label: 'Community', desc: 'Groups & Stories', color: 'from-blue-500 to-cyan-600', route: '/community' },
  { icon: Zap, label: 'Chatr World', desc: 'AI Search Engine', color: 'from-yellow-500 to-orange-600', route: '/chatr-world' },
  { icon: Store, label: 'Marketplace', desc: 'Buy & Sell', color: 'from-teal-500 to-emerald-600', route: '/marketplace' },
  { icon: Wallet, label: 'ChatrPay', desc: 'UPI & Rewards', color: 'from-amber-500 to-orange-600', route: '/chatr-wallet' },
  { icon: Building2, label: 'Business', desc: 'CRM & Analytics', color: 'from-slate-500 to-gray-600', route: '/business' },
  { icon: Crown, label: 'Premium', desc: 'Unlock all features', color: 'from-amber-400 to-yellow-500', route: '/chatr-plus-subscribe' },
  { icon: Settings, label: 'Settings', desc: 'Account & Prefs', color: 'from-gray-500 to-slate-600', route: '/settings' },
];

// Trending searches
const trendingSearches = [
  'plumber near me', 'doctor now', 'biryani delivery', 
  'AC repair', 'job openings', 'yoga classes'
];

const Home = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('Welcome');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState({
    unreadChats: 0,
    appointments: 0,
    walletBalance: 0,
    notifications: 0
  });
  const [recentChats, setRecentChats] = useState<any[]>([]);

  // Time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good evening');
    else setGreeting('Good night');
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setIsAuthenticated(true);
          
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            const firstName = profile.full_name?.split(' ')[0] || profile.username || 'there';
            setUserName(firstName);
          }

          // Fetch activity counts in parallel
          const [notifRes, apptRes, walletRes, chatsRes] = await Promise.all([
            supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false),
            supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('patient_id', user.id)
              .gte('appointment_date', new Date().toISOString()),
            supabase
              .from('chatr_coin_balances')
              .select('total_coins')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('conversation_participants')
              .select(`
                conversation_id,
                conversations!inner(id, updated_at, is_group, group_name)
              `)
              .eq('user_id', user.id)
              .order('conversations(updated_at)', { ascending: false })
              .limit(3)
          ]);

          setActivityData({
            unreadChats: 0,
            appointments: notifRes.count || 0,
            walletBalance: walletRes.data?.total_coins || 0,
            notifications: notifRes.count || 0
          });

          if (chatsRes.data) {
            setRecentChats(chatsRes.data.map((c: any) => ({
              id: c.conversations.id,
              title: c.conversations.is_group ? (c.conversations.group_name || 'Group Chat') : 'Conversation',
              route: `/chat/${c.conversations.id}`
            })));
          }
        } else {
          setUserName('there');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = useCallback((searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
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
    <>
      <SEOHead
        title="Chatr+ - The AI Superapp for India"
        description="Chat, healthcare, jobs, food delivery, and 100+ AI-powered services in one app."
        keywords="chatr, superapp, india, AI, healthcare, jobs, messaging"
      />
      
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={chatrIconLogo} alt="CHATR" className="w-10 h-10" />
              <div>
                <p className="text-base font-bold text-foreground">
                  {greeting}, {userName}!
                </p>
                <p className="text-xs text-muted-foreground">What would you like to do?</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isAuthenticated && (
                <Button size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              )}
              {isAuthenticated && (
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
              )}
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 space-y-5 mt-4">
          {/* Activity Widgets - Only for authenticated users */}
          {isAuthenticated && (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 hover:border-green-500/40 transition-all active:scale-95"
              >
                <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <span className="text-[11px] font-medium text-muted-foreground">Chats</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">Open</span>
              </button>
              <button
                onClick={() => navigate('/care')}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all active:scale-95"
              >
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] font-medium text-muted-foreground">Appointments</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{activityData.appointments}</span>
              </button>
              <button
                onClick={() => navigate('/chatr-wallet')}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-95"
              >
                <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-medium text-muted-foreground">Balance</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{activityData.walletBalance.toLocaleString()}</span>
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.route)}
                  className="flex flex-col items-center gap-1.5 min-w-[52px] group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                    "bg-gradient-to-br shadow-lg group-hover:shadow-xl group-hover:scale-110 group-active:scale-95",
                    action.color
                  )}>
                    <action.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-primary/20 p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search jobs, doctors, food, services..."
                  className="pl-11 pr-11 h-12 bg-background/80 backdrop-blur text-base rounded-xl"
                />
                <button
                  onClick={startVoiceSearch}
                  disabled={isListening}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <Mic className={cn("w-5 h-5", isListening ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                </button>
              </div>
              <Button onClick={() => handleSearch()} size="lg" className="h-12 px-5 rounded-xl">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Recent Chats - Only if authenticated and has chats */}
          {isAuthenticated && recentChats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Continue Chatting</h2>
                <button onClick={() => navigate('/chat')} className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => navigate(chat.route)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 transition-all active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
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
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">All Services</h2>
            <div className="grid grid-cols-4 gap-3">
              {mainServices.map((service) => (
                <button
                  key={service.label}
                  onClick={() => navigate(service.route)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 hover:border-primary/30 transition-all active:scale-95"
                >
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md",
                    service.color
                  )}>
                    <service.icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-center leading-tight line-clamp-1">{service.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trust Banner */}
          <div className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-2xl border border-primary/10 p-4 flex items-center gap-4">
            <Shield className="w-10 h-10 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Secure & Private</p>
              <p className="text-xs text-muted-foreground">Your data stays with you. Always.</p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="font-bold text-primary text-sm">AI</div>
                <div>Powered</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-primary text-sm">24/7</div>
                <div>Available</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-primary text-sm">100+</div>
                <div>Services</div>
              </div>
            </div>
          </div>

          {/* CTA for non-authenticated users */}
          {!isAuthenticated && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Join Chatr+ for Free</p>
                  <p className="text-xs text-muted-foreground">Unlock unlimited searches & all features</p>
                </div>
                <Button onClick={() => navigate('/auth')} className="bg-green-600 hover:bg-green-700">
                  Sign Up <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </>
  );
};

export default Home;

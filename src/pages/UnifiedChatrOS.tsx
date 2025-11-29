import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Bot, Zap, Briefcase, Heart, 
  Stethoscope, LayoutGrid, Shield, Globe, Search,
  Users, Sun, Cloud, CloudRain, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { SEOHead } from '@/components/SEOHead';

interface AppIcon {
  id: string;
  name: string;
  icon: any;
  route: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
}

const appIcons: AppIcon[] = [
  { id: 'chat', name: 'Chat', icon: MessageSquare, route: '/chats', color: 'from-teal-400 to-teal-600' },
  { id: 'ai-search', name: 'AI Search', icon: Search, route: '/ai-browser-home', color: 'from-purple-400 to-purple-600' },
  { id: 'mini-apps', name: 'Mini Apps', icon: LayoutGrid, route: '/native-apps', color: 'from-purple-500 to-purple-700' },
  { id: 'browser', name: 'Browser', icon: Globe, route: '/ai-browser-home', color: 'from-blue-400 to-blue-600' },
  { id: 'health-hub', name: 'Health Hub', icon: Heart, route: '/health', color: 'from-teal-500 to-teal-700' },
  { id: 'local-jobs', name: 'Local Jobs', icon: Briefcase, route: '/local-jobs', color: 'from-orange-400 to-orange-600' },
  { id: 'community', name: 'Community', icon: Users, route: '/community', color: 'from-pink-400 to-pink-600' },
  { id: 'chatr', name: 'Chatr', icon: MessageSquare, route: '/chats', color: 'from-teal-400 to-teal-600' },
  { id: 'care-access', name: 'Care Access', icon: Shield, route: '/care-access', color: 'from-cyan-400 to-cyan-600' },
  { id: 'ai-assistant', name: 'AI Assistant', icon: Bot, route: '/ai-agents', color: 'from-blue-500 to-blue-700' },
];

const categories: Category[] = [
  { id: 'chat', name: 'Chat', icon: MessageSquare },
  { id: 'ai-agents', name: 'AI Agents', icon: Bot },
  { id: 'chatr-world', name: 'Chatr World', icon: Zap },
  { id: 'local-jobs', name: 'Local Jobs', icon: Briefcase },
  { id: 'healthcare', name: 'Healthcare', icon: Stethoscope },
  { id: 'mini-apps', name: 'Mini Apps', icon: LayoutGrid },
  { id: 'health-hub', name: 'Health Hub', icon: Heart },
  { id: 'care-access', name: 'Care Access', icon: Shield },
  { id: 'browser', name: 'Browser', icon: Globe },
];

export default function UnifiedChatrOS() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [time, setTime] = useState(new Date());
  const [weather] = useState({ temp: 72, location: 'Columbus', condition: 'sunny' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredApps = appIcons.filter(app => 
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAppClick = (route: string) => {
    navigate(route);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const WeatherIcon = weather.condition === 'sunny' ? Sun : weather.condition === 'cloudy' ? Cloud : CloudRain;

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <SEOHead 
          title="Chatr OS — The AI Desktop for Everyone"
          description="Experience Chatr OS, the next-generation AI operating system. Access AI agents, chat, search, mini apps, and more from one unified interface."
          keywords="Chatr OS, AI Desktop, AI Operating System, Chatr Launcher, AI Interface"
        />
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-100 p-4">
          <div className="max-w-lg mx-auto">
            {/* Mobile Header */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-4 border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Chatr OS</h1>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
                  {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>

              {/* Weather Widget */}
              <div className="flex items-center gap-3 bg-gradient-to-br from-yellow-400 to-orange-400 text-white rounded-2xl px-4 py-3 shadow-lg mb-4">
                <WeatherIcon className="h-8 w-8" />
                <div>
                  <div className="text-2xl font-bold">{weather.temp}°</div>
                  <div className="text-sm opacity-90">{weather.location}</div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search apps..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg"
                />
              </div>

              {/* Chatr Points */}
              <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white rounded-2xl shadow-lg">
                + Chatr Points
              </Button>
            </div>

            {/* Sidebar (Mobile Overlay) */}
            {sidebarOpen && (
              <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)}>
                <div className="bg-white/90 backdrop-blur-xl w-64 h-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4">Categories</h2>
                  <div className="space-y-2">
                    {categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/60 transition-all"
                        >
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-lg">
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-gray-900">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* App Grid (2 columns on mobile) */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/50">
              <div className="grid grid-cols-2 gap-6">
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleAppClick(app.route)}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className={`h-20 w-20 rounded-full bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-all duration-300`}>
                        <Icon className="h-10 w-10" />
                      </div>
                      <span className="font-medium text-gray-900 text-center text-sm">{app.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Clock */}
              <div className="mt-8 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-1">{formatTime(time)}</div>
                <div className="text-sm text-gray-600">{formatDate(time)}</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop Layout
  return (
    <>
      <SEOHead 
        title="Chatr OS — The AI Desktop for Everyone"
        description="Experience Chatr OS, the next-generation AI operating system. Access AI agents, chat, search, mini apps, and more from one unified interface."
        keywords="Chatr OS, AI Desktop, AI Operating System, Chatr Launcher, AI Interface"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-12 border border-white/50">
            
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold text-gray-900 mb-2">Chatr Desktop</h1>
              </div>
              
              {/* Weather Widget */}
              <div className="flex items-center gap-3 bg-gradient-to-br from-yellow-400 to-orange-400 text-white rounded-2xl px-6 py-4 shadow-lg">
                <WeatherIcon className="h-10 w-10" />
                <div>
                  <div className="text-3xl font-bold">{weather.temp}°</div>
                  <div className="text-sm opacity-90">{weather.location}</div>
                </div>
              </div>
            </div>

            {/* Search Bar & Points */}
            <div className="flex items-center gap-4 mb-12">
              <div className="flex-1 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search the web or apps..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-14 h-16 text-lg rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-lg"
                />
              </div>
              <Button className="h-16 px-8 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white rounded-2xl shadow-lg text-lg font-semibold">
                + Chatr Points
              </Button>
            </div>

            <div className="flex gap-8">
              {/* Left Sidebar */}
              <div className="w-64 space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/60 transition-all duration-200 text-left group"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* App Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-8">
                  {filteredApps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        onClick={() => handleAppClick(app.route)}
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-all duration-300`}>
                          <Icon className="h-12 w-12" />
                        </div>
                        <span className="font-medium text-gray-900 text-center">{app.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Clock Widget */}
                <div className="mt-16 text-right">
                  <div className="text-7xl font-bold text-gray-900 mb-2">{formatTime(time)}</div>
                  <div className="text-xl text-gray-600">{formatDate(time)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

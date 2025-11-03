import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Heart, 
  Stethoscope, 
  Users, 
  Grid3x3, 
  CheckCircle, 
  Building2,
  Coins,
  Share2,
  Bot,
  AlertTriangle,
  Flame,
  QrCode,
  Globe
} from 'lucide-react';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';
import { Button } from '@/components/ui/button';

interface LauncherHomeProps {
  pointsBalance: number;
  currentStreak: number;
  onShareClick: () => void;
  onSignOut: () => void;
}

export const LauncherHome: React.FC<LauncherHomeProps> = ({
  pointsBalance,
  currentStreak,
  onShareClick,
  onSignOut
}) => {
  const navigate = useNavigate();

  const mainHubs = [
    {
      icon: MessageCircle,
      title: 'Chat',
      description: 'Messages, calls & video',
      iconColor: 'bg-gradient-to-br from-green-400 to-emerald-600',
      route: '/chat',
    },
    {
      icon: Heart,
      title: 'Health Hub',
      description: 'AI assistant, vitals & reports',
      iconColor: 'bg-gradient-to-br from-emerald-400 to-teal-600',
      route: '/health',
    },
    {
      icon: Stethoscope,
      title: 'Care Access',
      description: 'Book doctors & emergency',
      iconColor: 'bg-gradient-to-br from-blue-400 to-indigo-600',
      route: '/care',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Groups, stories & challenges',
      iconColor: 'bg-gradient-to-br from-purple-400 to-pink-600',
      route: '/community',
    },
    {
      icon: Grid3x3,
      title: 'Mini-Apps',
      description: 'Discover & install apps',
      iconColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      route: '/mini-apps',
    },
    {
      icon: CheckCircle,
      title: 'Official',
      description: 'Verified accounts & services',
      iconColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      route: '/official-accounts',
    },
    {
      icon: Building2,
      title: 'Business',
      description: 'CRM, inbox & analytics',
      iconColor: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      route: '/business',
    },
  ];

  const quickAccessServices = [
    {
      icon: Globe,
      title: 'AI Browser',
      description: 'Search & browse with AI assistance',
      iconColor: 'bg-gradient-to-br from-blue-400 to-cyan-500',
      route: '/ai-browser-home'
    },
    {
      icon: QrCode,
      title: 'Chatr Growth',
      description: 'Earn rewards & invite friends',
      iconColor: 'bg-gradient-to-br from-slate-400 to-slate-600',
      route: '/growth'
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

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
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
          </div>
        </div>
      </div>

      {/* Main Feature Hubs */}
      <div className="grid grid-cols-1 gap-3">
        {mainHubs.map((hub, index) => (
          <div 
            key={hub.title} 
            onClick={() => navigate(hub.route)}
            className="relative cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
            role="button"
            tabIndex={0}
          >
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className={`${hub.iconColor} p-3 rounded-2xl shadow-lg`}>
                  <hub.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base text-foreground">{hub.title}</h3>
                  <p className="text-xs text-muted-foreground">{hub.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground px-2">Quick Access</h3>
        {quickAccessServices.map((service) => (
          <div
            key={service.title}
            onClick={() => navigate(service.route)}
            className="cursor-pointer hover:scale-[1.02] transition-all"
          >
            <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/40 hover:border-border transition-all">
              <div className="flex items-center gap-3">
                <div className={`${service.iconColor} p-2 rounded-xl`}>
                  <service.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-foreground">{service.title}</h4>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

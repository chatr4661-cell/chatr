import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  X,
  Phone, 
  Video, 
  Coins,
  Search,
  Image,
  Pin,
  BellOff,
  Palette,
  Download,
  Clock,
  Languages,
  Lock,
  ShieldCheck,
  ChevronRight,
  Eye,
  CheckCheck,
  FileDown,
  Sparkles,
  Flag,
  Users,
  ShieldAlert
} from 'lucide-react';

interface ContactInfoScreenProps {
  contact: {
    id: string;
    username: string;
    avatar_url?: string;
    phone_number?: string;
    status?: string;
  };
  onClose?: () => void;
  onCall?: (type: 'voice' | 'video') => void;
}

export const ContactInfoScreen: React.FC<ContactInfoScreenProps> = ({
  contact,
  onClose,
  onCall
}) => {
  const navigate = useNavigate();
  const [lockChat, setLockChat] = React.useState(false);
  const [stealthMode, setStealthMode] = React.useState(false);
  const [readReceipts, setReadReceipts] = React.useState(true);
  const [disappearingTime, setDisappearingTime] = React.useState<'off' | '24h' | '7d' | '30d'>('off');

  const isOnline = contact.status === 'online' || false;

  const quickActions = [
    { icon: Phone, label: 'Voice', onClick: () => onCall?.('voice') },
    { icon: Video, label: 'Video', onClick: () => onCall?.('video') },
    { icon: Coins, label: 'Send Coin', onClick: () => navigate('/qr-payment') },
    { icon: Search, label: 'Search', onClick: () => {} },
  ];

  const chatControls = [
    { icon: Image, label: 'Media, Links & Docs', value: 'None', onClick: () => {} },
    { icon: Pin, label: 'Pinned Messages', value: 'None', onClick: () => {} },
    { icon: BellOff, label: 'Mute Notifications', onClick: () => {} },
    { icon: Palette, label: 'Chat Theme', onClick: () => {} },
    { icon: Download, label: 'Save Media to Gallery', value: 'Auto', onClick: () => {} },
  ];

  const translationTools = [
    { icon: Languages, label: 'Translate Chat Language', value: 'Auto → English', onClick: () => {} },
    { icon: FileDown, label: 'Export Chat / Backup', onClick: () => {} },
    { icon: Sparkles, label: 'AI Summary', subtitle: 'Generate key points from conversation', onClick: () => {} },
  ];

  const advancedOptions = [
    { icon: Flag, label: 'Report / Block', onClick: () => {} },
    { icon: Users, label: 'Shared Groups', value: '3 groups', onClick: () => {} },
    { icon: ShieldAlert, label: 'Trust Level', value: 'Verified', onClick: () => {} },
  ];

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
      {icon}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );

  const MenuItem = ({ item }: { item: any }) => (
    <button
      onClick={item.onClick}
      className="w-full flex items-center justify-between px-4 py-4 bg-card hover:bg-accent/50 transition-all rounded-xl mb-2 mx-2 shadow-sm border border-border/50"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <item.icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-foreground font-medium">{item.label}</span>
          {item.subtitle && (
            <span className="text-sm text-muted-foreground">{item.subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.value && (
          <span className="text-muted-foreground text-sm">{item.value}</span>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-primary via-primary/80 to-primary/60 pb-8 pt-4 px-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-primary-foreground">Profile Overview</h1>
          <div className="w-10" />
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {/* Animated Ring */}
            <div className={`absolute inset-0 rounded-full ${isOnline ? 'animate-pulse bg-green-500/30' : 'bg-muted/30'} blur-lg`} />
            <div className={`absolute inset-0 rounded-full border-4 ${isOnline ? 'border-green-500' : 'border-muted'}`} />
            <Avatar className="w-32 h-32 relative">
              <AvatarImage src={contact.avatar_url} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-3xl">
                {contact.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            {isOnline && (
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-primary" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-primary-foreground mb-1">
            {contact.username || contact.phone_number || 'Chatr User'}
          </h2>
          <p className="text-primary-foreground/80 text-sm mb-1">
            ~{contact.username || 'username'}
          </p>
          <p className="text-primary-foreground/70 text-xs italic">
            "Building meaningful connections 💬"
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-all backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <action.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs text-primary-foreground font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-4 pb-6">
        {/* Chat Controls Section */}
        <SectionHeader icon={<span className="text-lg">💬</span>} title="Chat Controls" />
        <div className="py-2">
          {chatControls.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </div>

        {/* Privacy & Security Section */}
        <SectionHeader icon={<span className="text-lg">🔒</span>} title="Privacy & Security" />
        <div className="py-2 px-2">
          {/* Disappearing Messages */}
          <div className="bg-card rounded-xl p-4 mb-2 shadow-sm border border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium">Disappearing Messages</span>
            </div>
            <div className="flex gap-2 flex-wrap ml-13">
              {['off', '24h', '7d', '30d'].map((time) => (
                <Button
                  key={time}
                  size="sm"
                  variant={disappearingTime === time ? 'default' : 'outline'}
                  onClick={() => setDisappearingTime(time as any)}
                  className="rounded-full"
                >
                  {time === 'off' ? 'Off' : time === '24h' ? '24 hrs' : time === '7d' ? '7 days' : '30 days'}
                </Button>
              ))}
            </div>
          </div>

          {/* Lock Chat */}
          <div className="bg-card rounded-xl p-4 mb-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-foreground font-medium block">Lock Chat</span>
                  <span className="text-xs text-muted-foreground">Face ID / PIN</span>
                </div>
              </div>
              <Switch checked={lockChat} onCheckedChange={setLockChat} />
            </div>
          </div>

          {/* Stealth Mode */}
          <div className="bg-card rounded-xl p-4 mb-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-foreground font-medium block">Stealth Mode</span>
                  <span className="text-xs text-muted-foreground">Hide online & typing status</span>
                </div>
              </div>
              <Switch checked={stealthMode} onCheckedChange={setStealthMode} />
            </div>
          </div>

          {/* Read Receipts */}
          <div className="bg-card rounded-xl p-4 mb-2 shadow-sm border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">Read Receipts</span>
              </div>
              <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
          </div>
        </div>

        {/* Translation & Tools Section */}
        <SectionHeader icon={<span className="text-lg">🌍</span>} title="Translation & Tools" />
        <div className="py-2">
          {translationTools.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </div>

        {/* Advanced Options Section */}
        <SectionHeader icon={<span className="text-lg">⚙️</span>} title="Advanced Options" />
        <div className="py-2">
          {advancedOptions.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </div>

        {/* Encryption Info */}
        <div className="px-4 mt-4">
          <div className="bg-card/50 rounded-xl p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground mb-1">End-to-End Encrypted</div>
                <div className="text-xs text-muted-foreground">
                  Messages and calls are end-to-end encrypted. Tap to verify security code.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  X,
  Phone, 
  Video, 
  DollarSign,
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
  ShieldAlert,
  MoreHorizontal,
  Bookmark,
  Link2
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
    { icon: DollarSign, label: 'Send Coin', onClick: () => navigate('/qr-payment') },
    { icon: Search, label: 'Chat Search', onClick: () => {} },
  ];

  const chatControls = [
    { icon: Image, label: 'Media, Links & Docs', onClick: () => {} },
    { icon: Pin, label: 'Pinned Messages', onClick: () => {} },
    { icon: BellOff, label: 'Mute Notifications', onClick: () => {} },
    { icon: Palette, label: 'Chat Theme', hasToggle: true, onClick: () => {} },
    { icon: Bookmark, label: 'Save Media to Gallery', onClick: () => {} },
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

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-6 py-3 mt-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );

  const MenuItem = ({ item }: { item: any }) => (
    <button
      onClick={item.onClick}
      className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <item.icon className="w-5 h-5 text-primary" strokeWidth={2.5} />
        <div className="flex flex-col items-start">
          <span className="text-foreground font-normal text-[15px]">{item.label}</span>
          {item.subtitle && (
            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.hasToggle ? (
          <Switch />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-[#A8DDD8]">
      {/* Header with Profile */}
      <div className="relative bg-[#A8DDD8] pt-4 pb-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-foreground hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="w-10" />
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            {/* Cyan Ring */}
            <div className="absolute -inset-3 rounded-full border-[3px] border-[#5FD4D0]" />
            <Avatar className="w-[140px] h-[140px] relative">
              <AvatarImage src={contact.avatar_url} />
              <AvatarFallback className="bg-white text-foreground text-4xl font-semibold">
                {contact.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h2 className="text-[28px] font-bold text-foreground mb-0.5 tracking-tight">
            {contact.username?.toUpperCase() || 'CHATR USER'}
          </h2>
          <p className="text-foreground/70 text-[15px] mb-1">
            @{contact.username || 'username'}
          </p>
          
          {/* Phone Number */}
          {contact.phone_number && (
            <p className="text-foreground/60 text-sm mb-2">
              {contact.phone_number}
            </p>
          )}
          
          <div className="flex items-center gap-2">
            <p className="text-foreground/80 text-[15px]">
              Building meaningful connections
            </p>
            <button className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <MoreHorizontal className="w-4 h-4 text-foreground/60" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-[60px] h-[60px] rounded-full bg-white/70 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all">
                <action.icon className="w-6 h-6 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-[13px] text-foreground font-normal">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-[#E8F5F4] rounded-t-3xl">
        {/* Chat Controls Section */}
        <SectionHeader title="Chat Controls" />
        <div className="bg-white/60 mx-4 rounded-2xl overflow-hidden mb-4">
          {chatControls.map((item, index) => (
            <div key={index}>
              <MenuItem item={item} />
              {index < chatControls.length - 1 && (
                <div className="border-b border-gray-200/50 mx-6" />
              )}
            </div>
          ))}
        </div>

        {/* Privacy & Security Section */}
        <SectionHeader title="Privacy & Security" />
        <div className="bg-white/60 mx-4 rounded-2xl overflow-hidden mb-4">
          {/* Disappearing Messages */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-foreground font-normal text-[15px]">Disappearing Messages</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'off', label: 'Off' },
                { value: '24h', label: '24 hrs' },
                { value: '7d', label: '74 days' }
              ].map((time) => (
                <Button
                  key={time.value}
                  size="sm"
                  variant={disappearingTime === time.value ? 'default' : 'outline'}
                  onClick={() => setDisappearingTime(time.value as any)}
                  className="rounded-full text-xs px-4 h-7 border-gray-300"
                >
                  {time.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-200/50 mx-6" />

          {/* Lock Chat */}
          <div className="px-6 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-foreground font-normal text-[15px] block">Lock Chat</span>
              </div>
              <span className="text-primary text-sm mr-2">Face ID / PIN</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="border-b border-gray-200/50 mx-6" />

          {/* Stealth Mode */}
          <div className="px-6 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-normal text-[15px]">Stealth Mode</span>
              <Switch checked={stealthMode} onCheckedChange={setStealthMode} />
            </div>
          </div>

          <div className="border-b border-gray-200/50 mx-6" />

          {/* Read Receipts */}
          <div className="px-6 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-normal text-[15px]">Read Receipts</span>
              <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
          </div>
        </div>

        {/* Translation & Tools Section */}
        <SectionHeader title="Translation & Tools" />
        <div className="bg-white/60 mx-4 rounded-2xl overflow-hidden mb-20">
          {translationTools.map((item, index) => (
            <div key={index}>
              <MenuItem item={item} />
              {index < translationTools.length - 1 && (
                <div className="border-b border-gray-200/50 mx-6" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

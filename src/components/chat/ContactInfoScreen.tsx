import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAIChatAssistant } from '@/hooks/useAIChatAssistant';
import { toast } from 'sonner';
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
  const { generateSummary, loading: summaryLoading } = useAIChatAssistant();
  const [lockChat, setLockChat] = React.useState(false);
  const [stealthMode, setStealthMode] = React.useState(false);
  const [readReceipts, setReadReceipts] = React.useState(true);
  const [disappearingTime, setDisappearingTime] = React.useState<'off' | '24h' | '7d' | '30d'>('off');
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summaryText, setSummaryText] = React.useState<string | null>(null);

  const handleAISummary = async () => {
    setSummaryOpen(true);
    setSummaryText(null);
    toast.loading('Generating AI summary...');
    
    // Mock messages - in real app, fetch from conversation
    const mockMessages = [
      { sender_name: contact.username, content: 'Hey, how are you?' },
      { sender_name: 'You', content: 'Good! Just working on the app.' }
    ];
    
    const summary = await generateSummary(mockMessages, 'brief');
    if (summary) {
      setSummaryText(summary);
      toast.dismiss();
    }
  };

  const isOnline = contact.status === 'online' || false;

  const quickActions = [
    { icon: Phone, label: 'Voice', onClick: () => onCall?.('voice') },
    { icon: Video, label: 'Video', onClick: () => onCall?.('video') },
    { icon: DollarSign, label: 'Send Coin', onClick: () => navigate('/qr-payment') },
    { icon: Search, label: 'Chat Search', onClick: () => {} },
  ];

  const chatControls = [
    { icon: Image, label: 'Media, Links & Docs', onClick: () => toast.info('Media viewer coming soon') },
    { icon: Pin, label: 'Pinned Messages', onClick: () => toast.info('Pinned messages feature coming soon') },
    { icon: BellOff, label: 'Mute Notifications', onClick: () => toast.info('Notification settings coming soon') },
    { icon: Palette, label: 'Chat Theme', onClick: () => toast.info('Theme customization coming soon') },
    { icon: Bookmark, label: 'Save Media to Gallery', onClick: () => toast.info('Gallery save feature coming soon') },
  ];

  const translationTools = [
    { icon: Languages, label: 'Translate Chat Language', onClick: () => toast.info('Translation settings coming soon') },
    { icon: FileDown, label: 'Export Chat / Backup', onClick: () => toast.info('Export feature coming soon') },
    { icon: Sparkles, label: 'AI Summary', subtitle: 'Generate key points from conversation', onClick: handleAISummary },
  ];

  const advancedOptions = [
    { icon: Flag, label: 'Report / Block', onClick: () => {} },
    { icon: Users, label: 'Shared Groups', value: '3 groups', onClick: () => {} },
    { icon: ShieldAlert, label: 'Trust Level', value: 'Verified', onClick: () => {} },
  ];

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-2 mt-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );

  const MenuItem = ({ item }: { item: any }) => (
    <button
      onClick={item.onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 active:bg-accent/50 transition-colors touch-manipulation rounded-lg"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-hero/10 flex items-center justify-center">
          <item.icon className="w-4 h-4 text-primary" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-foreground font-medium text-sm">{item.label}</span>
          {item.subtitle && (
            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  return (
    <>
      <div className="flex flex-col h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background relative overflow-hidden">
        {/* Background Elements (matching Auth page) */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'var(--gradient-mesh)' }} />
        <div className="absolute top-10 left-5 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-5 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        
        {/* Smaller Compact Header */}
        <div className="relative bg-card/40 backdrop-blur-xl border-b border-border/40 pt-2 pb-3 px-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-accent/50 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Compact Profile Section */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="absolute -inset-1 rounded-full bg-gradient-hero opacity-20 blur" />
              <Avatar className="w-20 h-20 relative border-2 border-primary/20">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="bg-gradient-hero text-white text-lg font-semibold">
                  {contact.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 className="text-lg font-bold text-foreground mb-0.5">
              {contact.username?.toUpperCase() || 'CHATR USER'}
            </h2>
            <p className="text-muted-foreground text-xs">
              @{contact.username || 'username'}
            </p>
          </div>

          {/* Quick Actions - Smaller */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="flex flex-col items-center gap-1 touch-manipulation active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-hero/10 backdrop-blur flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                  <action.icon className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] text-foreground font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-background/60 backdrop-blur-sm rounded-t-3xl relative z-10">
        {/* Chat Controls Section */}
        <SectionHeader title="Chat Controls" />
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-3 rounded-2xl overflow-hidden mb-3 shadow-sm">
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
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-3 rounded-2xl overflow-hidden mb-3 shadow-sm">
          {/* Disappearing Messages */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground font-medium text-sm">Disappearing Messages</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { value: 'off', label: 'Off' },
                { value: '24h', label: '24 hrs' },
                { value: '7d', label: '7 days' }
              ].map((time) => (
                <Button
                  key={time.value}
                  size="sm"
                  variant={disappearingTime === time.value ? 'default' : 'outline'}
                  onClick={() => {
                    setDisappearingTime(time.value as any);
                    toast.success(`Messages will ${time.value === 'off' ? 'not disappear' : `disappear after ${time.label}`}`);
                  }}
                  className="flex-1 rounded-full text-xs px-3 h-7"
                >
                  {time.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-b border-border/30 mx-4" />

          {/* Lock Chat */}
          <button
            onClick={() => {
              setLockChat(!lockChat);
              toast.success(lockChat ? 'Chat unlocked' : 'Chat locked with Face ID / PIN');
            }}
            className="w-full px-4 py-3 hover:bg-accent/30 active:bg-accent/50 transition-colors touch-manipulation rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-sm">Lock Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Face ID / PIN</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </button>

          <div className="border-b border-border/30 mx-4" />

          {/* Stealth Mode */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-sm">Stealth Mode</span>
              </div>
              <Switch 
                checked={stealthMode} 
                onCheckedChange={(checked) => {
                  setStealthMode(checked);
                  toast.success(checked ? 'Stealth mode enabled' : 'Stealth mode disabled');
                }}
              />
            </div>
          </div>

          <div className="border-b border-border/30 mx-4" />

          {/* Read Receipts */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-sm">Read Receipts</span>
              </div>
              <Switch 
                checked={readReceipts} 
                onCheckedChange={(checked) => {
                  setReadReceipts(checked);
                  toast.success(checked ? 'Read receipts enabled' : 'Read receipts disabled');
                }}
              />
            </div>
          </div>
        </div>

        {/* Translation & Tools Section */}
        <SectionHeader title="Translation & Tools" />
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-3 rounded-2xl overflow-hidden mb-20 shadow-sm">
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

    {/* AI Summary Dialog */}
    <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Chat Summary
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {summaryLoading || !summaryText ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summaryText}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

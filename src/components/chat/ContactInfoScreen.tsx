import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAIChatAssistant } from '@/hooks/useAIChatAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AISummaryContent } from '@/components/ai/AISummaryContent';
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
  Languages,
  Lock,
  ChevronRight,
  Eye,
  CheckCheck,
  FileDown,
  Sparkles,
  Bookmark
} from 'lucide-react';

interface ContactInfoScreenProps {
  contact: {
    id: string;
    username: string;
    avatar_url?: string;
    phone_number?: string;
    status?: string;
  };
  conversationId?: string;
  onClose?: () => void;
  onCall?: (type: 'voice' | 'video') => void;
}

export const ContactInfoScreen: React.FC<ContactInfoScreenProps> = ({
  contact,
  conversationId,
  onClose,
  onCall
}) => {
  const navigate = useNavigate();
  const { generateSummary, loading: summaryLoading } = useAIChatAssistant();
  const [lockChat, setLockChat] = React.useState(false);
  const [stealthMode, setStealthMode] = React.useState(false);
  const [readReceipts, setReadReceipts] = React.useState(true);
  const [muteNotifications, setMuteNotifications] = React.useState(false);
  const [disappearingTime, setDisappearingTime] = React.useState<'off' | '24h' | '7d'>('off');
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summaryText, setSummaryText] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [selectedTheme, setSelectedTheme] = React.useState('default');

  // Apply theme to parent chat window
  React.useEffect(() => {
    const chatContainer = document.querySelector('[data-chat-container]');
    if (chatContainer) {
      chatContainer.setAttribute('data-theme', selectedTheme);
    }
  }, [selectedTheme]);

  const handleAISummary = async () => {
    if (!conversationId) {
      toast.error('No conversation selected');
      return;
    }
    setSummaryOpen(true);
    setSummaryText(null);
    const loadingId = toast.loading('Generating AI summary...');
    
    // Fetch actual messages from conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_id, content, profiles!inner(username)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (messages && messages.length > 0) {
      const formattedMessages = messages.map(m => ({
        sender_name: (m as any).profiles?.username || 'Unknown',
        content: m.content
      }));
      
      const summary = await generateSummary(formattedMessages, 'brief');
      if (summary) {
        setSummaryText(summary);
        toast.dismiss(loadingId);
        toast.success('Summary generated!');
      } else {
        toast.error('Failed to generate summary', { id: loadingId });
      }
    } else {
      toast.error('No messages to summarize', { id: loadingId });
    }
  };

  const handleExportChat = async () => {
    if (!conversationId) {
      toast.error('No conversation selected');
      return;
    }
    
    const loadingId = toast.loading('Exporting chat...');
    const { data: messages } = await supabase
      .from('messages')
      .select('*, profiles!inner(username)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (messages && messages.length > 0) {
      const exportText = messages.map(m => 
        `[${new Date((m as any).created_at).toLocaleString()}] ${(m as any).profiles?.username}: ${m.content}`
      ).join('\n');
      
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${contact.username}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Chat exported successfully!', { id: loadingId });
    } else {
      toast.error('No messages to export', { id: loadingId });
    }
  };

  const quickActions = [
    { icon: Phone, label: 'Voice', onClick: () => onCall?.('voice') },
    { icon: Video, label: 'Video', onClick: () => onCall?.('video') },
    { icon: DollarSign, label: 'Send Coin', onClick: () => navigate('/qr-payment') },
    { icon: Search, label: 'Search', onClick: () => setSearchOpen(true) },
  ];

  const chatControls = [
    { icon: Image, label: 'Media, Links & Docs', onClick: () => navigate(`/chat/${conversationId}/media`) },
    { icon: Pin, label: 'Pinned Messages', onClick: () => toast.info('No pinned messages yet') },
    { 
      icon: BellOff, 
      label: muteNotifications ? 'Unmute Notifications' : 'Mute Notifications', 
      onClick: () => {
        setMuteNotifications(!muteNotifications);
        toast.success(muteNotifications ? 'Notifications enabled' : 'Notifications muted');
      }
    },
    { icon: Palette, label: 'Chat Theme', onClick: () => setThemeOpen(true) },
    { icon: Bookmark, label: 'Save Media to Gallery', onClick: () => toast.success('Media saving enabled') },
  ];

  const translationTools = [
    { icon: Languages, label: 'Translate Chat', onClick: () => toast.info('Select language in message menu') },
    { icon: FileDown, label: 'Export Chat', onClick: handleExportChat },
    { icon: Sparkles, label: 'AI Summary', onClick: handleAISummary },
  ];

  const themes = [
    { id: 'default', name: 'Default', gradient: 'from-blue-500 to-purple-500' },
    { id: 'ocean', name: 'Ocean', gradient: 'from-cyan-500 to-blue-600' },
    { id: 'sunset', name: 'Sunset', gradient: 'from-orange-500 to-pink-500' },
    { id: 'forest', name: 'Forest', gradient: 'from-green-500 to-emerald-600' },
  ];

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-3 py-1.5 mt-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
    </div>
  );

  const MenuItem = ({ item }: { item: any }) => (
    <button
      onClick={item.onClick}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/30 active:bg-accent/50 transition-colors touch-manipulation"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-hero/10 flex items-center justify-center">
          <item.icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
        </div>
        <span className="text-foreground font-medium text-xs">{item.label}</span>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
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
            <div className="relative mb-1.5">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-hero opacity-20 blur-sm" />
              <Avatar className="w-16 h-16 relative border border-primary/20">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="bg-gradient-hero text-white text-base font-semibold">
                  {contact.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 className="text-base font-bold text-foreground">
              {contact.username || 'CHATR USER'}
            </h2>
            <p className="text-muted-foreground text-[10px]">
              @{contact.username || 'username'}
            </p>
          </div>

          {/* Quick Actions - Compact */}
          <div className="grid grid-cols-4 gap-1.5 mt-2.5">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="flex flex-col items-center gap-0.5 touch-manipulation active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-hero/10 backdrop-blur flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                  <action.icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-foreground font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      {/* Scrollable Content - Compact */}
      <div className="flex-1 overflow-y-auto bg-background/60 backdrop-blur-sm rounded-t-2xl relative z-10">
        {/* Chat Controls Section */}
        <SectionHeader title="Controls" />
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-2 rounded-xl overflow-hidden mb-2 shadow-sm">
          {chatControls.map((item, index) => (
            <div key={index}>
              <MenuItem item={item} />
              {index < chatControls.length - 1 && (
                <div className="border-b border-border/20 mx-3" />
              )}
            </div>
          ))}
        </div>

        {/* Privacy & Security Section */}
        <SectionHeader title="Privacy" />
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-2 rounded-xl overflow-hidden mb-2 shadow-sm">
          {/* Disappearing Messages */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-foreground font-medium text-xs">Disappearing Messages</span>
            </div>
            <div className="flex gap-1">
              {[
                { value: 'off', label: 'Off' },
                { value: '24h', label: '24h' },
                { value: '7d', label: '7d' }
              ].map((time) => (
                <Button
                  key={time.value}
                  size="sm"
                  variant={disappearingTime === time.value ? 'default' : 'outline'}
                  onClick={() => {
                    setDisappearingTime(time.value as any);
                    toast.success(`Messages ${time.value === 'off' ? 'won\'t disappear' : `disappear after ${time.label}`}`);
                  }}
                  className="flex-1 rounded-full text-[10px] px-2 h-6"
                >
                  {time.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-b border-border/20 mx-3" />

          {/* Lock Chat */}
          <button
            onClick={() => {
              setLockChat(!lockChat);
              toast.success(lockChat ? 'Chat unlocked' : 'Chat locked');
            }}
            className="w-full px-3 py-2 hover:bg-accent/30 active:bg-accent/50 transition-colors touch-manipulation"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-xs">Lock Chat</span>
              </div>
              <span className="text-[10px] text-muted-foreground">PIN</span>
            </div>
          </button>

          <div className="border-b border-border/20 mx-3" />

          {/* Stealth Mode */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-xs">Stealth Mode</span>
              </div>
              <Switch 
                checked={stealthMode} 
                onCheckedChange={(checked) => {
                  setStealthMode(checked);
                  toast.success(checked ? 'Stealth enabled' : 'Stealth disabled');
                }}
                className="scale-75"
              />
            </div>
          </div>

          <div className="border-b border-border/20 mx-3" />

          {/* Read Receipts */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-hero/10 flex items-center justify-center">
                  <CheckCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-foreground font-medium text-xs">Read Receipts</span>
              </div>
              <Switch 
                checked={readReceipts} 
                onCheckedChange={(checked) => {
                  setReadReceipts(checked);
                  toast.success(checked ? 'Receipts on' : 'Receipts off');
                }}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        {/* Translation & Tools Section */}
        <SectionHeader title="Tools" />
        <div className="bg-card/60 backdrop-blur-sm border border-border/40 mx-2 rounded-xl overflow-hidden mb-16 shadow-sm">
          {translationTools.map((item, index) => (
            <div key={index}>
              <MenuItem item={item} />
              {index < translationTools.length - 1 && (
                <div className="border-b border-border/20 mx-3" />
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
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Summary
          </DialogTitle>
        </DialogHeader>
        <div className="py-3">
          {summaryLoading || !summaryText ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <AISummaryContent content={summaryText} />
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Search Dialog */}
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Search Chat</DialogTitle>
        </DialogHeader>
        <div className="py-3">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Search feature coming soon
          </p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Theme Dialog */}
    <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Chat Theme</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setSelectedTheme(theme.id);
                toast.success(`Theme changed to ${theme.name}`);
                setThemeOpen(false);
              }}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedTheme === theme.id ? 'border-primary' : 'border-border/40'
              }`}
            >
              <div className={`w-full h-12 rounded-lg bg-gradient-to-br ${theme.gradient} mb-2`} />
              <p className="text-xs font-medium text-center">{theme.name}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

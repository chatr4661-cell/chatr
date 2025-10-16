import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  IndianRupee, 
  Search,
  Image,
  Star,
  Bell,
  Palette,
  Download,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  ChevronRight,
  UserPlus
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

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const quickActions = [
    { icon: Phone, label: 'Audio', color: 'text-green-600', onClick: () => onCall?.('voice') },
    { icon: Video, label: 'Video', color: 'text-green-600', onClick: () => onCall?.('video') },
    { icon: IndianRupee, label: 'Pay', color: 'text-green-600', onClick: () => navigate('/qr-payment') },
    { icon: Search, label: 'Search', color: 'text-green-600', onClick: () => {} },
  ];

  const menuItems = [
    { icon: Image, label: 'Media, links and docs', value: 'None', onClick: () => {} },
    { icon: Star, label: 'Starred', value: 'None', onClick: () => navigate('/chat/' + contact.id + '/starred') },
  ];

  const settingsItems = [
    { icon: Bell, label: 'Notifications', onClick: () => {} },
    { icon: Palette, label: 'Chat theme', onClick: () => {} },
    { icon: Download, label: 'Save to Photos', value: 'Default', onClick: () => {} },
    { icon: Clock, label: 'Disappearing messages', value: 'Off', onClick: () => {} },
    { 
      icon: FileText, 
      label: 'Transcript language', 
      subtitle: 'English (United States)', 
      onClick: () => {} 
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Contact info</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="flex flex-col items-center py-8 px-4">
          <Avatar className="w-32 h-32 mb-4">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary text-3xl">
              {contact.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {contact.phone_number || 'Unknown'}
          </h2>
          <p className="text-muted-foreground">~{contact.username}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 px-4 mb-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-sm text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Create New Contact */}
        <div className="px-4 mb-6">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-green-600 hover:text-green-700">
            <UserPlus className="w-5 h-5" />
            Create new contact
          </Button>
        </div>

        <Separator />

        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{item.value}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>

        <Separator />

        {/* Settings Items */}
        <div className="py-2">
          {settingsItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-foreground">{item.label}</span>
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
          ))}

          {/* Lock Chat Toggle */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-foreground">Lock chat</span>
                <span className="text-sm text-muted-foreground">
                  Lock and hide this chat on this device.
                </span>
              </div>
            </div>
            <Switch checked={lockChat} onCheckedChange={setLockChat} />
          </div>

          {/* Privacy Settings */}
          <button
            onClick={() => {}}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Advanced chat privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Off</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>

          {/* Encryption Info */}
          <button
            onClick={() => {}}
            className="w-full flex items-start gap-4 px-4 py-3 hover:bg-muted transition-colors"
          >
            <Lock className="w-5 h-5 text-muted-foreground mt-1" />
            <div className="flex-1 text-left">
              <div className="text-foreground mb-1">Encryption</div>
              <div className="text-sm text-muted-foreground">
                Messages and calls are end-to-end encrypted. Tap to verify.
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

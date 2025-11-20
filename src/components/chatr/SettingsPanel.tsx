import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Bell, Lock, Database, Palette, LogOut, ChevronRight,
  Users, Monitor, Eye, Check, Camera, Globe, HelpCircle, FileText, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface SettingsPanelProps {
  user: any;
}

export function SettingsPanel({ user }: SettingsPanelProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      navigate('/auth');
    }
  };

  const [contactSyncEnabled, setContactSyncEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [readReceipts, setReadReceipts] = React.useState(true);

  const settings = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', value: user?.user_metadata?.username || 'User' },
        { icon: User, label: 'Phone', value: user?.phone || '+1 234 557 890' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: Bell, label: 'Notifications', action: () => navigate('/notifications') },
        { icon: Lock, label: 'Privacy' },
        { icon: Users, label: 'Contact Sync', toggle: true, value: contactSyncEnabled, onChange: setContactSyncEnabled },
        { icon: Monitor, label: 'Linked Devices' },
        { icon: Palette, label: 'Dark Mode', toggle: true, value: darkMode, onChange: setDarkMode },
        { icon: Globe, label: 'Language', value: 'English' },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { icon: Eye, label: 'Last Seen', value: 'Everyone' },
        { icon: Check, label: 'Read Receipts', toggle: true, value: readReceipts, onChange: setReadReceipts },
        { icon: Camera, label: 'Profile Photo', value: 'Everyone' },
      ],
    },
    {
      title: 'Help',
      items: [
        { icon: HelpCircle, label: 'Help Center' },
        { icon: FileText, label: 'Terms & Privacy' },
        { icon: Info, label: 'About' },
      ],
    },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-3xl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-3xl font-bold">
          {user?.user_metadata?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="text-center">
          <h3 className="font-bold text-xl">{user?.user_metadata?.username || 'User'}</h3>
          <p className="text-sm text-muted-foreground">
            Hey there! I am using CHATR
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      {settings.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h3>
          <div className="bg-card rounded-2xl overflow-hidden border">
            {section.items.map((item: any, itemIdx) => {
              const Icon = item.icon;
              return (
                <button
                  key={itemIdx}
                  onClick={item.toggle ? undefined : item.action}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.toggle && item.onChange ? (
                    <Switch checked={item.value} onCheckedChange={item.onChange} />
                  ) : item.value ? (
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="destructive"
        className="w-full h-12 rounded-2xl"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Logout
      </Button>
    </div>
  );
}

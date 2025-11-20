import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Bell, 
  Lock, 
  Database, 
  Palette, 
  LogOut,
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const settings = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', value: user?.user_metadata?.username || 'User' },
        { icon: User, label: 'Phone', value: user?.phone || '+1 234 557 890' },
      ],
    },
    {
      title: 'App Settings',
      items: [
        { icon: Bell, label: 'Notifications', action: () => navigate('/notifications') },
        { icon: Lock, label: 'Privacy', action: () => navigate('/privacy') },
        { icon: Database, label: 'Data and Storage' },
        { icon: Palette, label: 'Appearance' },
      ],
    },
    {
      title: 'Help',
      items: [
        { icon: User, label: 'Help Center' },
        { icon: User, label: 'Contact Us' },
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
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <button
                  key={itemIdx}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.value ? (
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

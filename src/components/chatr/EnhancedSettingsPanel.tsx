import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCheck, 
  Image as ImageIcon,
  Smartphone,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface EnhancedSettingsPanelProps {
  user: any;
}

export function EnhancedSettingsPanel({ user }: EnhancedSettingsPanelProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [lastSeen, setLastSeen] = useState('everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState('everyone');
  const [showDevices, setShowDevices] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setUsername(data.username || '');
    }
  };

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update username');
    } else {
      toast.success('Username updated');
      loadProfile();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="h-full bg-background overflow-y-auto pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-[hsl(263,70%,50%)] to-[hsl(263,70%,55%)] px-4 pt-6 pb-8">
        <div className="flex flex-col items-center">
          <Avatar className="w-24 h-24 mb-3 border-4 border-white/30">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-white/20 text-white text-3xl">
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-xl font-bold text-white mb-1">{profile?.username}</div>
          <div className="text-sm text-white/80">{profile?.phone_number || profile?.email}</div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="px-4 py-6 space-y-6">
        {/* Account Settings */}
        <section className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Account</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
              <Button onClick={handleUpdateUsername} size="sm">
                Save
              </Button>
            </div>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Last Seen</Label>
              <Select value={lastSeen} onValueChange={setLastSeen}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">My Contacts</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-muted-foreground" />
                <Label>Read Receipts</Label>
              </div>
              <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Profile Photo Visibility</Label>
              <Select value={profilePhotoVisibility} onValueChange={setProfilePhotoVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">My Contacts</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Devices */}
        <section className="bg-card rounded-xl border border-border">
          <button
            onClick={() => setShowDevices(!showDevices)}
            className="w-full flex items-center justify-between p-4 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <span className="font-bold">Linked Devices</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {showDevices && (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">This Device</div>
                  <div className="text-sm text-muted-foreground">Active now</div>
                </div>
                <div className="text-xs text-muted-foreground">iPhone 15 Pro</div>
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground text-center py-4">
                No other devices linked
              </div>
            </div>
          )}
        </section>

        {/* Sign Out */}
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

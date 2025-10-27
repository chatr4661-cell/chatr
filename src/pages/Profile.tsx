import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { 
  User, 
  Heart, 
  Coins, 
  Settings, 
  Smartphone, 
  LogOut,
  ChevronRight,
  Shield,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  // Ensure onboarding is completed to prevent dialog from showing
  useEffect(() => {
    const markOnboardingComplete = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', session.user.id);
      }
    };
    markOnboardingComplete();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast.success('Signed out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header - Mobile Optimized */}
      <div className="bg-background border-b border-border pt-safe">
        <div className="px-4 py-6 text-center">
          <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-border">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-xl font-bold mb-1">
            {profile?.username || 'Anonymous User'}
          </h1>
          
          {profile?.status && (
            <p className="text-sm text-muted-foreground mb-3">{profile.status}</p>
          )}
          
          <Button 
            onClick={() => setIsEditDialogOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-full h-9 px-6"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Actions - Mobile Cards */}
      <div className="px-4 py-4 space-y-3">
        {/* Health & Points Cards */}
        <div className="native-card divide-y divide-border">
          <button
            onClick={() => navigate('/health-passport')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Health Passport</h3>
              <p className="text-xs text-muted-foreground truncate">Manage health records</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate('/chatr-points')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Chatr Points</h3>
              <p className="text-xs text-muted-foreground truncate">View rewards & wallet</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate('/device-management')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Device Management</h3>
              <p className="text-xs text-muted-foreground truncate">Manage linked devices</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        </div>

        {/* Settings Section */}
        <div className="native-card divide-y divide-border">
          <div className="px-4 py-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Settings
            </h3>
          </div>

          <button 
            onClick={() => navigate('/notification-settings')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Notifications</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          <button 
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Privacy & Security</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          <button 
            onClick={() => navigate('/account')}
            className="w-full flex items-center gap-3 p-3 active:bg-accent/50 transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm">Account Settings</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        </div>

        {/* Sign Out */}
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full h-11"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      {profile && (
        <ProfileEditDialog
          profile={profile}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onProfileUpdated={loadUserData}
        />
      )}
    </div>
  );
};

export default Profile;

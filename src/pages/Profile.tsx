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
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background pt-8 pb-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl font-bold mb-1">
            {profile?.username || 'Anonymous User'}
          </h1>
          
          {profile?.status && (
            <p className="text-sm text-muted-foreground mb-3">{profile.status}</p>
          )}
          
          <Button 
            onClick={() => setIsEditDialogOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <Card className="divide-y">
          <button
            onClick={() => navigate('/health-passport')}
            className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Health Passport</h3>
              <p className="text-sm text-muted-foreground">Manage health records</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/chatr-points')}
            className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Chatr Points</h3>
              <p className="text-sm text-muted-foreground">View rewards & wallet</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/device-management')}
            className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Device Management</h3>
              <p className="text-sm text-muted-foreground">Manage linked devices</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </Card>

        {/* Settings Section */}
        <Card className="divide-y">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Settings
            </h3>
          </div>

          <button className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <h3 className="font-medium">Notifications</h3>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <h3 className="font-medium">Privacy & Security</h3>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <h3 className="font-medium">Account Settings</h3>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </Card>

        {/* Sign Out */}
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full"
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

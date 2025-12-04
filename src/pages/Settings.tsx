import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, User, Shield, Palette, LogOut, Ghost } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/navigation';

export default function Settings() {
  const [userId, setUserId] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  return (
    <>
      <SEOHead
        title="Settings - Manage Your Account | Chatr"
        description="Manage your Chatr account settings, privacy preferences, notifications, and appearance."
        keywords="settings, account, privacy, notifications, appearance"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Settings', url: '/settings' }
        ]}
      />
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>
      
      <Breadcrumbs />

      <div className="p-4">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings userId={userId} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings userId={userId} />
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <PrivacySettings userId={userId} />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceSettings />
          </TabsContent>
        </Tabs>

        <div className="mt-8 space-y-3">
          <Link to="/stealth-mode">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Ghost className="w-4 h-4" />
              Stealth Mode Settings
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, User, Shield, Palette } from "lucide-react";

export default function Settings() {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="privacy">
                <Shield className="w-4 h-4 mr-2" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="w-4 h-4 mr-2" />
                Appearance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="mt-6">
              <NotificationSettings userId={userId} />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <div className="text-center text-muted-foreground py-8">
                Profile settings coming soon
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-6">
              <div className="text-center text-muted-foreground py-8">
                Privacy settings coming soon
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <div className="text-center text-muted-foreground py-8">
                Appearance settings coming soon
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

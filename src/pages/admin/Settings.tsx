import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Volume2 } from "lucide-react";
import { RingtoneSelector } from "@/components/RingtoneSelector";

const AdminSettings = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin");
      if (!hasAdminRole) {
        toast.error("Access denied - Admin only");
        navigate("/");
        return;
      }

      // Get user profile for current ringtones
      const { data: profileData } = await supabase
        .from("profiles")
        .select("notification_tone, call_ringtone")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      setIsAdmin(true);
    } catch (error: any) {
      console.error('Admin access check error:', error);
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure administrative settings</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Ringtone Settings</h2>
        </div>
        
        <RingtoneSelector
          userId={userId}
          currentNotificationTone={profile?.notification_tone}
          currentCallRingtone={profile?.call_ringtone}
        />
      </Card>
    </div>
  );
};

export default AdminSettings;

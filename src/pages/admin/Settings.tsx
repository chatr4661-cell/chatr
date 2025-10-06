import { useEffect, useState } from "react";
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xs">Loading...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center justify-between p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="h-7"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            <span className="text-xs">Back</span>
          </Button>
          <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Admin Settings
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-3 pb-20 max-w-2xl mx-auto">
        <Card className="p-4 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Ringtone Settings</h2>
          </div>
          
          <RingtoneSelector
            userId={userId}
            currentNotificationTone={profile?.notification_tone}
            currentCallRingtone={profile?.call_ringtone}
          />
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;

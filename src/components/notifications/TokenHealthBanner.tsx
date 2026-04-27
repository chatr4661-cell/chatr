import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface Props {
  userId?: string;
}

export const TokenHealthBanner = ({ userId }: Props) => {
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_push_health")
        .select("has_valid_token")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setInvalid(data?.has_valid_token === false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!invalid) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Notifications are paused</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Your device token is invalid. Re-register to start receiving push notifications again.</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/notifications/health">Fix Now</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};

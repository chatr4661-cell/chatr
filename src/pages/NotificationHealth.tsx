import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { messaging } from "@/firebase";
import { getToken } from "firebase/messaging";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BellOff, BellRing, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

type HealthRow = {
  has_valid_token: boolean | null;
  last_error: string | null;
  consecutive_failures: number | null;
  last_checked_at: string | null;
  updated_at: string | null;
};

export default function NotificationHealth() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reregistering, setReregistering] = useState(false);
  const [health, setHealth] = useState<HealthRow | null>(null);

  const loadHealth = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("user_push_health")
      .select("has_valid_token,last_error,consecutive_failures,last_checked_at,updated_at")
      .eq("user_id", uid)
      .maybeSingle();
    setHealth((data as HealthRow) ?? { has_valid_token: true, last_error: null, consecutive_failures: 0, last_checked_at: null, updated_at: null });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      await loadHealth(user.id);
      setLoading(false);
    })();
  }, [navigate, loadHealth]);

  const reregisterNative = async (uid: string) => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      throw new Error("Notification permission was denied. Please enable notifications in your device settings.");
    }

    return new Promise<void>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        PushNotifications.removeAllListeners();
        reject(new Error("Timed out waiting for a new device token."));
      }, 15000);

      await PushNotifications.addListener("registration", async (token) => {
        try {
          const platform = Capacitor.getPlatform();
          const { error } = await supabase.functions.invoke("register-device-token", {
            body: {
              token: token.value,
              userId: uid,
              platform: platform === "ios" ? "ios" : "android",
            },
          });
          clearTimeout(timeout);
          PushNotifications.removeAllListeners();
          if (error) reject(new Error(error.message));
          else resolve();
        } catch (e: any) {
          clearTimeout(timeout);
          PushNotifications.removeAllListeners();
          reject(e);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        clearTimeout(timeout);
        PushNotifications.removeAllListeners();
        reject(new Error(err.error || "Registration failed"));
      });

      await PushNotifications.register();
    });
  };

  const reregisterWeb = async (uid: string) => {
    if (!messaging) throw new Error("Push notifications are not supported in this browser.");
    if (typeof Notification === "undefined") throw new Error("Notifications are not supported here.");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was denied. Please enable notifications in your browser settings.");
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) throw new Error("Could not obtain a new device token.");

    const { error } = await supabase.functions.invoke("register-device-token", {
      body: { token, userId: uid, platform: "web" },
    });
    if (error) throw new Error(error.message);
  };

  const handleReregister = async () => {
    if (!userId) return;
    setReregistering(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await reregisterNative(userId);
      } else {
        await reregisterWeb(userId);
      }
      // Immediately refresh status so the user sees the updated result
      // without leaving the screen.
      await loadHealth(userId);
      toast.success("Device re-registered. Notifications restored.");
    } catch (e: any) {
      console.error("[NotificationHealth] Re-register failed:", e);
      toast.error(e?.message || "Failed to re-register device");
      // Still refresh — backend may have flagged the failure.
      await loadHealth(userId);
    } finally {
      setReregistering(false);
    }
  };

  const formatTimestamp = (iso: string | null | undefined) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  const lastCheckedDisplay = formatTimestamp(health?.last_checked_at ?? health?.updated_at);

  const isInvalid = health && health.has_valid_token === false;

  return (
    <>
      <SEOHead
        title="Notification Health - Restore Push Delivery | Chatr"
        description="Check the status of your notification device token and re-register in one tap if delivery has stopped."
      />
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="p-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Notification Health</h1>
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : isInvalid ? (
            <>
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Notifications are paused</AlertTitle>
                <AlertDescription>
                  Your device token is no longer valid, so we've stopped sending you push notifications.
                  Tap the button below to re-register this device — it only takes a second.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellOff className="h-5 w-5 text-destructive" />
                    Status
                  </CardTitle>
                  <CardDescription>Details about the last delivery attempt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token status</span>
                    <Badge variant="destructive">Invalid</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed attempts</span>
                    <span>{health?.consecutive_failures ?? 0}</span>
                  </div>
                  {health?.last_error && (
                    <div>
                      <div className="text-muted-foreground mb-1">Last error</div>
                      <code className="block text-xs p-2 bg-muted rounded break-all">{health.last_error}</code>
                    </div>
                  )}
                  {health?.last_checked_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last checked</span>
                      <span>{new Date(health.last_checked_at).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                size="lg"
                className="w-full"
                onClick={handleReregister}
                disabled={reregistering}
              >
                {reregistering ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Re-registering…
                  </>
                ) : (
                  <>
                    <BellRing className="mr-2 h-4 w-4" />
                    Re-register This Device
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>You're all set</AlertTitle>
                <AlertDescription>
                  Your device is registered and able to receive notifications.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-primary" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token status</span>
                    <Badge variant="secondary">Valid</Badge>
                  </div>
                  {health?.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last updated</span>
                      <span>{new Date(health.updated_at).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleReregister}
                disabled={reregistering}
              >
                {reregistering ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Device Token
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

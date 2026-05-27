import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseLiveKitTokenOptions {
  /** Room name to join. When null/undefined, the hook is idle. */
  room?: string | null;
  /** Stable participant identity. */
  identity?: string | null;
  /** Optional display name. */
  name?: string;
  /** Optional opaque metadata. */
  metadata?: string;
  /** Token lifetime requested from the edge function (seconds). Default 3600. */
  ttlSeconds?: number;
  /**
   * How long before expiry to refresh, in seconds.
   * Default: max(60s, 10% of ttl).
   */
  refreshLeadSeconds?: number;
  /** Disable auto fetch/refresh (e.g. before the call starts). */
  enabled?: boolean;
  /**
   * Invoked whenever a fresh token is minted (initial fetch + every refresh).
   * Use this to call `room.localParticipant.setMetadata` style updates,
   * or `room.engine.client.updateAuthToken(token)` on livekit-client v2.
   */
  onToken?: (token: string, url: string | null) => void;
}

interface LiveKitTokenState {
  token: string | null;
  url: string | null;
  identity: string | null;
  expiresAt: number | null; // epoch ms
  loading: boolean;
  error: Error | null;
  /** Force an immediate refresh. */
  refresh: () => Promise<void>;
}

/**
 * Fetches a LiveKit access token from the `livekit-token` edge function and
 * automatically refreshes it before expiry so long-running calls never drop
 * because of an expired JWT.
 */
export function useLiveKitToken(options: UseLiveKitTokenOptions): LiveKitTokenState {
  const {
    room,
    identity,
    name,
    metadata,
    ttlSeconds = 3600,
    refreshLeadSeconds,
    enabled = true,
    onToken,
  } = options;

  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [resolvedIdentity, setResolvedIdentity] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTokenRef = useRef(onToken);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchToken = useCallback(async () => {
    if (!enabled || !room || !identity) return;
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "livekit-token",
          {
            body: {
              room,
              identity,
              name,
              metadata,
              ttlSeconds,
            },
          },
        );

        if (invokeError) throw invokeError;
        if (!data?.token) throw new Error("livekit-token: empty response");

        const ttl: number = Number(data.expiresIn) || ttlSeconds;
        const expAt = Date.now() + ttl * 1000;

        setToken(data.token);
        setUrl(data.url ?? null);
        setResolvedIdentity(data.identity ?? identity);
        setExpiresAt(expAt);

        try {
          onTokenRef.current?.(data.token, data.url ?? null);
        } catch (cbErr) {
          console.warn("[useLiveKitToken] onToken callback threw", cbErr);
        }

        // Schedule next refresh.
        clearTimer();
        const lead = Math.max(
          30,
          refreshLeadSeconds ?? Math.max(60, Math.floor(ttl * 0.1)),
        );
        const delayMs = Math.max(5_000, (ttl - lead) * 1000);
        timerRef.current = setTimeout(() => {
          void fetchToken();
        }, delayMs);
      } catch (err: any) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        // Backoff retry: try again in 15s while still enabled.
        clearTimer();
        timerRef.current = setTimeout(() => {
          void fetchToken();
        }, 15_000);
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [enabled, room, identity, name, metadata, ttlSeconds, refreshLeadSeconds]);

  useEffect(() => {
    if (!enabled || !room || !identity) {
      clearTimer();
      return;
    }
    void fetchToken();
    return () => clearTimer();
  }, [enabled, room, identity, fetchToken]);

  // Refresh immediately when the tab/app returns to foreground if the token
  // is already past (or near) its expiry — covers devices that throttled the
  // background timer during a long call.
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!expiresAt) return;
      const lead = (refreshLeadSeconds ?? 60) * 1000;
      if (Date.now() >= expiresAt - lead) {
        void fetchToken();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, expiresAt, refreshLeadSeconds, fetchToken]);

  return {
    token,
    url,
    identity: resolvedIdentity,
    expiresAt,
    loading,
    error,
    refresh: async () => {
      clearTimer();
      await fetchToken();
    },
  };
}

export default useLiveKitToken;

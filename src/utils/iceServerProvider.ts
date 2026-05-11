/**
 * ICE Server Provider — provider-agnostic, env-based, regional-aware
 *
 * Fetches a deduped, ordered list of STUN/TURN/TURNS servers from the
 * `get-turn-credentials` edge function. Falls back to a baseline static
 * config so calling never breaks if the edge function is unreachable.
 *
 * Why this layer exists:
 *  - Avoid hardcoding TURN credentials in the bundle.
 *  - Allow rotating / multiple TURN providers (OpenRelay, Metered, Twilio…)
 *    without redeploying the app.
 *  - Allow regional prioritization (Mumbai/Delhi → Singapore → global) for
 *    Indian carrier networks (Jio/Airtel/Vi/BSNL) that suffer from CGNAT,
 *    blocked UDP and symmetric NAT.
 *  - Centralize the "force TURN-only" relay fallback logic.
 */

import { supabase } from "@/integrations/supabase/client";

export type IceProvider = "openrelay" | "metered" | "twilio" | "custom" | "google-stun" | "cloudflare-stun" | "unknown";

export interface ProviderTaggedIceServer extends RTCIceServer {
  /** Best-effort provider tag — used by telemetry / diagnostics only. */
  provider?: IceProvider;
  /** Optional region hint, e.g. "in-mumbai", "in-delhi", "sg". */
  region?: string;
}

interface FetchOptions {
  /** Pass `true` after a P2P attempt fails to force TURN/relay only. */
  relayOnly?: boolean;
  /** Region preference. Defaults to "in" (India). */
  region?: string;
  /** Bypass cache. */
  fresh?: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — TURN creds usually valid >> this
let cache: { ts: number; servers: ProviderTaggedIceServer[] } | null = null;

/**
 * Static fallback — kept tiny and credential-free where possible.
 * Used when the edge function fails (offline, cold start, auth loss).
 * The TURN entries below intentionally use the public OpenRelay test
 * credentials so calls still survive carrier NATs even in degraded mode.
 */
const FALLBACK_SERVERS: ProviderTaggedIceServer[] = [
  // STUN — fast, cheap, host/srflx discovery
  { urls: "stun:stun.l.google.com:19302", provider: "google-stun" },
  { urls: "stun:stun1.l.google.com:19302", provider: "google-stun" },
  { urls: "stun:stun.cloudflare.com:3478", provider: "cloudflare-stun" },
  // TURN/UDP+TCP+TLS — survives blocked UDP & symmetric NAT
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
    provider: "openrelay",
  },
];

/**
 * Tag a server with a best-effort provider name. Lets telemetry attribute
 * "which relay actually carried the call" without changing edge schemas.
 */
function tagProvider(srv: RTCIceServer): ProviderTaggedIceServer {
  const u = Array.isArray(srv.urls) ? srv.urls[0] : srv.urls;
  const url = (u || "").toLowerCase();
  let provider: IceProvider = "unknown";
  if (url.includes("openrelay.metered.ca")) provider = "openrelay";
  else if (url.includes("relay.metered.ca") || url.includes("metered")) provider = "metered";
  else if (url.includes("twilio")) provider = "twilio";
  else if (url.startsWith("stun:") && url.includes("google")) provider = "google-stun";
  else if (url.startsWith("stun:") && url.includes("cloudflare")) provider = "cloudflare-stun";
  else if (url.startsWith("stun:")) provider = "google-stun";
  else provider = "custom";
  return { ...srv, provider };
}

/**
 * Sort servers so that:
 *  - STUN comes first (so host/srflx are gathered fast on Wi-Fi)
 *  - then TURN/UDP, TURN/TCP, TURNS/TLS:443 in that order
 * This preserves low-latency P2P paths while ensuring carrier-NAT fallback.
 */
function orderForCarrierNAT(servers: ProviderTaggedIceServer[]): ProviderTaggedIceServer[] {
  const score = (s: ProviderTaggedIceServer): number => {
    const u = Array.isArray(s.urls) ? s.urls[0] : s.urls;
    const url = (u || "").toLowerCase();
    if (url.startsWith("stun:")) return 0;
    if (url.startsWith("turns:")) return 3;
    if (url.includes("transport=tcp")) return 2;
    if (url.startsWith("turn:")) return 1;
    return 4;
  };
  return [...servers].sort((a, b) => score(a) - score(b));
}

/**
 * Filter to relay-only (drop STUN entries). Used after a P2P attempt fails
 * — Indian mobile carriers commonly need TURN/TLS:443 to connect at all.
 */
function relayOnlyFilter(servers: ProviderTaggedIceServer[]): ProviderTaggedIceServer[] {
  return servers.filter((s) => {
    const u = Array.isArray(s.urls) ? s.urls[0] : s.urls;
    return !!u && !u.toLowerCase().startsWith("stun:");
  });
}

/**
 * Fetch ICE servers from the edge function. Edge function reads TURN
 * credentials from env (METERED_TURN_USERNAME, METERED_TURN_CREDENTIAL,
 * TWILIO_*, …) so credentials never ship in the bundle.
 *
 * Returns a fully prepared `RTCConfiguration` ready to hand to
 * `new RTCPeerConnection(...)`.
 */
export async function getIceServers(opts: FetchOptions = {}): Promise<{
  config: RTCConfiguration;
  servers: ProviderTaggedIceServer[];
  source: "edge" | "cache" | "fallback";
}> {
  const region = opts.region ?? "in";
  const now = Date.now();

  // Cache hit
  if (!opts.fresh && cache && now - cache.ts < CACHE_TTL_MS) {
    return buildResult(cache.servers, opts, "cache");
  }

  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials", {
      body: { region },
    });
    if (error) throw error;
    const raw: RTCIceServer[] = data?.iceServers || [];
    if (!raw.length) throw new Error("Empty iceServers from edge");
    const tagged = raw.map(tagProvider);
    cache = { ts: now, servers: tagged };
    return buildResult(tagged, opts, "edge");
  } catch (e) {
    console.warn("[iceServerProvider] Edge fetch failed, using fallback:", e);
    return buildResult(FALLBACK_SERVERS, opts, "fallback");
  }
}

function buildResult(
  servers: ProviderTaggedIceServer[],
  opts: FetchOptions,
  source: "edge" | "cache" | "fallback",
): { config: RTCConfiguration; servers: ProviderTaggedIceServer[]; source: typeof source } {
  let chosen = orderForCarrierNAT(servers);
  if (opts.relayOnly) chosen = relayOnlyFilter(chosen);

  const config: RTCConfiguration = {
    iceServers: chosen.map(({ provider, region, ...rest }) => rest), // strip our tags
    iceTransportPolicy: opts.relayOnly ? "relay" : "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    // Larger pool → faster gathering on bad networks; max 8 to avoid spam
    iceCandidatePoolSize: 6,
  };
  return { config, servers: chosen, source };
}

/**
 * Convenience: invalidate the cache (e.g. after credential rotation).
 */
export function invalidateIceCache() {
  cache = null;
}

/**
 * Identify the provider of a selected candidate-pair from `getStats()`.
 * Best-effort — used only for telemetry.
 */
export function inferProviderFromCandidate(rawAddress?: string): IceProvider {
  if (!rawAddress) return "unknown";
  const a = rawAddress.toLowerCase();
  if (a.includes("openrelay")) return "openrelay";
  if (a.includes("metered")) return "metered";
  if (a.includes("twilio")) return "twilio";
  return "unknown";
}

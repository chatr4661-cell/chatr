import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function requireMethod(req: Request, allowed: string[]): void {
  if (!allowed.includes(req.method)) {
    throw new Error(`Method ${req.method} not allowed`);
  }
}

export function jsonResponse(
  _req: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(_req: Request, error: Error): Response {
  const status = (error as Error & { status?: number }).status ?? 500;
  const message = error.message ?? "Internal error";
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

export async function requireUser(req: Request): Promise<{
  user: { id: string };
  serviceClient: ReturnType<typeof createClient>;
}> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) {
    throw Object.assign(new Error("Missing authorization"), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment configuration");
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await serviceClient.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    throw Object.assign(new Error("Invalid token"), { status: 401 });
  }

  return { user: userData.user, serviceClient };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= maxRequests) {
    throw Object.assign(new Error("Rate limit exceeded"), { status: 429 });
  }

  entry.count += 1;
}

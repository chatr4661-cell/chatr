/**
 * CHATR MCP SERVER
 * Machine Communication Protocol layer for CHATR OS
 * Exposes Messaging, Calls, Notifications, and Brain tools via MCP protocol
 * Auth: API Key (external apps) + Supabase JWT (authenticated users)
 */

import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mcp-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service role client for internal operations
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── AUTH HELPERS ───────────────────────────────────────

interface AuthResult {
  userId: string;
  authMethod: "jwt" | "api_key";
  apiKeyId?: string;
  permissions: string[];
  rateLimitPerMinute?: number;
}

async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Check for MCP API key first
  const mcpApiKey = req.headers.get("x-mcp-api-key");
  if (mcpApiKey) {
    return authenticateApiKey(mcpApiKey);
  }

  // Fall back to JWT auth
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authenticateJWT(authHeader);
  }

  throw new Error("No authentication provided. Use x-mcp-api-key header or Bearer token.");
}

async function authenticateApiKey(apiKey: string): Promise<AuthResult> {
  const prefix = apiKey.substring(0, 8);

  // Use a simple hash for comparison (in production, use bcrypt)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const { data: keyRecord, error } = await serviceClient
    .from("mcp_api_keys")
    .select("id, created_by, permissions, is_active, rate_limit_per_minute")
    .eq("api_key_prefix", prefix)
    .eq("api_key_hash", hashHex)
    .eq("is_active", true)
    .single();

  if (error || !keyRecord) {
    throw new Error("Invalid API key");
  }

  // Update last used
  await serviceClient
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString(), request_count: keyRecord.request_count + 1 })
    .eq("id", keyRecord.id);

  return {
    userId: keyRecord.created_by,
    authMethod: "api_key",
    apiKeyId: keyRecord.id,
    permissions: keyRecord.permissions as string[],
    rateLimitPerMinute: keyRecord.rate_limit_per_minute || 60,
  };
}

async function authenticateJWT(authHeader: string): Promise<AuthResult> {
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error("Invalid JWT token");
  }

  return {
    userId: data.claims.sub as string,
    authMethod: "jwt",
    permissions: [
      "messaging.read", "messaging.send",
      "calls.read", "calls.initiate",
      "notifications.send",
      "brain.query",
    ],
  };
}

function checkPermission(auth: AuthResult, requiredPermission: string): void {
  if (!auth.permissions.includes(requiredPermission)) {
    throw new Error(`Permission denied: ${requiredPermission} not granted`);
  }
}

// ─── RATE LIMIT HELPER ─────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

async function checkRateLimit(auth: AuthResult): Promise<RateLimitResult> {
  if (!auth.apiKeyId) {
    // JWT auth has no per-key rate limit
    return { allowed: true, limit: 600, remaining: 600, resetAt: 0 };
  }

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const windowKey = windowStart.toISOString();

  // Upsert rate limit counter
  const { data: existing } = await serviceClient
    .from("mcp_rate_limits")
    .select("request_count")
    .eq("api_key_id", auth.apiKeyId)
    .eq("window_start", windowKey)
    .single();

  let currentCount = 1;
  if (existing) {
    currentCount = existing.request_count + 1;
    await serviceClient
      .from("mcp_rate_limits")
      .update({ request_count: currentCount })
      .eq("api_key_id", auth.apiKeyId)
      .eq("window_start", windowKey);
  } else {
    await serviceClient
      .from("mcp_rate_limits")
      .insert({ api_key_id: auth.apiKeyId, window_start: windowKey, request_count: 1 });
  }

  // Get rate limit from API key (default 60/min)
  const limit = auth.rateLimitPerMinute || 60;
  const resetAt = Math.floor(windowStart.getTime() / 1000) + 60;

  return {
    allowed: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    resetAt,
  };
}

// ─── LOG HELPER ───────────────────────────────────────

async function logRequest(
  auth: AuthResult,
  toolName: string,
  payload: unknown,
  status: string,
  latencyMs: number,
  errorMsg?: string,
) {
  try {
    await serviceClient.from("mcp_request_logs").insert({
      api_key_id: auth.apiKeyId || null,
      user_id: auth.userId,
      tool_name: toolName,
      request_payload: payload as Record<string, unknown>,
      response_status: status,
      latency_ms: Math.round(latencyMs),
      error_message: errorMsg || null,
    });
  } catch (e) {
    console.error("Failed to log MCP request:", e);
  }
}

// ─── MCP SERVER SETUP ───────────────────────────────────

function createMcpServer(auth: AuthResult) {
  const mcpServer = new McpServer({
    name: "chatr-mcp-server",
    version: "1.0.0",
  });

  // ═══════════════════════════════════════════════════════
  // MESSAGING TOOLS
  // ═══════════════════════════════════════════════════════

  mcpServer.tool({
    name: "messaging_send",
    description: "Send a message in a conversation. Supports text, image, and document types.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "UUID of the conversation" },
        content: { type: "string", description: "Message content/text" },
        message_type: { type: "string", enum: ["text", "image", "document", "voice"], description: "Type of message" },
      },
      required: ["conversation_id", "content"],
    },
    handler: async ({ conversation_id, content, message_type }) => {
      checkPermission(auth, "messaging.send");

      const { data, error } = await serviceClient.from("messages").insert({
        conversation_id,
        sender_id: auth.userId,
        content,
        message_type: message_type || "text",
      }).select().single();

      if (error) throw new Error(`Failed to send message: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ success: true, message_id: data.id, sent_at: data.created_at }) }] };
    },
  });

  mcpServer.tool({
    name: "messaging_read",
    description: "Read messages from a conversation. Returns the most recent messages.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "UUID of the conversation" },
        limit: { type: "number", description: "Number of messages to fetch (max 100)" },
        before: { type: "string", description: "ISO timestamp - fetch messages before this time" },
      },
      required: ["conversation_id"],
    },
    handler: async ({ conversation_id, limit, before }) => {
      checkPermission(auth, "messaging.read");

      // Verify user is participant
      const { data: participant } = await serviceClient
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", auth.userId)
        .single();

      if (!participant) throw new Error("Not a participant of this conversation");

      let query = serviceClient
        .from("messages")
        .select("id, content, message_type, sender_id, created_at, reactions")
        .eq("conversation_id", conversation_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit || 50, 100));

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to read messages: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ messages: data, count: data?.length || 0 }) }] };
    },
  });

  mcpServer.tool({
    name: "messaging_search",
    description: "Search messages across all conversations the user participates in.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query text" },
        conversation_id: { type: "string", description: "Optional: limit search to specific conversation" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
    handler: async ({ query, conversation_id, limit }) => {
      checkPermission(auth, "messaging.read");

      let dbQuery = serviceClient
        .from("messages")
        .select("id, content, conversation_id, sender_id, created_at, message_type")
        .ilike("content", `%${query}%`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit || 20, 100));

      if (conversation_id) {
        dbQuery = dbQuery.eq("conversation_id", conversation_id);
      }

      const { data, error } = await dbQuery;
      if (error) throw new Error(`Search failed: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ results: data, count: data?.length || 0 }) }] };
    },
  });

  mcpServer.tool({
    name: "messaging_list_conversations",
    description: "List all conversations for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max conversations to return" },
      },
    },
    handler: async ({ limit }) => {
      checkPermission(auth, "messaging.read");

      const { data, error } = await serviceClient.rpc("get_user_conversations_optimized", {
        p_user_id: auth.userId,
      });

      if (error) throw new Error(`Failed to list conversations: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ conversations: (data || []).slice(0, limit || 50) }) }] };
    },
  });

  // ═══════════════════════════════════════════════════════
  // CALL TOOLS
  // ═══════════════════════════════════════════════════════

  mcpServer.tool({
    name: "calls_initiate",
    description: "Initiate a voice or video call to a user.",
    inputSchema: {
      type: "object",
      properties: {
        callee_id: { type: "string", description: "UUID of the user to call" },
        call_type: { type: "string", enum: ["audio", "video"], description: "Type of call" },
      },
      required: ["callee_id", "call_type"],
    },
    handler: async ({ callee_id, call_type }) => {
      checkPermission(auth, "calls.initiate");

      const { data, error } = await serviceClient.from("calls").insert({
        caller_id: auth.userId,
        callee_id,
        call_type,
        status: "ringing",
      }).select().single();

      if (error) throw new Error(`Failed to initiate call: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ success: true, call_id: data.id, status: "ringing" }) }] };
    },
  });

  mcpServer.tool({
    name: "calls_status",
    description: "Get the current status of a call.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: { type: "string", description: "UUID of the call" },
      },
      required: ["call_id"],
    },
    handler: async ({ call_id }) => {
      checkPermission(auth, "calls.read");

      const { data, error } = await serviceClient
        .from("calls")
        .select("id, caller_id, callee_id, call_type, status, started_at, ended_at, duration")
        .eq("id", call_id)
        .single();

      if (error) throw new Error(`Failed to get call status: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  mcpServer.tool({
    name: "calls_history",
    description: "Get call history for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of calls to return (default 20)" },
        call_type: { type: "string", enum: ["audio", "video"], description: "Filter by call type" },
      },
    },
    handler: async ({ limit, call_type }) => {
      checkPermission(auth, "calls.read");

      let query = serviceClient
        .from("calls")
        .select("id, caller_id, callee_id, call_type, status, started_at, ended_at, duration")
        .or(`caller_id.eq.${auth.userId},callee_id.eq.${auth.userId}`)
        .order("started_at", { ascending: false })
        .limit(Math.min(limit || 20, 100));

      if (call_type) {
        query = query.eq("call_type", call_type);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to get call history: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ calls: data, count: data?.length || 0 }) }] };
    },
  });

  mcpServer.tool({
    name: "calls_end",
    description: "End an active call.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: { type: "string", description: "UUID of the call to end" },
      },
      required: ["call_id"],
    },
    handler: async ({ call_id }) => {
      checkPermission(auth, "calls.initiate");

      const { error } = await serviceClient
        .from("calls")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", call_id)
        .or(`caller_id.eq.${auth.userId},callee_id.eq.${auth.userId}`);

      if (error) throw new Error(`Failed to end call: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ success: true, call_id, status: "ended" }) }] };
    },
  });

  // ═══════════════════════════════════════════════════════
  // NOTIFICATION TOOLS
  // ═══════════════════════════════════════════════════════

  mcpServer.tool({
    name: "notifications_send",
    description: "Send a push notification to a user or broadcast to multiple users.",
    inputSchema: {
      type: "object",
      properties: {
        target_user_id: { type: "string", description: "UUID of user to notify" },
        title: { type: "string", description: "Notification title" },
        body: { type: "string", description: "Notification body text" },
        data: { type: "object", description: "Additional data payload" },
      },
      required: ["target_user_id", "title", "body"],
    },
    handler: async ({ target_user_id, title, body, data }) => {
      checkPermission(auth, "notifications.send");

      // Get the target user's FCM tokens
      const { data: tokens, error: tokenError } = await serviceClient
        .from("device_tokens")
        .select("token")
        .eq("user_id", target_user_id)
        .eq("is_active", true);

      if (tokenError || !tokens?.length) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, reason: "No active device tokens found" }) }] };
      }

      // Call the existing send-push edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: target_user_id,
          title,
          body,
          data: { ...data, source: "mcp", sender_id: auth.userId },
        }),
      });

      const result = await response.json();
      return { content: [{ type: "text", text: JSON.stringify({ success: response.ok, ...result }) }] };
    },
  });

  mcpServer.tool({
    name: "notifications_schedule",
    description: "Schedule a notification to be sent at a future time.",
    inputSchema: {
      type: "object",
      properties: {
        target_user_id: { type: "string", description: "UUID of user to notify" },
        title: { type: "string", description: "Notification title" },
        body: { type: "string", description: "Notification body text" },
        scheduled_at: { type: "string", description: "ISO 8601 timestamp for when to send" },
        recurring: { type: "string", enum: ["once", "daily", "weekly"], description: "Recurrence pattern" },
      },
      required: ["target_user_id", "title", "body", "scheduled_at"],
    },
    handler: async ({ target_user_id, title, body, scheduled_at, recurring }) => {
      checkPermission(auth, "notifications.send");

      const { data, error } = await serviceClient.from("scheduled_notifications").insert({
        user_id: target_user_id,
        title,
        body,
        scheduled_for: scheduled_at,
        recurring_type: recurring || "once",
        status: "pending",
        created_by: auth.userId,
      }).select().single();

      if (error) throw new Error(`Failed to schedule notification: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ success: true, notification_id: data.id, scheduled_at }) }] };
    },
  });

  // ═══════════════════════════════════════════════════════
  // BRAIN / AI TOOLS
  // ═══════════════════════════════════════════════════════

  mcpServer.tool({
    name: "brain_query",
    description: "Query the CHATR Brain AI system. Routes to specialized agents (health, jobs, local, work, personal, search).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language query" },
        agent: { type: "string", enum: ["personal", "work", "search", "local", "jobs", "health"], description: "Force a specific agent" },
        context: { type: "object", description: "Additional context (location, preferences)" },
      },
      required: ["query"],
    },
    handler: async ({ query, agent, context }) => {
      checkPermission(auth, "brain.query");

      // Call the existing chatr-brain edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chatr-brain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query,
          agents: agent ? [agent] : undefined,
          context,
          userId: auth.userId,
        }),
      });

      const result = await response.json();
      return { content: [{ type: "text", text: JSON.stringify({ answer: result.answer, sources: result.sources, agent: result.agent }) }] };
    },
  });

  mcpServer.tool({
    name: "brain_search",
    description: "Perform a web search through CHATR's search infrastructure.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        category: { type: "string", enum: ["general", "news", "images", "local", "jobs", "health"], description: "Search category" },
      },
      required: ["query"],
    },
    handler: async ({ query, category }) => {
      checkPermission(auth, "brain.query");

      const response = await fetch(`${SUPABASE_URL}/functions/v1/universal-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query, category: category || "general", userId: auth.userId }),
      });

      const result = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  });

  // ═══════════════════════════════════════════════════════
  // USER / PROFILE TOOLS
  // ═══════════════════════════════════════════════════════

  mcpServer.tool({
    name: "user_profile",
    description: "Get the authenticated user's profile information.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const { data, error } = await serviceClient
        .from("profiles")
        .select("id, username, email, avatar_url, phone_number, is_online, bio, status_message, created_at")
        .eq("id", auth.userId)
        .single();

      if (error) throw new Error(`Failed to get profile: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  });

  mcpServer.tool({
    name: "contacts_list",
    description: "List the authenticated user's contacts.",
    inputSchema: {
      type: "object",
      properties: {
        registered_only: { type: "boolean", description: "Only show contacts who are CHATR users" },
        limit: { type: "number", description: "Max contacts to return" },
      },
    },
    handler: async ({ registered_only, limit }) => {
      checkPermission(auth, "messaging.read");

      let query = serviceClient
        .from("contacts")
        .select("id, contact_user_id, contact_name, contact_phone, is_registered")
        .eq("user_id", auth.userId)
        .limit(Math.min(limit || 50, 200));

      if (registered_only) {
        query = query.eq("is_registered", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to list contacts: ${error.message}`);

      return { content: [{ type: "text", text: JSON.stringify({ contacts: data, count: data?.length || 0 }) }] };
    },
  });

  return mcpServer;
}

// ─── HONO APP ───────────────────────────────────────────

const app = new Hono();

// CORS preflight
app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

// Health check
app.get("/chatr-mcp-server", (c) => {
  return c.json({
    name: "CHATR MCP Server",
    version: "1.0.0",
    status: "operational",
    protocol: "MCP (Model Context Protocol)",
    tools: [
      "messaging_send", "messaging_read", "messaging_search", "messaging_list_conversations",
      "calls_initiate", "calls_status", "calls_history", "calls_end",
      "notifications_send", "notifications_schedule",
      "brain_query", "brain_search",
      "user_profile", "contacts_list",
    ],
    auth_methods: ["api_key (x-mcp-api-key header)", "jwt (Authorization: Bearer)"],
  }, 200, corsHeaders);
});

// MCP endpoint
app.all("/chatr-mcp-server/*", async (c) => {
  const startTime = performance.now();

  try {
    // Authenticate
    const auth = await authenticateRequest(c.req.raw);

    // Check rate limit
    const rateLimit = await checkRateLimit(auth);
    if (!rateLimit.allowed) {
      return c.json(
        { jsonrpc: "2.0", error: { code: -32029, message: "Rate limit exceeded" }, id: null },
        429,
        {
          ...corsHeaders,
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": "60",
        },
      );
    }

    // Create MCP server scoped to this user
    const mcpServer = createMcpServer(auth);

    // Handle with StreamableHTTP transport
    const transport = new StreamableHttpTransport();
    const response = await transport.handleRequest(c.req.raw, mcpServer);

    // Add CORS + rate limit headers to MCP response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    headers.set("X-RateLimit-Reset", String(rateLimit.resetAt));

    const latencyMs = performance.now() - startTime;
    console.log(`✅ [CHATR MCP] Request processed in ${latencyMs.toFixed(0)}ms by ${auth.authMethod} [${rateLimit.remaining}/${rateLimit.limit} remaining]`);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [CHATR MCP] Error:`, errorMessage);

    return c.json(
      { jsonrpc: "2.0", error: { code: -32000, message: errorMessage }, id: null },
      error instanceof Error && errorMessage.includes("Invalid") ? 401 : 500,
      corsHeaders,
    );
  }
});

Deno.serve(app.fetch);

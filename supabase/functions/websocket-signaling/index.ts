import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store active WebSocket connections by user ID (best-effort; function instances are ephemeral)
const connections = new Map<string, WebSocket>();

const getBearerFromAuthHeader = (authHeader: string | null) => {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
};

const makeAuthedClient = (token: string) =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const makeServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = (req.headers.get("upgrade") || "").toLowerCase();

  // Log every request so Cloud "Logs" isn't blank
  console.log("[WS-Signaling] Request", {
    method: req.method,
    url: req.url,
    upgrade: upgradeHeader,
  });

  // -----------------------------
  // Non-WebSocket HTTP endpoint
  // -----------------------------
  if (upgradeHeader !== "websocket") {
    try {
      const authHeader = req.headers.get("Authorization");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: authHeader ? { Authorization: authHeader } : {},
          },
        },
      );

      const {
        data: { user },
        error: userErr,
      } = await supabaseClient.auth.getUser();

      if (userErr) console.log("[WS-Signaling] getUser error", userErr);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { action, targetUserId, eventType, eventData } = body;

      console.log("[WS-Signaling] HTTP action", { action, targetUserId, eventType, from: user.id });

      if (action === "send-event") {
        const targetSocket = connections.get(targetUserId);
        const canDeliver = targetSocket && targetSocket.readyState === WebSocket.OPEN;

        if (canDeliver) {
          targetSocket!.send(
            JSON.stringify({
              type: eventType,
              ...eventData,
            }),
          );
          console.log("[WS-Signaling] Delivered HTTP event", { to: targetUserId, eventType });
          return new Response(JSON.stringify({ success: true, delivered: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("[WS-Signaling] HTTP event NOT delivered (offline)", { to: targetUserId, eventType });
        return new Response(JSON.stringify({ success: true, delivered: false, reason: "user_offline" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[WS-Signaling] HTTP error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // -----------------------------
  // WebSocket upgrade endpoint
  // -----------------------------
  try {
    // Support auth via query param or Authorization header on the upgrade request
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token");
    const bearer = getBearerFromAuthHeader(req.headers.get("Authorization"));
    const initialToken = tokenFromQuery || bearer;

    const { socket, response } = Deno.upgradeWebSocket(req);

    let userId: string | null = null;
    let userToken: string | null = null;

    const authenticate = async (token: string) => {
      console.log("[WS-Signaling] Authenticating socket...");
      const supabaseClient = makeAuthedClient(token);
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser();

      if (error) {
        console.error("[WS-Signaling] Auth getUser error", error);
      }

      if (!user) {
        socket.send(JSON.stringify({ type: "auth_error", error: "Invalid token" }));
        return false;
      }

      userId = user.id;
      userToken = token;
      connections.set(userId, socket);
      socket.send(JSON.stringify({ type: "auth_success", userId }));
      console.log("[WS-Signaling] ✅ Socket authenticated", { userId });
      return true;
    };

    socket.onopen = async () => {
      console.log("[WS-Signaling] WebSocket opened");
      if (initialToken) {
        await authenticate(initialToken);
      } else {
        console.log("[WS-Signaling] No initial token provided; waiting for auth message");
      }
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[WS-Signaling] Received", data?.type);

        // Auth message (legacy)
        if (data.type === "auth") {
          const ok = await authenticate(data.token);
          if (!ok) return;
          return;
        }

        if (!userId || !userToken) {
          socket.send(JSON.stringify({ type: "error", error: "Not authenticated" }));
          return;
        }

        const supabaseClient = makeAuthedClient(userToken);
        const supabaseAdmin = makeServiceClient();

        const messageType = (data?.type ?? "") as string;

        // Bridge native hangup/end → DB update so web call UI closes immediately
        if (
          messageType === "call:end" ||
          messageType === "call_end" ||
          messageType === "call:hangup" ||
          messageType === "call_hangup"
        ) {
          const callId = data.callId || data.call_id;
          console.log("[WS-Signaling] 📵 call:end", { callId, from: userId });

          if (!callId) {
            socket.send(JSON.stringify({ type: "call_end_ack", success: false, error: "missing_call_id" }));
            return;
          }

          // Verify participant + update using service role (avoids RLS surprises)
          const { data: callRow, error: callErr } = await supabaseAdmin
            .from("calls")
            .select("id, caller_id, receiver_id")
            .eq("id", callId)
            .maybeSingle();

          if (callErr || !callRow) {
            console.error("[WS-Signaling] ❌ call:end call not found", callErr);
            socket.send(JSON.stringify({ type: "call_end_ack", callId, success: false, error: "call_not_found" }));
            return;
          }

          if (userId !== callRow.caller_id && userId !== callRow.receiver_id) {
            console.error("[WS-Signaling] ❌ call:end user not participant", { userId, callRow });
            socket.send(JSON.stringify({ type: "call_end_ack", callId, success: false, error: "not_participant" }));
            return;
          }

          const endedAt = new Date().toISOString();
          const { error: updateError } = await supabaseAdmin
            .from("calls")
            .update({
              status: "ended",
              ended_at: endedAt,
              webrtc_state: "ended",
              missed: false,
            })
            .eq("id", callId);

          if (updateError) {
            console.error("[WS-Signaling] ❌ call:end update failed", updateError);
            socket.send(JSON.stringify({ type: "call_end_ack", callId, success: false }));
            return;
          }

          // Best-effort notify the other party via WS if they're connected
          const otherUserId = userId === callRow.caller_id ? callRow.receiver_id : callRow.caller_id;
          const otherSocket = connections.get(otherUserId);
          if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
            otherSocket.send(JSON.stringify({ type: "call_ended", callId, endedBy: userId, endedAt }));
          }

          socket.send(JSON.stringify({ type: "call_end_ack", callId, success: true }));
          return;
        }

        // Forward signaling messages (best-effort)
        if (messageType === "call_offer" || messageType === "call_answer" || messageType === "ice_candidate") {
          const targetSocket = connections.get(data.targetUserId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({ ...data, fromUserId: userId }));
            console.log("[WS-Signaling] Forwarded", { type: messageType, to: data.targetUserId });
          } else {
            console.log("[WS-Signaling] Target not connected", { type: messageType, to: data.targetUserId });
          }
          return;
        }

        // Bridge native accept → DB update so web caller's realtime listener can start WebRTC
        if (data.type === "call:accept" || data.type === "call_accept") {
          const callId = data.callId;
          console.log("[WS-Signaling] 🎯 call:accept", { callId, from: userId });

          const { error: updateError } = await supabaseClient
            .from("calls")
            .update({
              status: "active",
              started_at: new Date().toISOString(),
              webrtc_state: "connecting",
            })
            .eq("id", callId);

          if (updateError) {
            console.error("[WS-Signaling] ❌ Failed to update call", updateError);
          } else {
            console.log("[WS-Signaling] ✅ Call marked active", { callId });
          }

          const { data: callRow, error: callErr } = await supabaseClient
            .from("calls")
            .select("caller_id, receiver_id")
            .eq("id", callId)
            .maybeSingle();

          if (callErr || !callRow) {
            console.error("[WS-Signaling] ❌ Failed to fetch call row", callErr);
          } else {
            // Best-effort notify caller via WS if they are connected (optional)
            const callerSocket = connections.get(callRow.caller_id);
            if (callerSocket && callerSocket.readyState === WebSocket.OPEN) {
              callerSocket.send(
                JSON.stringify({
                  type: "call_accepted",
                  callId,
                  acceptedBy: userId,
                  timestamp: Date.now(),
                }),
              );
              console.log("[WS-Signaling] ✅ Sent call_accepted to caller", { caller: callRow.caller_id });
            }

            // Also drop a lightweight signal row so any web listeners can react immediately
            const { error: signalError } = await supabaseClient.from("webrtc_signals").insert({
              call_id: callId,
              from_user: userId,
              to_user: callRow.caller_id,
              signal_type: "answer",
              signal_data: { accepted: true, timestamp: Date.now(), source: "native_accept" },
            });

            if (signalError) {
              console.error("[WS-Signaling] ❌ Failed to insert accept signal", signalError);
            } else {
              console.log("[WS-Signaling] ✅ Inserted accept signal", { callId });
            }
          }

          socket.send(JSON.stringify({ type: "call_accept_ack", callId, success: !updateError }));
          return;
        }

        // Incoming call notification forwarding (optional)
        if (data.type === "incoming_call") {
          const targetSocket = connections.get(data.receiverId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(
              JSON.stringify({
                type: "incoming_call",
                callId: data.callId,
                callerId: userId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                callType: data.callType,
                conversationId: data.conversationId,
              }),
            );
            console.log("[WS-Signaling] Sent incoming_call", { to: data.receiverId, callId: data.callId });
          }
          return;
        }

        console.log("[WS-Signaling] Unhandled message", data);
      } catch (error) {
        console.error("[WS-Signaling] Message error", error);
      }
    };

    socket.onclose = () => {
      if (userId) {
        connections.delete(userId);
        console.log("[WS-Signaling] User disconnected", { userId });
      } else {
        console.log("[WS-Signaling] Socket closed (unauthenticated)");
      }
    };

    socket.onerror = (error) => {
      console.error("[WS-Signaling] Socket error", error);
    };

    return response;
  } catch (error) {
    console.error("[WS-Signaling] Upgrade error", error);
    return new Response(JSON.stringify({ error: "WebSocket upgrade failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

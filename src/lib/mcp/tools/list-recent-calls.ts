import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_calls",
  title: "List recent calls",
  description: "List the signed-in user's recent voice and video calls with status and duration.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many calls to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("calls")
      .select("id, call_type, status, started_at, ended_at, duration, missed, caller_id, receiver_id, caller_name, receiver_name")
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { calls: data ?? [] },
    };
  },
});

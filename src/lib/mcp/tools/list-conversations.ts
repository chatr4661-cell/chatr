import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_conversations",
  title: "List conversations",
  description: "List the signed-in user's chats, most recently updated first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many chats to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id, is_archived, conversations(id, is_group, group_name, updated_at, created_at)")
      .eq("user_id", ctx.getUserId())
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? [])
      .map((r: any) => r.conversations)
      .filter(Boolean)
      .sort((a: any, b: any) => String(b.updated_at ?? b.created_at).localeCompare(String(a.updated_at ?? a.created_at)));

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { conversations: rows },
    };
  },
});

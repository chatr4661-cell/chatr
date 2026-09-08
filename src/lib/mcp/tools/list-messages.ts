import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_messages",
  title: "Read messages in a chat",
  description: "Read the most recent messages of one conversation the signed-in user belongs to.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation to read."),
    limit: z.number().int().min(1).max(100).default(30).describe("How many messages to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, read_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 30);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const messages = (data ?? []).reverse();
    return {
      content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
      structuredContent: { messages },
    };
  },
});

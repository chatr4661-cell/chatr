import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "send_message",
  title: "Send a message",
  description: "Send a text message as the signed-in user into one of their conversations.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation to post into."),
    content: z.string().trim().min(1).max(4000).describe("Message text to send."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ conversation_id, content }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id, sender_id: ctx.getUserId(), content })
      .select("id, conversation_id, content, created_at")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Sent message ${data?.id}` }],
      structuredContent: { message: data },
    };
  },
});

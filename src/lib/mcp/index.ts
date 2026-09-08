import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConversations from "./tools/list-conversations";
import listMessages from "./tools/list-messages";
import sendMessage from "./tools/send-message";
import listRecentCalls from "./tools/list-recent-calls";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "chatr",
  title: "chatr",
  version: "0.1.0",
  instructions:
    "Tools for Chatr, a messaging and calling app. Use list_conversations to find a chat, list_messages to read it, send_message to reply, list_recent_calls for call history, and get_my_profile for the signed-in user's details. All tools act as the authenticated Chatr user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listConversations, listMessages, sendMessage, listRecentCalls, getMyProfile],
});

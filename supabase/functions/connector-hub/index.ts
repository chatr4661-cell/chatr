import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ProviderConfig {
  authUrl?: string;
  tokenUrl?: string;
  apiBase?: string;
  clientIdEnv?: string;
  clientSecretEnv?: string;
  apiKeyEnv?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  webhooks?: boolean;
  extraAuthParams?: Record<string, string>;
  /** capability -> provider request + normalizer */
  endpoints?: Record<string, {
    path: string;
    recordType: string;
    /** Provider verb; a few providers (Notion, Dropbox, Slack search) list via POST. */
    method?: "GET" | "POST";
    /** Static JSON body for POST-style list calls. */
    requestBody?: unknown;
    list: (body: any) => any[];
    /** Providers that list bare IDs (Gmail) hydrate full items before mapping. */
    hydrate?: (
      items: any[],
      fetchOne: (path: string) => Promise<any>,
    ) => Promise<any[]>;
    map: (item: any) => Record<string, unknown>;
    searchPath?: (q: string) => string;
    searchBody?: (q: string) => unknown;
  }>;
}


const G = "https://accounts.google.com/o/oauth2/v2/auth";
const GT = "https://oauth2.googleapis.com/token";
const MS = "https://login.microsoftonline.com/common/oauth2/v2.0";

const PROVIDERS: Record<string, ProviderConfig> = {
  gmail: {
    rateLimitPerMinute: 240, webhooks: true,
    authUrl: G, tokenUrl: GT, apiBase: "https://gmail.googleapis.com/gmail/v1",
    clientIdEnv: "GOOGLE_CONNECTOR_CLIENT_ID", clientSecretEnv: "GOOGLE_CONNECTOR_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    endpoints: {
      "email.read": {
        path: "/users/me/messages?maxResults=25",
        recordType: "message",
        list: (b) => b.messages ?? [],
        // Gmail list returns only {id, threadId} — hydrate metadata before mapping.
        hydrate: async (items, fetchOne) => {
          const full: any[] = [];
          for (const item of items) {
            try {
              full.push(
                await fetchOne(
                  `/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
                ),
              );
            } catch (_) {
              full.push(item);
            }
          }
          return full;
        },
        map: (m) => {
          const headers: any[] = m.payload?.headers ?? [];
          const header = (name: string) =>
            headers.find((h) => String(h.name).toLowerCase() === name)?.value ?? null;
          return {
            external_id: m.id,
            title: header("subject") ?? m.snippet ?? "Email",
            body: m.snippet ?? null,
            author: header("from"),
            participants: [header("from"), header("to")].filter(Boolean),
            url: m.threadId ? `https://mail.google.com/mail/u/0/#inbox/${m.threadId}` : null,
            occurred_at: m.internalDate
              ? new Date(Number(m.internalDate)).toISOString()
              : header("date")
                ? new Date(header("date") as string).toISOString()
                : null,
            metadata: { thread_id: m.threadId, label_ids: m.labelIds ?? [] },
          };
        },
        searchPath: (q) => `/users/me/messages?maxResults=25&q=${encodeURIComponent(q)}`,
      },
    },
  },
  google_calendar: {
    rateLimitPerMinute: 240, webhooks: true,
    authUrl: G, tokenUrl: GT, apiBase: "https://www.googleapis.com/calendar/v3",
    clientIdEnv: "GOOGLE_CONNECTOR_CLIENT_ID", clientSecretEnv: "GOOGLE_CONNECTOR_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/calendar"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    endpoints: {
      "calendar.read": {
        path: "/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime",
        recordType: "event",
        list: (b) => b.items ?? [],
        map: (e) => ({
          external_id: e.id, title: e.summary, body: e.description,
          url: e.htmlLink, occurred_at: e.start?.dateTime ?? e.start?.date, metadata: e,
        }),
      },
    },
  },
  google_meet: {
    authUrl: G, tokenUrl: GT, apiBase: "https://www.googleapis.com/calendar/v3",
    clientIdEnv: "GOOGLE_CONNECTOR_CLIENT_ID", clientSecretEnv: "GOOGLE_CONNECTOR_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    endpoints: {
      "meetings.read": {
        path: "/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime",
        recordType: "event",
        list: (b) => (b.items ?? []).filter((e: any) => e.conferenceData || e.hangoutLink),
        map: (e) => ({
          external_id: e.id, title: e.summary ?? "Meeting", body: e.description,
          url: e.hangoutLink ?? e.htmlLink, occurred_at: e.start?.dateTime ?? e.start?.date, metadata: e,
        }),
      },
    },
  },

  google_drive: {
    rateLimitPerMinute: 240, webhooks: true,
    authUrl: G, tokenUrl: GT, apiBase: "https://www.googleapis.com/drive/v3",
    clientIdEnv: "GOOGLE_CONNECTOR_CLIENT_ID", clientSecretEnv: "GOOGLE_CONNECTOR_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/drive"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    endpoints: {
      "files.read": {
        path: "/files?pageSize=50&fields=files(id,name,mimeType,webViewLink,modifiedTime)",
        recordType: "file",
        list: (b) => b.files ?? [],
        map: (f) => ({ external_id: f.id, title: f.name, url: f.webViewLink, occurred_at: f.modifiedTime, metadata: f }),
        searchPath: (q) =>
          `/files?pageSize=50&q=${encodeURIComponent(`name contains '${q}'`)}&fields=files(id,name,mimeType,webViewLink,modifiedTime)`,
      },
    },
  },
  google_contacts: {
    authUrl: G, tokenUrl: GT, apiBase: "https://people.googleapis.com/v1",
    clientIdEnv: "GOOGLE_CONNECTOR_CLIENT_ID", clientSecretEnv: "GOOGLE_CONNECTOR_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/contacts"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    endpoints: {
      "contacts.read": {
        path: "/people/me/connections?pageSize=100&personFields=names,emailAddresses,phoneNumbers",
        recordType: "contact",
        list: (b) => b.connections ?? [],
        map: (p) => ({
          external_id: p.resourceName,
          title: p.names?.[0]?.displayName ?? "Contact",
          body: p.emailAddresses?.[0]?.value ?? p.phoneNumbers?.[0]?.value,
          metadata: p,
        }),
      },
    },
  },
  outlook: {
    rateLimitPerMinute: 180, webhooks: true,
    authUrl: `${MS}/authorize`, tokenUrl: `${MS}/token`, apiBase: "https://graph.microsoft.com/v1.0",
    clientIdEnv: "MICROSOFT_CONNECTOR_CLIENT_ID", clientSecretEnv: "MICROSOFT_CONNECTOR_CLIENT_SECRET",
    scopes: ["offline_access", "openid", "profile", "email", "User.Read", "Mail.Read", "Mail.Send", "Contacts.Read"],
    endpoints: {
      "email.read": {
        path: "/me/messages?$top=25&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,webLink,isRead,conversationId",
        recordType: "message",
        list: (b) => b.value ?? [],
        map: (m) => ({
          external_id: m.id,
          title: m.subject ?? "(no subject)",
          body: m.bodyPreview ?? null,
          author: m.from?.emailAddress?.address ?? null,
          participants: [
            m.from?.emailAddress?.address,
            ...(m.toRecipients ?? []).map((r: any) => r.emailAddress?.address),
          ].filter(Boolean),
          url: m.webLink ?? null,
          occurred_at: m.receivedDateTime ?? null,
          metadata: { is_read: m.isRead ?? null, conversation_id: m.conversationId ?? null },
        }),
        searchPath: (q) => `/me/messages?$top=25&$search="${encodeURIComponent(q)}"`,
      },
      "contacts.read": {
        path: "/me/contacts?$top=100&$select=id,displayName,emailAddresses,mobilePhone,businessPhones",
        recordType: "contact",
        list: (b) => b.value ?? [],
        map: (c) => ({
          external_id: c.id,
          title: c.displayName ?? "Contact",
          body: c.emailAddresses?.[0]?.address ?? c.mobilePhone ?? c.businessPhones?.[0] ?? null,
          participants: (c.emailAddresses ?? []).map((e: any) => e.address).filter(Boolean),
          metadata: c,
        }),
      },
    },
  },
  outlook_calendar: {
    rateLimitPerMinute: 180,
    authUrl: `${MS}/authorize`, tokenUrl: `${MS}/token`, apiBase: "https://graph.microsoft.com/v1.0",
    clientIdEnv: "MICROSOFT_CONNECTOR_CLIENT_ID", clientSecretEnv: "MICROSOFT_CONNECTOR_CLIENT_SECRET",
    scopes: ["offline_access", "openid", "profile", "email", "User.Read", "Calendars.ReadWrite"],
    endpoints: {
      "calendar.read": {
        path: "/me/events?$top=50&$orderby=start/dateTime&$select=id,subject,bodyPreview,start,end,location,organizer,attendees,webLink,onlineMeeting",
        recordType: "event",
        list: (b) => b.value ?? [],
        map: (e) => ({
          external_id: e.id,
          title: e.subject ?? "Event",
          body: e.bodyPreview ?? null,
          author: e.organizer?.emailAddress?.address ?? null,
          participants: (e.attendees ?? []).map((a: any) => a.emailAddress?.address).filter(Boolean),
          url: e.onlineMeeting?.joinUrl ?? e.webLink ?? null,
          occurred_at: e.start?.dateTime ? new Date(`${e.start.dateTime}Z`).toISOString() : null,
          metadata: { end: e.end ?? null, location: e.location?.displayName ?? null },
        }),
        searchPath: (q) => `/me/events?$top=50&$search="${encodeURIComponent(q)}"`,
      },
    },
  },
  microsoft_teams: {
    rateLimitPerMinute: 120,
    authUrl: `${MS}/authorize`, tokenUrl: `${MS}/token`, apiBase: "https://graph.microsoft.com/v1.0",
    clientIdEnv: "MICROSOFT_CONNECTOR_CLIENT_ID", clientSecretEnv: "MICROSOFT_CONNECTOR_CLIENT_SECRET",
    scopes: [
      "offline_access", "openid", "profile", "email", "User.Read",
      "Chat.Read", "Chat.ReadWrite", "Team.ReadBasic.All", "Channel.ReadBasic.All", "ChannelMessage.Read.All",
    ],
    endpoints: {
      "chat.read": {
        path: "/me/chats?$top=15&$expand=members",
        recordType: "message",
        list: (b) => b.value ?? [],
        // Graph lists chats, not messages — hydrate the recent messages of each chat.
        hydrate: async (chats, fetchOne) => {
          const messages: any[] = [];
          for (const chat of chats) {
            const chatName =
              chat.topic ??
              (chat.members ?? [])
                .map((m: any) => m.displayName)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ") ??
              "Teams chat";
            try {
              const page = await fetchOne(`/chats/${chat.id}/messages?$top=10`);
              for (const message of page.value ?? []) {
                if (message.messageType && message.messageType !== "message") continue;
                messages.push({ ...message, __chat: { id: chat.id, name: chatName } });
              }
            } catch (_) {
              messages.push({
                id: chat.id,
                __chat: { id: chat.id, name: chatName },
                lastUpdatedDateTime: chat.lastUpdatedDateTime,
                body: { content: null },
              });
            }
          }
          return messages;
        },
        map: (m) => {
          const text = String(m.body?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          return {
            external_id: m.id,
            title: m.__chat?.name ?? "Teams chat",
            body: text || null,
            author: m.from?.user?.displayName ?? m.from?.application?.displayName ?? null,
            url: m.webUrl ?? null,
            occurred_at: m.createdDateTime ?? m.lastModifiedDateTime ?? m.lastUpdatedDateTime ?? null,
            metadata: { chat_id: m.__chat?.id ?? null, importance: m.importance ?? null },
          };
        },
      },
      "chat.channels": {
        path: "/me/joinedTeams",
        recordType: "channel",
        list: (b) => b.value ?? [],
        hydrate: async (teams, fetchOne) => {
          const channels: any[] = [];
          for (const team of teams) {
            try {
              const page = await fetchOne(`/teams/${team.id}/channels`);
              for (const channel of page.value ?? []) {
                channels.push({ ...channel, __team: { id: team.id, name: team.displayName } });
              }
            } catch (_) { /* team without channel access */ }
          }
          return channels;
        },
        map: (c) => ({
          external_id: c.id,
          title: `${c.__team?.name ?? "Team"} / ${c.displayName ?? "channel"}`,
          body: c.description ?? null,
          url: c.webUrl ?? null,
          metadata: { team_id: c.__team?.id ?? null },
        }),
      },
    },
  },
  whatsapp: {
    rateLimitPerMinute: 120, webhooks: true,
    apiKeyEnv: "WHATSAPP_ACCESS_TOKEN", apiBase: "https://graph.facebook.com/v21.0",
    endpoints: {
      // WhatsApp Cloud API has no message-list endpoint; inbound messages arrive
      // via webhooks and are ingested by the whatsapp sync branch in runSync.
      "chat.read": {
        path: "/{phone_number_id}",
        recordType: "message",
        list: () => [],
        map: (m) => m,
      },
    },
  },
  onedrive: {
    rateLimitPerMinute: 180,
    authUrl: `${MS}/authorize`, tokenUrl: `${MS}/token`, apiBase: "https://graph.microsoft.com/v1.0",
    clientIdEnv: "MICROSOFT_CONNECTOR_CLIENT_ID", clientSecretEnv: "MICROSOFT_CONNECTOR_CLIENT_SECRET",
    scopes: ["offline_access", "Files.ReadWrite"],
    endpoints: {
      "files.read": {
        path: "/me/drive/root/children",
        recordType: "file",
        list: (b) => b.value ?? [],
        map: (f) => ({ external_id: f.id, title: f.name, url: f.webUrl, occurred_at: f.lastModifiedDateTime, metadata: f }),
      },
    },
  },
  slack: {
    rateLimitPerMinute: 60, webhooks: true,
    authUrl: "https://slack.com/oauth/v2/authorize", tokenUrl: "https://slack.com/api/oauth.v2.access",
    apiBase: "https://slack.com/api",
    clientIdEnv: "SLACK_CONNECTOR_CLIENT_ID", clientSecretEnv: "SLACK_CONNECTOR_CLIENT_SECRET",
    scopes: ["channels:read", "channels:history", "chat:write", "users:read"],
    endpoints: {
      "chat.read": {
        path: "/conversations.list?limit=50",
        recordType: "message",
        list: (b) => b.channels ?? [],
        map: (c) => ({ external_id: c.id, title: `#${c.name}`, body: c.purpose?.value, metadata: c }),
      },
    },
  },
  discord: {
    authUrl: "https://discord.com/oauth2/authorize", tokenUrl: "https://discord.com/api/oauth2/token",
    apiBase: "https://discord.com/api/v10",
    clientIdEnv: "DISCORD_CONNECTOR_CLIENT_ID", clientSecretEnv: "DISCORD_CONNECTOR_CLIENT_SECRET",
    scopes: ["identify", "guilds"],
    endpoints: {
      "chat.read": {
        path: "/users/@me/guilds",
        recordType: "message",
        list: (b) => (Array.isArray(b) ? b : []),
        map: (g) => ({ external_id: g.id, title: g.name, metadata: g }),
      },
    },
  },
  github: {
    rateLimitPerMinute: 120, webhooks: true,
    authUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token",
    apiBase: "https://api.github.com",
    clientIdEnv: "GITHUB_CONNECTOR_CLIENT_ID", clientSecretEnv: "GITHUB_CONNECTOR_CLIENT_SECRET",
    scopes: ["repo", "read:user"],
    endpoints: {
      "code.repos": {
        path: "/user/repos?per_page=50&sort=updated",
        recordType: "repo",
        list: (b) => (Array.isArray(b) ? b : []),
        map: (r) => ({ external_id: String(r.id), title: r.full_name, body: r.description, url: r.html_url, occurred_at: r.updated_at, metadata: r }),
        searchPath: (q) => `/search/repositories?q=${encodeURIComponent(q)}`,
      },
      "issues.read": {
        path: "/issues?per_page=50",
        recordType: "issue",
        list: (b) => (Array.isArray(b) ? b : []),
        map: (i) => ({ external_id: String(i.id), title: i.title, body: i.body, url: i.html_url, occurred_at: i.updated_at, metadata: i }),
      },
    },
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization", tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    apiBase: "https://api.linkedin.com/v2",
    clientIdEnv: "LINKEDIN_CONNECTOR_CLIENT_ID", clientSecretEnv: "LINKEDIN_CONNECTOR_CLIENT_SECRET",
    scopes: ["r_liteprofile", "r_emailaddress"],
    endpoints: {
      "profile.read": {
        path: "/me",
        recordType: "profile",
        list: (b) => [b],
        map: (p) => ({ external_id: p.id ?? "me", title: p.localizedFirstName ? `${p.localizedFirstName} ${p.localizedLastName ?? ""}`.trim() : "Profile", metadata: p }),
      },
    },
  },
  jira: {
    rateLimitPerMinute: 60,
    authUrl: "https://auth.atlassian.com/authorize", tokenUrl: "https://auth.atlassian.com/oauth/token",
    apiBase: "https://api.atlassian.com",
    clientIdEnv: "ATLASSIAN_CONNECTOR_CLIENT_ID", clientSecretEnv: "ATLASSIAN_CONNECTOR_CLIENT_SECRET",
    scopes: ["read:jira-work", "write:jira-work", "offline_access"],
    extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
    endpoints: {
      "issues.read": {
        // {cloud} is resolved per connection from /oauth/token/accessible-resources.
        path: "/ex/jira/{cloud}/rest/api/3/search?maxResults=50&jql=assignee=currentUser()%20order%20by%20updated%20DESC",
        recordType: "issue",
        list: (b) => b.issues ?? [],
        map: (i) => ({
          external_id: i.id, title: `${i.key} ${i.fields?.summary ?? ""}`.trim(),
          body: i.fields?.status?.name, occurred_at: i.fields?.updated, metadata: i,
        }),
        searchPath: (q) =>
          `/ex/jira/{cloud}/rest/api/3/search?maxResults=50&jql=${encodeURIComponent(`text ~ "${q}" order by updated DESC`)}`,
      },
    },
  },
  confluence: {
    rateLimitPerMinute: 60,
    authUrl: "https://auth.atlassian.com/authorize", tokenUrl: "https://auth.atlassian.com/oauth/token",
    apiBase: "https://api.atlassian.com",
    clientIdEnv: "ATLASSIAN_CONNECTOR_CLIENT_ID", clientSecretEnv: "ATLASSIAN_CONNECTOR_CLIENT_SECRET",
    scopes: ["read:confluence-content.all", "offline_access"],
    extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
    endpoints: {
      "docs.read": {
        path: "/ex/confluence/{cloud}/wiki/api/v2/pages?limit=50",
        recordType: "document",
        list: (b) => b.results ?? [],
        map: (p) => ({
          external_id: String(p.id), title: p.title,
          occurred_at: p.version?.createdAt ?? null, metadata: p,
        }),
      },
    },
  },
  salesforce: {
    rateLimitPerMinute: 60,
    authUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    clientIdEnv: "SALESFORCE_CONNECTOR_CLIENT_ID", clientSecretEnv: "SALESFORCE_CONNECTOR_CLIENT_SECRET",
    scopes: ["api", "refresh_token"],
    endpoints: {
      "crm.read": {
        // {instance} resolves to the org instance_url captured at OAuth time.
        path: "/services/data/v60.0/query?q=" +
          encodeURIComponent("SELECT Id, Name, StageName, Amount, LastModifiedDate FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT 50"),
        recordType: "deal",
        list: (b) => b.records ?? [],
        map: (d) => ({
          external_id: d.Id, title: d.Name, body: d.StageName,
          occurred_at: d.LastModifiedDate, metadata: d,
        }),
        searchPath: (q) =>
          "/services/data/v60.0/query?q=" +
          encodeURIComponent(`SELECT Id, Name, StageName, LastModifiedDate FROM Opportunity WHERE Name LIKE '%${q.replace(/'/g, "")}%' LIMIT 50`),
      },
    },
  },

  hubspot: {
    rateLimitPerMinute: 100,
    authUrl: "https://app.hubspot.com/oauth/authorize", tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    apiBase: "https://api.hubapi.com",
    clientIdEnv: "HUBSPOT_CONNECTOR_CLIENT_ID", clientSecretEnv: "HUBSPOT_CONNECTOR_CLIENT_SECRET",
    scopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
    endpoints: {
      "crm.read": {
        path: "/crm/v3/objects/contacts?limit=50",
        recordType: "contact",
        list: (b) => b.results ?? [],
        map: (c) => ({
          external_id: c.id,
          title: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(" ") || c.properties?.email,
          body: c.properties?.email, occurred_at: c.updatedAt, metadata: c,
        }),
      },
    },
  },
  notion: {
    rateLimitPerMinute: 60,
    authUrl: "https://api.notion.com/v1/oauth/authorize", tokenUrl: "https://api.notion.com/v1/oauth/token",
    apiBase: "https://api.notion.com/v1",
    clientIdEnv: "NOTION_CONNECTOR_CLIENT_ID", clientSecretEnv: "NOTION_CONNECTOR_CLIENT_SECRET",
    extraAuthParams: { owner: "user" },
    endpoints: {
      "docs.read": {
        path: "/search",
        method: "POST",
        requestBody: { page_size: 50, sort: { direction: "descending", timestamp: "last_edited_time" } },
        recordType: "document",
        list: (b) => b.results ?? [],
        map: (p) => ({
          external_id: p.id,
          title:
            p.properties?.title?.title?.[0]?.plain_text ??
            p.properties?.Name?.title?.[0]?.plain_text ??
            p.title?.[0]?.plain_text ?? "Notion page",
          url: p.url, occurred_at: p.last_edited_time, metadata: p,
        }),
        searchPath: () => "/search",
        searchBody: (q) => ({ query: q, page_size: 50 }),
      },
    },
  },
  trello: {
    authUrl: "https://trello.com/1/authorize", apiBase: "https://api.trello.com/1",
    clientIdEnv: "TRELLO_CONNECTOR_CLIENT_ID", clientSecretEnv: "TRELLO_CONNECTOR_CLIENT_SECRET",
    endpoints: {
      "tasks.read": {
        path: "/members/me/cards?limit=100",
        recordType: "task",
        list: (b) => (Array.isArray(b) ? b : []),
        map: (c) => ({
          external_id: c.id, title: c.name, body: c.desc, url: c.shortUrl,
          occurred_at: c.dateLastActivity ?? c.due ?? null, metadata: c,
        }),
      },
    },
  },
  asana: {
    authUrl: "https://app.asana.com/-/oauth_authorize", tokenUrl: "https://app.asana.com/-/oauth_token",
    apiBase: "https://app.asana.com/api/1.0",
    clientIdEnv: "ASANA_CONNECTOR_CLIENT_ID", clientSecretEnv: "ASANA_CONNECTOR_CLIENT_SECRET",
    scopes: ["default"],
    endpoints: {
      "tasks.read": {
        path: "/tasks?limit=50&assignee=me&opt_fields=name,notes,due_on,completed,permalink_url,modified_at",
        recordType: "task",
        list: (b) => b.data ?? [],
        map: (t) => ({
          external_id: t.gid, title: t.name, body: t.notes, url: t.permalink_url,
          occurred_at: t.modified_at ?? t.due_on ?? null, metadata: t,
        }),
        searchPath: (q) => `/tasks?limit=50&assignee=me&opt_fields=name,notes,permalink_url&text=${encodeURIComponent(q)}`,
      },
    },
  },

  zoom: {
    rateLimitPerMinute: 60,
    authUrl: "https://zoom.us/oauth/authorize", tokenUrl: "https://zoom.us/oauth/token",
    apiBase: "https://api.zoom.us/v2",
    clientIdEnv: "ZOOM_CONNECTOR_CLIENT_ID", clientSecretEnv: "ZOOM_CONNECTOR_CLIENT_SECRET",
    endpoints: {
      "meetings.read": {
        path: "/users/me/meetings?page_size=50",
        recordType: "event",
        list: (b) => b.meetings ?? [],
        map: (m) => ({ external_id: String(m.id), title: m.topic, url: m.join_url, occurred_at: m.start_time, metadata: m }),
      },
    },
  },
  dropbox: {
    authUrl: "https://www.dropbox.com/oauth2/authorize", tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    apiBase: "https://api.dropboxapi.com/2",
    clientIdEnv: "DROPBOX_CONNECTOR_CLIENT_ID", clientSecretEnv: "DROPBOX_CONNECTOR_CLIENT_SECRET",
    extraAuthParams: { token_access_type: "offline" },
    endpoints: {
      "files.read": {
        path: "/files/list_folder",
        method: "POST",
        requestBody: { path: "", recursive: false, limit: 100 },
        recordType: "file",
        list: (b) => b.entries ?? [],
        map: (f) => ({
          external_id: f.id ?? f.path_lower, title: f.name,
          occurred_at: f.server_modified ?? null, metadata: f,
        }),
        searchPath: () => "/files/search_v2",
        searchBody: (q) => ({ query: q, options: { max_results: 50 } }),
      },
    },
  },

  stripe: {
    apiKeyEnv: "STRIPE_SECRET_KEY", apiBase: "https://api.stripe.com/v1",
    endpoints: {
      "payments.read": {
        path: "/charges?limit=50",
        recordType: "payment",
        list: (b) => b.data ?? [],
        map: (c) => ({
          external_id: c.id,
          title: `${(c.amount / 100).toFixed(2)} ${String(c.currency).toUpperCase()}`,
          body: c.description, occurred_at: new Date(c.created * 1000).toISOString(), metadata: c,
        }),
      },
    },
  },
  razorpay: {
    apiKeyEnv: "RAZORPAY_KEY_SECRET", apiBase: "https://api.razorpay.com/v1",
    endpoints: {
      "payments.read": {
        path: "/payments?count=50",
        recordType: "payment",
        list: (b) => b.items ?? [],
        map: (p) => ({
          external_id: p.id,
          title: `${(p.amount / 100).toFixed(2)} ${p.currency}`,
          body: p.description, occurred_at: new Date(p.created_at * 1000).toISOString(), metadata: p,
        }),
      },
    },
  },
  imap: { /* credential-based; handled via connect_credentials */ },
  microsoft_teams_placeholder: {},
};

const svc = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const functionBase = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1/connector-hub`;

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

/** Credential Vault — the only place tokens are read or written. */
const Vault = {
  async put(connectionId: string, creds: Record<string, unknown>) {
    await svc().from("connector_credentials").upsert(
      { connection_id: connectionId, ...creds, updated_at: new Date().toISOString() },
      { onConflict: "connection_id" },
    );
  },
  async get(connectionId: string) {
    const { data } = await svc().from("connector_credentials").select("*").eq("connection_id", connectionId).maybeSingle();
    return data;
  },
};

/** Refreshes an expiring OAuth token in place. */
async function accessTokenFor(connectorId: string, connectionId: string): Promise<string> {
  const config = PROVIDERS[connectorId] ?? {};
  if (config.apiKeyEnv) {
    const key = Deno.env.get(config.apiKeyEnv);
    if (!key) throw new Error(`Missing ${config.apiKeyEnv} secret`);
    return key;
  }

  const creds = await Vault.get(connectionId);
  if (!creds?.access_token) throw new Error("Connection is not authorized");

  const expired = creds.expires_at && new Date(creds.expires_at).getTime() < Date.now() + 60_000;
  if (!expired || !creds.refresh_token || !config.tokenUrl) return creds.access_token;

  const clientId = Deno.env.get(config.clientIdEnv ?? "");
  const clientSecret = Deno.env.get(config.clientSecretEnv ?? "");
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refresh_token,
      client_id: clientId ?? "",
      client_secret: clientSecret ?? "",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(body)}`);

  await Vault.put(connectionId, {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? creds.refresh_token,
    expires_at: body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null,
  });
  return body.access_token;
}

/** Atlassian cloud ids and Salesforce instance urls are per-account, resolved once and cached in the vault. */
async function resolveBaseAndPath(connectorId: string, connectionId: string, path: string, token: string) {
  const config = PROVIDERS[connectorId] ?? {};

  if (connectorId === "salesforce") {
    const creds: any = await Vault.get(connectionId);
    const instance = creds?.extra?.instance_url;
    if (!instance) throw new Error("Salesforce instance URL missing — reconnect the account");
    return { base: String(instance), path };
  }

  if (path.includes("{cloud}")) {
    const creds: any = await Vault.get(connectionId);
    let cloudId = creds?.extra?.cloud_id;
    if (!cloudId) {
      const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const sites = await res.json().catch(() => []);
      cloudId = Array.isArray(sites) ? sites[0]?.id : undefined;
      if (!cloudId) throw new Error("No accessible Atlassian site for this account");
      await Vault.put(connectionId, { extra: { ...(creds?.extra ?? {}), cloud_id: cloudId } });
    }
    return { base: config.apiBase!, path: path.replace("{cloud}", String(cloudId)) };
  }

  if (connectorId === "whatsapp" && path.includes("{phone_number_id}")) {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!phoneNumberId) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID secret");
    return { base: config.apiBase!, path: path.replace("{phone_number_id}", phoneNumberId) };
  }

  if (!config.apiBase) throw new Error(`Connector "${connectorId}" has no API base configured`);
  return { base: config.apiBase, path };
}

async function providerFetch(connectorId: string, connectionId: string, path: string, init: RequestInit = {}) {
  const token = await accessTokenFor(connectorId, connectionId);
  const { base, path: resolvedPath } = await resolveBaseAndPath(connectorId, connectionId, path, token);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (connectorId === "razorpay") {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    headers.Authorization = `Basic ${btoa(`${keyId}:${token}`)}`;
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
  if (connectorId === "notion") headers["Notion-Version"] = "2022-06-28";
  if (connectorId === "github") headers["X-GitHub-Api-Version"] = "2022-11-28";

  const res = await fetch(`${base}${resolvedPath}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`[${res.status}] ${text}`), { status: res.status });
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Best-effort account identity so the UI can show which account is linked. */
const IDENTITY: Record<string, { url: string; pick: (b: any) => string | undefined }> = {
  gmail: { url: "https://www.googleapis.com/oauth2/v3/userinfo", pick: (b) => b.email ?? b.name },
  google_calendar: { url: "https://www.googleapis.com/oauth2/v3/userinfo", pick: (b) => b.email },
  google_drive: { url: "https://www.googleapis.com/oauth2/v3/userinfo", pick: (b) => b.email },
  google_contacts: { url: "https://www.googleapis.com/oauth2/v3/userinfo", pick: (b) => b.email },
  google_meet: { url: "https://www.googleapis.com/oauth2/v3/userinfo", pick: (b) => b.email },
  outlook: { url: "https://graph.microsoft.com/v1.0/me", pick: (b) => b.mail ?? b.userPrincipalName },
  outlook_calendar: { url: "https://graph.microsoft.com/v1.0/me", pick: (b) => b.mail ?? b.userPrincipalName },
  onedrive: { url: "https://graph.microsoft.com/v1.0/me", pick: (b) => b.mail ?? b.userPrincipalName },
  microsoft_teams: { url: "https://graph.microsoft.com/v1.0/me", pick: (b) => b.mail ?? b.userPrincipalName },
  slack: { url: "https://slack.com/api/auth.test", pick: (b) => (b.ok ? `${b.user}@${b.team}` : undefined) },
  github: { url: "https://api.github.com/user", pick: (b) => b.email ?? b.login },
  hubspot: { url: "https://api.hubapi.com/oauth/v1/access-tokens", pick: (b) => b.user },
  zoom: { url: "https://api.zoom.us/v2/users/me", pick: (b) => b.email },
  asana: { url: "https://app.asana.com/api/1.0/users/me", pick: (b) => b.data?.email },
  dropbox: { url: "https://api.dropboxapi.com/2/users/get_current_account", pick: (b) => b.email },
};

/** Masks an email/handle for display: arjun@gmail.com -> ar***@gmail.com */
function maskAccount(value?: string | null): string | null {
  if (!value) return null;
  const [local, domain] = String(value).split("@");
  const head = local.slice(0, 2);
  const masked = `${head}${local.length > 2 ? "***" : ""}`;
  return domain ? `${masked}@${domain}` : masked;
}

async function resolveAccountLabel(connectorId: string, accessToken: string): Promise<string | null> {
  const identity = IDENTITY[connectorId];
  if (!identity) return null;
  try {
    const res = await fetch(identity.url, {
      method: connectorId === "dropbox" ? "POST" : "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return identity.pick(body) ?? null;
  } catch {
    return null;
  }
}


async function upsertRecords(
  connection: any,
  capability: string,
  recordType: string,
  records: Record<string, unknown>[],
) {
  if (!records.length) return 0;
  const rows = records.map((r) => ({
    user_id: connection.user_id,
    connection_id: connection.id,
    connector_id: connection.connector_id,
    capability,
    record_type: recordType,
    updated_at: new Date().toISOString(),
    ...r,
  }));
  const { error } = await svc()
    .from("connector_records")
    .upsert(rows, { onConflict: "connection_id,record_type,external_id" });
  if (error) throw error;
  return rows.length;
}

/** Pulls every (or one) capability for a connection into the unified record table. */
async function runSync(connection: any, capability?: string) {
  const connectorId = connection.connector_id;
  const config = PROVIDERS[connectorId] ?? {};
  const caps = capability ? [capability] : Object.keys(config.endpoints ?? {});
  const results: any[] = [];
  const failures: string[] = [];

  for (const cap of caps) {
    const endpoint = config.endpoints?.[cap];
    if (!endpoint) continue;
    try {
      const payload = await providerFetch(connectorId, connection.id, endpoint.path, {
        method: endpoint.method ?? "GET",
        ...(endpoint.method === "POST"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint.requestBody ?? {}) }
          : {}),
      });

      let items = endpoint.list(payload);
      if (endpoint.hydrate && items.length) {
        items = await endpoint.hydrate(items, (p) => providerFetch(connectorId, connection.id, p));
      }
      const upserted = await upsertRecords(connection, cap, endpoint.recordType, items.map(endpoint.map));
      console.log(`[sync] ${connectorId}/${cap} fetched=${items.length} upserted=${upserted}`);
      results.push({ capability: cap, fetched: items.length, upserted });
    } catch (error) {
      const message = String((error as Error).message).slice(0, 500);
      console.error(`[sync] ${connectorId}/${cap} failed: ${message}`);
      failures.push(`${cap}: ${message}`);
      results.push({ capability: cap, fetched: 0, upserted: 0, error: message });
    }
  }

  const allFailed = failures.length > 0 && failures.length === results.length;
  await svc().from("connector_connections")
    .update({
      // Only claim a successful sync when at least one capability pulled data.
      ...(allFailed ? {} : { last_synced_at: new Date().toISOString() }),
      health: failures.length === 0 ? "healthy" : allFailed ? "failing" : "degraded",
      last_error: failures.length ? failures.join(" | ").slice(0, 500) : null,
    })
    .eq("id", connection.id);

  return { results, errors: failures };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // ---- OAuth callback (provider redirect, no user JWT) ----
  if (url.pathname.endsWith("/callback")) {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    try {
      if (!code || !state) throw new Error("Missing code/state");
      const { data: stateRow } = await svc()
        .from("connector_connections")
        .select("*")
        .eq("id", state)
        .maybeSingle();
      if (!stateRow) throw new Error("Unknown connection state");

      const config = PROVIDERS[stateRow.connector_id] ?? {};
      const tokenRes = await fetch(config.tokenUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: Deno.env.get(config.clientIdEnv ?? "") ?? "",
          client_secret: Deno.env.get(config.clientSecretEnv ?? "") ?? "",
          redirect_uri: `${functionBase()}/callback`,
        }),
      });
      const token = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !token.access_token) throw new Error(JSON.stringify(token));

      await Vault.put(stateRow.id, {
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        token_type: token.token_type ?? "Bearer",
        expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
        // Per-account routing details some providers only return at grant time.
        extra: {
          ...(token.instance_url ? { instance_url: token.instance_url } : {}),
          ...(token.bot_user_id ? { bot_user_id: token.bot_user_id } : {}),
          ...(token.team?.id ? { team_id: token.team.id } : {}),
          ...(token.workspace_id ? { workspace_id: token.workspace_id } : {}),
        },
      });


      const grantedScopes = String(token.scope ?? config.scopes?.join(" ") ?? "").split(/[\s,]+/).filter(Boolean);
      const identity =
        (await resolveAccountLabel(stateRow.connector_id, token.access_token)) ??
        token.owner?.user?.person?.email ??
        null;
      await svc()
        .from("connector_connections")
        .update({
          status: "connected",
          health: "healthy",
          scopes: grantedScopes,
          last_error: null,
          ...(identity ? { display_name: maskAccount(identity) } : {}),
        })
        .eq("id", stateRow.id);
      console.log(`[oauth] callback complete connector=${stateRow.connector_id} connection=${stateRow.id}`);

      // Initial sync so the Universal Inbox has data immediately after connecting.
      try {
        const initial = await runSync({ ...stateRow, status: "connected" });
        console.log(`[oauth] initial sync ${stateRow.connector_id}: ${JSON.stringify(initial.results)}`);
      } catch (syncError) {
        console.error("initial sync failed", syncError);
      }

      const back = String(stateRow.settings?.redirect_to ?? "/connectors");
      const sep = back.includes("?") ? "&" : "?";
      return Response.redirect(`${back}${sep}connector_status=connected&connector_id=${stateRow.connector_id}`, 302);
    } catch (error) {
      console.error("oauth callback failed", error);
      return json({ error: String((error as Error).message) }, 400);
    }
  }

  // ---- Provider webhooks (no user JWT) ----
  if (url.pathname.includes("/webhook/")) {
    const connectorId = url.pathname.split("/webhook/")[1];
    const payload = await req.json().catch(() => ({}));
    await svc().from("connector_webhook_events").insert({
      connector_id: connectorId,
      event_type: payload?.type ?? payload?.event ?? null,
      payload,
    });
    return json({ received: true });
  }

  try {
    const user = await getUser(req);
    const body = await req.json();
    const connectorId = String(body.connector_id ?? "");
    const config = PROVIDERS[connectorId] ?? {};

    switch (body.action) {
      case "oauth_start": {
        const { data: connection, error } = await svc()
          .from("connector_connections")
          .upsert(
            {
              user_id: user.id,
              connector_id: connectorId,
              account_label: body.account_label ?? "primary",
              status: "connecting",
              health: "unknown",
              settings: { redirect_to: body.redirect_to ?? "/connectors" },
            },
            { onConflict: "user_id,connector_id,account_label" },
          )
          .select()
          .single();
        if (error) throw error;

        if (config.apiKeyEnv) {
          const ready = Boolean(Deno.env.get(config.apiKeyEnv));
          await svc()
            .from("connector_connections")
            .update({
              status: ready ? "connected" : "error",
              health: ready ? "healthy" : "failing",
              last_error: ready ? null : `Missing ${config.apiKeyEnv} secret`,
            })
            .eq("id", connection.id);
          return json({ connection_id: connection.id, requires_secret: !ready });
        }

        if (!config.authUrl) return json({ error: `Connector "${connectorId}" is not configured yet`, status: 501 }, 200);
        const clientId = Deno.env.get(config.clientIdEnv ?? "");
        if (!clientId) {
          await svc().from("connector_connections")
            .update({ status: "error", health: "failing", last_error: `Missing ${config.clientIdEnv}` })
            .eq("id", connection.id);
          return json({ error: `Missing ${config.clientIdEnv} secret`, status: 400 }, 200);
        }

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: `${functionBase()}/callback`,
          response_type: "code",
          state: connection.id,
          ...(config.scopes?.length ? { scope: config.scopes.join(" ") } : {}),
          ...(config.extraAuthParams ?? {}),
        });
        return json({ connection_id: connection.id, redirect_url: `${config.authUrl}?${params}` });
      }

      case "connect_credentials": {
        const { data: connection, error } = await svc()
          .from("connector_connections")
          .upsert(
            {
              user_id: user.id,
              connector_id: connectorId,
              account_label: body.account_label ?? "primary",
              status: "connected",
              health: "healthy",
            },
            { onConflict: "user_id,connector_id,account_label" },
          )
          .select()
          .single();
        if (error) throw error;
        await Vault.put(connection.id, { extra: body.credentials ?? {} });
        return json({ connection_id: connection.id });
      }

      case "disconnect": {
        await svc().from("connector_connections").delete().eq("id", body.connection_id).eq("user_id", user.id);
        return json({ disconnected: true });
      }

      // Internal platform diagnostics: never returns tokens, only their shape.
      case "diagnostics": {
        const { data: connections } = await svc()
          .from("connector_connections")
          .select("*")
          .eq("user_id", user.id);

        const rows = await Promise.all(
          (connections ?? []).map(async (connection: any) => {
            const cfg = PROVIDERS[connection.connector_id] ?? {};
            const creds: any = await Vault.get(connection.id);

            const { data: lastWebhook } = await svc()
              .from("connector_webhook_events")
              .select("created_at,event_type")
              .eq("connector_id", connection.connector_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { data: runs } = await svc()
              .from("connector_sync_runs")
              .select("status,duration_ms,items_upserted,created_at,capability,error")
              .eq("connection_id", connection.id)
              .order("created_at", { ascending: false })
              .limit(10);

            let latencyMs: number | null = null;
            let probeError: string | null = null;
            if (body.probe) {
              const endpoint = Object.values(cfg.endpoints ?? {})[0];
              if (endpoint) {
                const startedAt = Date.now();
                try {
                  await providerFetch(connection.connector_id, connection.id, endpoint.path, {
                    method: endpoint.method ?? "GET",
                    ...(endpoint.method === "POST"
                      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint.requestBody ?? {}) }
                      : {}),
                  });
                  latencyMs = Date.now() - startedAt;
                } catch (error) {
                  latencyMs = Date.now() - startedAt;
                  probeError = String((error as Error).message).slice(0, 300);
                }
              }
            }

            const durations = (runs ?? []).map((r: any) => r.duration_ms).filter((n: any) => typeof n === "number");

            return {
              connection_id: connection.id,
              connector_id: connection.connector_id,
              account: connection.display_name ?? connection.account_label,
              status: connection.status,
              health: connection.health,
              scopes: connection.scopes ?? [],
              last_error: connection.last_error,
              last_synced_at: connection.last_synced_at,
              auth: {
                kind: cfg.apiKeyEnv ? "api_key" : cfg.authUrl ? "oauth2" : "credentials",
                has_access_token: Boolean(creds?.access_token) || Boolean(cfg.apiKeyEnv),
                has_refresh_token: Boolean(creds?.refresh_token),
                token_expires_at: creds?.expires_at ?? null,
                token_expired: creds?.expires_at ? new Date(creds.expires_at).getTime() < Date.now() : false,
                credentials_updated_at: creds?.updated_at ?? null,
              },
              webhooks: {
                supported: Boolean(cfg.webhooks),
                last_event_at: lastWebhook?.created_at ?? null,
                last_event_type: lastWebhook?.event_type ?? null,
              },
              rate_limit_per_minute: cfg.rateLimitPerMinute ?? null,
              latency_ms: latencyMs,
              probe_error: probeError,
              recent_runs: runs ?? [],
              avg_duration_ms: durations.length
                ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
                : null,
            };
          }),
        );

        return json({ diagnostics: rows, generated_at: new Date().toISOString() });
      }

      case "status": {

        const { data: connection } = await svc()
          .from("connector_connections").select("*").eq("id", body.connection_id).eq("user_id", user.id).maybeSingle();
        if (!connection) return json({ status: "disconnected", health: "unknown" });
        try {
          const endpoint = Object.values(config.endpoints ?? {})[0];
          if (endpoint) {
            await providerFetch(connectorId, connection.id, endpoint.path, {
              method: endpoint.method ?? "GET",
              ...(endpoint.method === "POST"
                ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint.requestBody ?? {}) }
                : {}),
            });
          }

          await svc().from("connector_connections").update({ health: "healthy", last_error: null }).eq("id", connection.id);
          return json({ status: "connected", health: "healthy" });
        } catch (error) {
          const status = (error as any).status === 401 ? "needs_reauth" : "error";
          await svc().from("connector_connections")
            .update({ status, health: status === "needs_reauth" ? "degraded" : "failing", last_error: String((error as Error).message).slice(0, 500) })
            .eq("id", connection.id);
          return json({ status, health: status === "needs_reauth" ? "degraded" : "failing" });
        }
      }

      case "sync": {
        const { data: connection } = await svc()
          .from("connector_connections").select("*").eq("id", body.connection_id).eq("user_id", user.id).maybeSingle();
        if (!connection) return json({ error: "Connection not found", status: 404 }, 200);

        return json(await runSync(connection, body.capability));
      }

      case "search": {
        const { data: connection } = await svc()
          .from("connector_connections").select("*").eq("id", body.connection_id).eq("user_id", user.id).maybeSingle();
        if (!connection) return json({ error: "Connection not found", status: 404 }, 200);

        const cap = body.capability ?? Object.keys(config.endpoints ?? {})[0];
        const endpoint = config.endpoints?.[cap];
        if (!endpoint) return json({ records: [] });
        const path = endpoint.searchPath ? endpoint.searchPath(String(body.query ?? "")) : endpoint.path;
        const searchBody = endpoint.searchBody
          ? endpoint.searchBody(String(body.query ?? ""))
          : endpoint.requestBody;
        const payload = await providerFetch(connectorId, connection.id, path, {
          method: endpoint.method ?? "GET",
          ...(endpoint.method === "POST"
            ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(searchBody ?? {}) }
            : {}),
        });

        let found = endpoint.list(payload);
        if (endpoint.hydrate && found.length) {
          found = await endpoint.hydrate(found, (p) => providerFetch(connectorId, connection.id, p));
        }
        const records = found.map((item: any) => ({
          ...endpoint.map(item),
          record_type: endpoint.recordType,
          capability: cap,
        }));
        return json({ records });
      }

      case "execute": {
        const { data: connection } = await svc()
          .from("connector_connections").select("*").eq("id", body.connection_id).eq("user_id", user.id).maybeSingle();
        if (!connection) return json({ error: "Connection not found", status: 404 }, 200);
        const payload = (body.payload ?? {}) as { path?: string; method?: string; body?: unknown };
        if (!payload.path) return json({ error: "execute requires payload.path", status: 400 }, 200);
        const result = await providerFetch(connectorId, connection.id, payload.path, {
          method: payload.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: payload.body ? JSON.stringify(payload.body) : undefined,
        });
        return json(result);
      }

      default:
        return json({ error: `Unknown action "${body.action}"`, status: 400 }, 200);
    }
  } catch (error) {
    console.error("connector-hub error", error);
    const status = (error as any)?.status ?? 500;
    return json({ error: String((error as Error).message), status }, status === 401 ? 401 : 200);
  }
});

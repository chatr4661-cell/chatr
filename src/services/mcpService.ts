/**
 * CHATR MCP Client Service
 * Manages MCP API keys and provides a client for testing MCP tools
 */

import { supabase } from '@/integrations/supabase/client';

export interface McpApiKey {
  id: string;
  app_name: string;
  app_description: string | null;
  api_key_prefix: string;
  permissions: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
}

export interface McpRequestLog {
  id: string;
  tool_name: string;
  response_status: string;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const MCP_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatr-mcp-server`;

/**
 * Generate a new MCP API key for an external app
 */
export async function generateApiKey(appName: string, appDescription?: string, permissions?: string[]): Promise<{ apiKey: string; record: McpApiKey }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate a random API key
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const apiKey = 'cmcp_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  const prefix = apiKey.substring(0, 8);

  // Hash the key
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const defaultPermissions = [
    'messaging.read', 'messaging.send',
    'calls.read', 'calls.initiate',
    'notifications.send',
    'brain.query',
  ];

  const { data: record, error } = await supabase
    .from('mcp_api_keys')
    .insert({
      app_name: appName,
      app_description: appDescription || null,
      api_key_hash: hashHex,
      api_key_prefix: prefix,
      permissions: permissions || defaultPermissions,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create API key: ${error.message}`);

  return { apiKey, record: record as unknown as McpApiKey };
}

/**
 * List all MCP API keys for the current user
 */
export async function listApiKeys(): Promise<McpApiKey[]> {
  const { data, error } = await supabase
    .from('mcp_api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list API keys: ${error.message}`);
  return (data || []) as unknown as McpApiKey[];
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from('mcp_api_keys')
    .update({ is_active: false })
    .eq('id', keyId);

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`);
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from('mcp_api_keys')
    .delete()
    .eq('id', keyId);

  if (error) throw new Error(`Failed to delete API key: ${error.message}`);
}

/**
 * Get request logs for the current user's API keys
 */
export async function getRequestLogs(limit = 50): Promise<McpRequestLog[]> {
  const { data, error } = await supabase
    .from('mcp_request_logs')
    .select('id, tool_name, response_status, latency_ms, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get logs: ${error.message}`);
  return (data || []) as unknown as McpRequestLog[];
}

/**
 * Get the MCP server info/health check
 */
export async function getServerInfo(): Promise<Record<string, unknown>> {
  const response = await fetch(MCP_ENDPOINT, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

/**
 * Available MCP tool definitions for documentation
 */
export const MCP_TOOLS = {
  messaging: [
    { name: 'messaging_send', description: 'Send a message in a conversation' },
    { name: 'messaging_read', description: 'Read messages from a conversation' },
    { name: 'messaging_search', description: 'Search messages across conversations' },
    { name: 'messaging_list_conversations', description: 'List all conversations' },
  ],
  calls: [
    { name: 'calls_initiate', description: 'Initiate a voice or video call' },
    { name: 'calls_status', description: 'Get status of a call' },
    { name: 'calls_history', description: 'Get call history' },
    { name: 'calls_end', description: 'End an active call' },
  ],
  notifications: [
    { name: 'notifications_send', description: 'Send a push notification' },
    { name: 'notifications_schedule', description: 'Schedule a future notification' },
  ],
  brain: [
    { name: 'brain_query', description: 'Query CHATR Brain AI' },
    { name: 'brain_search', description: 'Web search via CHATR' },
  ],
  user: [
    { name: 'user_profile', description: 'Get user profile' },
    { name: 'contacts_list', description: 'List contacts' },
  ],
};

export const MCP_PERMISSIONS = [
  { value: 'messaging.read', label: 'Read Messages', category: 'Messaging' },
  { value: 'messaging.send', label: 'Send Messages', category: 'Messaging' },
  { value: 'calls.read', label: 'View Call History', category: 'Calls' },
  { value: 'calls.initiate', label: 'Make Calls', category: 'Calls' },
  { value: 'notifications.send', label: 'Send Notifications', category: 'Notifications' },
  { value: 'brain.query', label: 'Query AI Brain', category: 'Brain' },
];

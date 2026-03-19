/**
 * MCP Webhook Service
 * Manages webhooks for external event delivery
 */

import { supabase } from '@/integrations/supabase/client';

export interface McpWebhook {
  id: string;
  api_key_id: string;
  webhook_url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_failure_at: string | null;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  success: boolean;
  latency_ms: number | null;
  created_at: string;
}

export const MCP_WEBHOOK_EVENTS = [
  { value: 'message.received', label: 'Message Received', category: 'Messaging' },
  { value: 'message.sent', label: 'Message Sent', category: 'Messaging' },
  { value: 'message.deleted', label: 'Message Deleted', category: 'Messaging' },
  { value: 'call.incoming', label: 'Incoming Call', category: 'Calls' },
  { value: 'call.ended', label: 'Call Ended', category: 'Calls' },
  { value: 'call.missed', label: 'Missed Call', category: 'Calls' },
  { value: 'contact.added', label: 'Contact Added', category: 'Contacts' },
  { value: 'user.online', label: 'User Online', category: 'Presence' },
  { value: 'user.offline', label: 'User Offline', category: 'Presence' },
];

export async function createWebhook(
  apiKeyId: string,
  webhookUrl: string,
  events: string[],
): Promise<McpWebhook> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const secret = 'whsec_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

  const { data, error } = await (supabase as any)
    .from('mcp_webhooks')
    .insert({
      api_key_id: apiKeyId,
      user_id: user.id,
      webhook_url: webhookUrl,
      secret,
      events,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create webhook: ${error.message}`);
  return data as McpWebhook;
}

export async function listWebhooks(): Promise<McpWebhook[]> {
  const { data, error } = await (supabase as any)
    .from('mcp_webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list webhooks: ${error.message}`);
  return (data || []) as McpWebhook[];
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('mcp_webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) throw new Error(`Failed to delete webhook: ${error.message}`);
}

export async function toggleWebhook(webhookId: string, isActive: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from('mcp_webhooks')
    .update({ is_active: isActive })
    .eq('id', webhookId);

  if (error) throw new Error(`Failed to update webhook: ${error.message}`);
}

export async function getWebhookDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
  const { data, error } = await (supabase as any)
    .from('mcp_webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get deliveries: ${error.message}`);
  return (data || []) as WebhookDelivery[];
}

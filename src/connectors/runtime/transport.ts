import { supabase } from '@/integrations/supabase/client';
import { rateLimiter, withRetry } from './resilience';

/**
 * The only path from the client to a provider: the `connector-hub` edge
 * function. Tokens live in the server-side Credential Vault and never reach
 * the browser.
 */
export interface HubRequest {
  action:
    | 'oauth_start'
    | 'connect_credentials'
    | 'disconnect'
    | 'status'
    | 'sync'
    | 'search'
    | 'execute'
    | 'diagnostics';
  connector_id: string;
  connection_id?: string;
  capability?: string;
  query?: string;
  provider_action?: string;
  payload?: unknown;
  account_label?: string;
  credentials?: Record<string, string>;
  redirect_to?: string;
  /** diagnostics only: run a live latency probe against the provider. */
  probe?: boolean;
}

export async function callHub<T = any>(
  request: HubRequest,
  rateLimitPerMinute = 60,
): Promise<T> {
  await rateLimiter.acquire(request.connector_id, rateLimitPerMinute);

  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke('connector-hub', {
      body: request,
    });

    if (error) {
      const detail = (error as any)?.context
        ? await (error as any).context.text().catch(() => error.message)
        : error.message;
      const err = new Error(`connector-hub ${request.action} failed: ${detail}`);
      (err as any).status = (error as any)?.context?.status;
      throw err;
    }

    if (data?.error) {
      const err = new Error(String(data.error));
      (err as any).status = data.status;
      throw err;
    }

    return data as T;
  });
}

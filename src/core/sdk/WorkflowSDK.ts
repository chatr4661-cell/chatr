import type { TraceContext } from '@/core/runtime/TraceContext';

/**
 * Stage 1.5: WorkflowSDK
 *
 * Minimal, type-safe factory + registry for capability providers. A provider
 * groups a set of named handlers under a capability domain (e.g. 'travel')
 * and a provider kind (e.g. 'ExecutionProvider'). Handlers receive a payload
 * and an optional TraceContext so any events they publish stay correlated.
 */

export type ProviderHandler<TIn = any, TOut = any> = (
  payload: TIn,
  trace?: TraceContext,
) => Promise<TOut> | TOut;

export type ProviderHandlers = Record<string, ProviderHandler>;

export interface WorkflowProvider<H extends ProviderHandlers = ProviderHandlers> {
  id: string;
  name: string;
  capability: string;
  kind: string;
  handlers: H;
  /** Invoke a named handler with trace propagation. */
  invoke<K extends keyof H>(
    action: K,
    payload: Parameters<H[K]>[0],
    trace?: TraceContext,
  ): ReturnType<H[K]>;
}

class WorkflowSDKRegistry {
  private providers = new Map<string, WorkflowProvider>();

  createProvider<H extends ProviderHandlers>(
    id: string,
    name: string,
    capability: string,
    kind: string,
    handlers: H,
  ): WorkflowProvider<H> {
    const provider: WorkflowProvider<H> = {
      id,
      name,
      capability,
      kind,
      handlers,
      invoke(action, payload, trace) {
        const handler = handlers[action];
        if (!handler) {
          throw new Error(`[WorkflowSDK] Unknown action "${String(action)}" on provider "${id}"`);
        }
        return handler(payload, trace) as ReturnType<H[typeof action]>;
      },
    };
    return provider;
  }

  /** Register (or replace) a provider by capability domain. */
  register(provider: WorkflowProvider): void {
    this.providers.set(provider.capability, provider);
  }

  get(capability: string): WorkflowProvider | undefined {
    return this.providers.get(capability);
  }

  list(): WorkflowProvider[] {
    return [...this.providers.values()];
  }
}

export const WorkflowSDK = new WorkflowSDKRegistry();

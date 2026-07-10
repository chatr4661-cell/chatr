/**
 * Service adapter registration — wires durable/runtime adapters at boot.
 *
 * Call `initServiceAdapters()` once during app startup. It lazily imports
 * the Supabase-backed event store so the runtime stays decoupled from the
 * backend implementation.
 */
import { eventRuntime } from '../runtime/EventRuntime';

let initialized = false;

export async function initServiceAdapters(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const { SupabaseEventStore } = await import('../runtime/adapters/SupabaseEventStore');

    const eventStore = new SupabaseEventStore();
    eventRuntime.setStoreAdapter(eventStore);

    // Enable Realtime bindings (Stage 1.3)
    eventStore.enableRealtimeBroadcast();

    console.info('[ServiceAdapters] Event store adapter registered');
  } catch (err) {
    initialized = false;
    console.error('[ServiceAdapters] Failed to initialize adapters:', err);
  }
}

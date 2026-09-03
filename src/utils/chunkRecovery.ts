/**
 * Chunk / stale-deploy recovery.
 *
 * After a deploy, a browser (or service worker) holding a stale index.html will
 * request hashed JS chunks that no longer exist. The module script then fails to
 * load and React never mounts — the user sees "Something went wrong".
 *
 * This installs a one-shot self-heal: purge all caches, unregister service
 * workers, then reload with a cache-busting query. Guarded by sessionStorage so
 * it can never loop.
 */

const FLAG = 'chatr_chunk_recovery_at';
const COOLDOWN_MS = 60_000;

function isStaleAssetError(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('error loading dynamically imported module') ||
    m.includes('failed to load module script') ||
    m.includes('expected a javascript') ||
    m.includes('importing a module script failed') ||
    m.includes('unexpected token \'<\'') ||
    m.includes('mime type')
  );
}

async function recover(): Promise<void> {
  const last = Number(sessionStorage.getItem(FLAG) || 0);
  if (Date.now() - last < COOLDOWN_MS) return; // already tried — don't loop
  sessionStorage.setItem(FLAG, String(Date.now()));

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* best effort */
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_r', String(Date.now()));
  window.location.replace(url.toString());
}

export function installChunkRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    // Failed <script type="module"> / <link> element
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      void recover();
      return;
    }
    if (isStaleAssetError(event.message)) void recover();
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = event.reason;
    const message = typeof reason === 'string' ? reason : reason?.message || '';
    if (isStaleAssetError(message)) void recover();
  });
}

export const attemptChunkRecovery = recover;

/**
 * Shared CHATR auth configuration.
 *
 * Every CHATR client (chatr.chat, chatrchat.in, desktop, Android, iOS, macOS)
 * MUST resolve auth against the SAME Firebase project and the SAME backend
 * project. Values can be overridden per-deployment via env vars, but the
 * defaults below are the canonical production identifiers — do not fork them.
 */

const env = (import.meta as any).env ?? {};

/** Canonical production Firebase project shared by all CHATR clients. */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDUUbQlOmkHsrEyMw9AmQBXbjNx11iM7w4',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'chatr-91067.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'chatr-91067',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'chatr-91067.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '839345688435',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:839345688435:web:17283f3299c22c1c233f06',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-XXXXXXXXXX',
};

/** Backend (session exchange + profiles + roles) shared by all clients. */
export const backendConfig = {
  url: env.VITE_SUPABASE_URL as string | undefined,
  publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
};

/** Edge function that exchanges a verified Firebase user for a backend JWT. */
export const SESSION_EXCHANGE_FUNCTION = 'firebase-phone-auth';

/**
 * Production domains that must be present in Firebase Authorized Domains and
 * in the backend auth redirect allow-list. Keep this list as the single source
 * of truth when onboarding a new CHATR surface.
 */
export const CHATR_AUTH_DOMAINS = [
  'chatr.chat',
  'www.chatr.chat',
  'chatrchat.in',
  'www.chatrchat.in',
  'localhost',
  '127.0.0.1',
] as const;

export const isAuthorizedAuthDomain = (hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean =>
  CHATR_AUTH_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));

/** Same-origin redirect target after auth, works on every CHATR domain. */
export const authRedirectUrl = (path = '/'): string =>
  typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

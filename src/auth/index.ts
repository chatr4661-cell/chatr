/**
 * CHATR shared authentication module.
 *
 * ONE auth codebase for every CHATR client — chatr.chat, chatrchat.in, desktop,
 * Android, iOS and macOS all import from here. Do not fork or duplicate this
 * flow per domain: same Firebase project, same backend project, same profiles,
 * roles, device sessions and onboarding records.
 *
 * Flow: Firebase Phone Auth (native SDK on Android/iOS, invisible reCAPTCHA on
 * web) → edge-function session exchange → backend JWT session.
 *
 * When this module is later hoisted into `packages/auth`, this file becomes the
 * package entrypoint and nothing in app code needs to change.
 */

export * from './config';
export { auth, googleProvider, db, messaging, default as firebaseApp } from './firebase';
export { useFirebasePhoneAuth } from './useFirebasePhoneAuth';
export type { PhoneAuthStep } from './useFirebasePhoneAuth';
export {
  getSession,
  getUser,
  onAuthStateChange,
  setSessionFromTokens,
  exchangeFirebaseSession,
  signOut,
} from './SessionManager';
export {
  getFingerprint,
  registerCurrentDevice,
  findActiveDeviceSession,
  deactivateCurrentDevice,
} from './DeviceManager';
export { AuthProvider, useAuth } from './AuthProvider';
export { useBiometricAuth } from '@/hooks/useBiometricAuth';

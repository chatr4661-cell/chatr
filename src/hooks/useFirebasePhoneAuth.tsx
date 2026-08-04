// Compatibility shim — the phone auth hook now lives in the shared auth module.
// Import from '@/auth' in new code.
export { useFirebasePhoneAuth } from '@/auth/useFirebasePhoneAuth';
export type { PhoneAuthStep } from '@/auth/useFirebasePhoneAuth';

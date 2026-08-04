// Compatibility shim — canonical Firebase init lives in the shared auth module.
// Import from '@/auth' in new code.
export { auth, googleProvider, db, messaging, default } from '@/auth/firebase';

// Compatibility shim — logout is part of the shared auth module (SessionManager).
// Import { signOut } from '@/auth' in new code.
import { signOut } from '@/auth/SessionManager';

export async function performLogout(): Promise<void> {
  await signOut();
}

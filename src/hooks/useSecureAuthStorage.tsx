import { useCallback } from 'react';
import { useSecureStorageNative } from '@/hooks/native/useSecureStorageNative';

/**
 * Secure token manager using native keychain/keystore
 * Replaces localStorage for auth tokens
 */
export const useSecureAuthStorage = () => {
  const { set, get, remove } = useSecureStorageNative();

  const saveAuthToken = useCallback(async (token: string) => {
    return await set('auth_token', token);
  }, [set]);

  const getAuthToken = useCallback(async () => {
    return await get('auth_token');
  }, [get]);

  const saveRefreshToken = useCallback(async (token: string) => {
    return await set('refresh_token', token);
  }, [set]);

  const getRefreshToken = useCallback(async () => {
    return await get('refresh_token');
  }, [get]);

  const saveUserSession = useCallback(async (session: any) => {
    return await set('user_session', JSON.stringify(session));
  }, [set]);

  const getUserSession = useCallback(async () => {
    const session = await get('user_session');
    return session ? JSON.parse(session) : null;
  }, [get]);

  const clearAuthData = useCallback(async () => {
    await remove('auth_token');
    await remove('refresh_token');
    await remove('user_session');
  }, [remove]);

  return {
    saveAuthToken,
    getAuthToken,
    saveRefreshToken,
    getRefreshToken,
    saveUserSession,
    getUserSession,
    clearAuthData
  };
};

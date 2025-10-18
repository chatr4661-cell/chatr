// Auth debugging utilities
export const logAuthEvent = (event: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH ${timestamp}] ${event}`, data || '');
};

export const logAuthError = (context: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[AUTH ERROR ${timestamp}] ${context}:`, error);
};

export const logSessionInfo = async (supabase: any) => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    logAuthError('Session fetch', error);
    return null;
  }

  if (session) {
    logAuthEvent('Session found', {
      userId: session.user.id,
      email: session.user.email,
      provider: session.user.app_metadata?.provider,
      providers: session.user.app_metadata?.providers,
    });
  } else {
    logAuthEvent('No active session');
  }

  return session;
};

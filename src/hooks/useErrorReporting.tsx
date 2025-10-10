import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ErrorReport {
  message: string;
  stack?: string;
  component?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export const useErrorReporting = () => {
  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      reportError({
        message: event.message,
        stack: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        metadata: {
          type: 'unhandledRejection',
        },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const reportError = async (error: ErrorReport) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('Error reported:', error);
      }

      // Send to backend for production logging
      if (!import.meta.env.DEV) {
        await supabase.from('error_logs').insert({
          user_id: user?.id,
          message: error.message,
          stack: error.stack,
          component: error.component,
          metadata: error.metadata,
          user_agent: navigator.userAgent,
          url: window.location.href,
        });
      }
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  };

  return { reportError };
};

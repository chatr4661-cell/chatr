import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const hasLocalSession = () => {
  try {
    const isExplicit = localStorage.getItem('chatr_explicit_signout') === '1' || sessionStorage.getItem('chatr_explicit_signout') === '1';
    if (isExplicit) return false;
    return Object.keys(localStorage).some(
      (k) => (k.startsWith('sb-') || k.includes('auth-token') || k === 'chatr_permanent_session_vault') && !!localStorage.getItem(k)
    );
  } catch {
    return false;
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(() =>
    hasLocalSession() ? true : null
  );
  const location = useLocation();

  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      } else {
        const isExplicit = localStorage.getItem('chatr_explicit_signout') === '1' || sessionStorage.getItem('chatr_explicit_signout') === '1';
        setIsAuthenticated(!isExplicit && hasLocalSession());
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        const isExplicit = localStorage.getItem('chatr_explicit_signout') === '1' || sessionStorage.getItem('chatr_explicit_signout') === '1';
        if (isExplicit || !hasLocalSession()) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

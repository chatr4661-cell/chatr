// React not needed - using JSX transform
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  context?: string;
}

export const ErrorFallback = ({ error, resetErrorBoundary, context }: ErrorFallbackProps) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    resetErrorBoundary();
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">
            {context ? `Error in ${context}` : 'Something went wrong'}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">
              We're sorry, but something unexpected happened. This has been logged and we'll look into it.
            </p>
            
            {isDevelopment && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-40">
                  <p className="font-bold">{error.name}</p>
                  <p className="text-destructive">{error.message}</p>
                  {error.stack && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={resetErrorBoundary}
            className="flex-1"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button
            onClick={handleGoHome}
            className="flex-1"
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  );
};

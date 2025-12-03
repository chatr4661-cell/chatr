import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary that wraps the entire app
 * Provides a user-friendly error screen with recovery options
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Global Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });

    // Log to analytics/crashlytics in production
    if (typeof window !== 'undefined' && (window as any).FirebaseCrashlytics) {
      try {
        (window as any).FirebaseCrashlytics.recordException({
          message: error.message,
          stacktrace: error.stack || '',
        });
      } catch (e) {
        // Silently fail if crashlytics not available
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <img 
                src={chatrIconLogo} 
                alt="Chatr" 
                className="h-16 w-16 opacity-50"
                width={64}
                height={64}
              />
            </div>

            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                We're sorry, but something unexpected happened. Please try one of the options below.
              </p>
            </div>

            {/* Error Details (collapsible in dev) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-muted/50 rounded-lg p-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground font-medium">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto max-h-32 text-destructive">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-col gap-3">
              <Button onClick={this.handleReset} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button onClick={this.handleReload} variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              
              <Button onClick={this.handleGoHome} variant="ghost" className="w-full gap-2">
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </div>

            {/* Support Link */}
            <p className="text-xs text-muted-foreground">
              If this keeps happening, please{' '}
              <a href="/contact" className="text-primary hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

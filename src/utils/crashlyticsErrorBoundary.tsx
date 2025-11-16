import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary that reports crashes to Crashlytics
 */
export class CrashlyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Report to Crashlytics on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseCrashlytics.recordException({
          message: error.message
        });

        await FirebaseCrashlytics.log({
          message: errorInfo.componentStack || 'N/A'
        });

        await FirebaseCrashlytics.setCustomKey({
          key: 'component_stack',
          value: errorInfo.componentStack || 'N/A',
          type: 'string'
        });
      } catch (err) {
        console.error('Failed to report to Crashlytics:', err);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6">
              We've been notified and will fix this soon.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

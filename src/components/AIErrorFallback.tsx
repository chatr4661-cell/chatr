import React from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AIErrorFallbackProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export function AIErrorFallback({ 
  error, 
  onRetry, 
  title = "AI Assistant Unavailable",
  message 
}: AIErrorFallbackProps) {
  const getErrorMessage = () => {
    if (message) return message;
    
    const errorStr = typeof error === 'string' ? error : error?.message || '';
    
    if (errorStr.includes('429') || errorStr.includes('rate limit')) {
      return 'The AI service is experiencing high demand. Please try again in a few moments.';
    }
    
    if (errorStr.includes('402') || errorStr.includes('payment')) {
      return 'AI service credits are needed. Please contact support or try again later.';
    }
    
    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return 'Unable to connect to the AI service. Please check your internet connection.';
    }
    
    return 'The AI assistant is temporarily unavailable. You can still use other features.';
  };

  return (
    <Card className="p-6 bg-muted/50 border-muted">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{getErrorMessage()}</p>
          </div>
          
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href="/help" target="_blank">
                <HelpCircle className="h-4 w-4 mr-2" />
                Get Help
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

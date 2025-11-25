import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchX, Sparkles, Shield, Zap } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchCount: number;
  maxSearches: number;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  searchCount,
  maxSearches,
}) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    // Store the current path to redirect back after login
    sessionStorage.setItem('auth_redirect', '/home');
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full">
                <SearchX className="w-12 h-12 text-primary" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Search Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center space-y-4">
            <p className="text-base">
              You've used all <span className="font-semibold text-foreground">{maxSearches} free searches</span>. 
              Sign in to unlock unlimited searches and more features!
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="space-y-3 my-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Unlimited Searches</p>
              <p className="text-xs text-muted-foreground">Search as much as you want, anytime</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Save Search History</p>
              <p className="text-xs text-muted-foreground">Access your searches across devices</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
            <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Personalized Results</p>
              <p className="text-xs text-muted-foreground">Get better, smarter recommendations</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSignIn}
            className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            size="lg"
          >
            Sign In to Continue
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Sign in with phone number or Google account
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  QrCode, 
  Bot, 
  AlertTriangle, 
  Zap, 
  X,
  Sparkles,
  Shield,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickAccessMenuProps {
  className?: string;
}

export const QuickAccessMenu: React.FC<QuickAccessMenuProps> = ({ className }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const quickActions = [
    {
      id: 'qr-login',
      title: 'QR Login',
      description: 'Scan to login on desktop',
      icon: QrCode,
      color: 'from-blue-500 to-cyan-500',
      route: '/qr-login',
      badge: 'Quick'
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      description: 'Chat with health AI',
      icon: Bot,
      color: 'from-purple-500 to-pink-500',
      route: '/ai-assistant',
      badge: 'Smart'
    },
    {
      id: 'emergency',
      title: 'Emergency',
      description: 'Quick access to help',
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500',
      route: '/emergency',
      badge: 'SOS'
    }
  ];

  const handleActionClick = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative rounded-full ${className}`}
        >
          <Zap className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l-0">
        <div className="h-full bg-gradient-to-br from-background via-primary/5 to-accent/10">
          {/* Header */}
          <div className="p-6 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Quick Access</h2>
                  <p className="text-xs text-muted-foreground">Essential features at your fingertips</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="p-6 space-y-4">
            <AnimatePresence>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className="p-0 overflow-hidden cursor-pointer group hover:shadow-lg transition-all border-glass-border bg-gradient-card backdrop-blur-glass"
                      onClick={() => handleActionClick(action.route)}
                    >
                      <div className="p-4 flex items-center gap-4">
                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {action.title}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {action.badge}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {action.description}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Info Cards */}
            <div className="mt-8 space-y-3">
              <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure & Private</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All quick access features are end-to-end encrypted
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Always Available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Access these features anytime, even offline
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
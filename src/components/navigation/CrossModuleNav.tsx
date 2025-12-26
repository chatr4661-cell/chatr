import { Link, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  Heart, 
  Briefcase, 
  Wallet, 
  ShoppingBag,
  Gamepad2,
  Users,
  Bot,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleLink {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

// Smart contextual navigation flows
const MODULE_FLOWS: Record<string, ModuleLink[]> = {
  // Health → Doctor → Booking → Payment
  '/health': [
    { label: 'Book Doctor', path: '/care', icon: <Heart className="w-4 h-4" />, description: 'Find healthcare providers' },
    { label: 'Pay with ChatrPay', path: '/chatr-wallet', icon: <Wallet className="w-4 h-4" />, description: 'Secure payments' },
  ],
  '/care': [
    { label: 'ChatrPay', path: '/chatr-wallet', icon: <Wallet className="w-4 h-4" />, description: 'Pay for services' },
    { label: 'Health Records', path: '/health-passport', icon: <Heart className="w-4 h-4" />, description: 'View your records' },
  ],
  '/local-healthcare': [
    { label: 'Book Appointment', path: '/booking', icon: <Heart className="w-4 h-4" />, description: 'Schedule visit' },
    { label: 'Emergency', path: '/emergency-services', icon: <Heart className="w-4 h-4" />, description: 'Get help now' },
  ],
  
  // Jobs → Resume → Companies → Skills
  '/jobs': [
    { label: 'Upskill', path: '/tutors', icon: <Briefcase className="w-4 h-4" />, description: 'Learn new skills' },
    { label: 'Networking', path: '/communities', icon: <Users className="w-4 h-4" />, description: 'Professional groups' },
  ],
  
  // Shopping → Cart → Payment → Rewards
  '/marketplace': [
    { label: 'ChatrPay', path: '/chatr-wallet', icon: <Wallet className="w-4 h-4" />, description: 'Checkout' },
    { label: 'Earn Rewards', path: '/points', icon: <ShoppingBag className="w-4 h-4" />, description: 'Get cashback' },
  ],
  '/home-services': [
    { label: 'Pay Now', path: '/chatr-wallet', icon: <Wallet className="w-4 h-4" />, description: 'Secure payment' },
    { label: 'Book Again', path: '/booking', icon: <ShoppingBag className="w-4 h-4" />, description: 'Quick rebooking' },
  ],
  
  // Gaming → Points → Rewards
  '/chatr-games': [
    { label: 'Chatr Points', path: '/points', icon: <Gamepad2 className="w-4 h-4" />, description: 'Earn while playing' },
    { label: 'Redeem', path: '/rewards', icon: <ShoppingBag className="w-4 h-4" />, description: 'Use your rewards' },
  ],
  
  // Studio → Seller Mode → Marketplace
  '/chatr-studio': [
    { label: 'Seller Mode', path: '/stealth-mode', icon: <Palette className="w-4 h-4" />, description: 'Activate selling' },
    { label: 'List Products', path: '/marketplace', icon: <ShoppingBag className="w-4 h-4" />, description: 'Start selling' },
  ],
  
  // AI Agents → Assistant → Browser
  '/ai-agents': [
    { label: 'AI Assistant', path: '/ai-assistant', icon: <Bot className="w-4 h-4" />, description: 'Get help' },
    { label: 'AI Browser', path: '/ai-browser', icon: <Bot className="w-4 h-4" />, description: 'Smart search' },
  ],
  
  // Wallet → Rewards → Shopping
  '/chatr-wallet': [
    { label: 'Earn More', path: '/points', icon: <Wallet className="w-4 h-4" />, description: 'Get rewards' },
    { label: 'Shop Now', path: '/marketplace', icon: <ShoppingBag className="w-4 h-4" />, description: 'Use balance' },
  ],
  '/points': [
    { label: 'Redeem', path: '/rewards', icon: <ShoppingBag className="w-4 h-4" />, description: 'Use your points' },
    { label: 'Play Games', path: '/chatr-games', icon: <Gamepad2 className="w-4 h-4" />, description: 'Earn more' },
  ],
  
  // Communities → Stories → Youth
  '/communities': [
    { label: 'Stories', path: '/stories', icon: <Users className="w-4 h-4" />, description: 'Share updates' },
    { label: 'Youth Hub', path: '/youth', icon: <Users className="w-4 h-4" />, description: 'Connect' },
  ],
};

interface CrossModuleNavProps {
  variant?: 'inline' | 'footer' | 'sidebar';
  showDescription?: boolean;
}

export const CrossModuleNav = ({ 
  variant = 'inline',
  showDescription = true 
}: CrossModuleNavProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Find matching flow
  let moduleLinks = MODULE_FLOWS[currentPath];
  
  // Try parent path if no exact match
  if (!moduleLinks) {
    const parentPath = '/' + currentPath.split('/')[1];
    moduleLinks = MODULE_FLOWS[parentPath];
  }

  if (!moduleLinks || moduleLinks.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2 py-3">
        {moduleLinks.map((link) => (
          <Link key={link.path} to={link.path}>
            <Button variant="outline" size="sm" className="gap-2">
              {link.icon}
              {link.label}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        ))}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="border-t border-border mt-6 pt-4">
        <p className="text-sm text-muted-foreground mb-3">Continue your journey</p>
        <div className="flex flex-col gap-2">
          {moduleLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                {link.icon}
                <div>
                  <p className="font-medium text-sm">{link.label}</p>
                  {showDescription && (
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Quick Actions
      </p>
      {moduleLinks.map((link) => (
        <Link 
          key={link.path} 
          to={link.path}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
        >
          {link.icon}
          <span>{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

// Export flow data for external use
export const getModuleFlow = (path: string): ModuleLink[] => {
  return MODULE_FLOWS[path] || MODULE_FLOWS['/' + path.split('/')[1]] || [];
};

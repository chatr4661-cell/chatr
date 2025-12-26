import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RelatedItem {
  title: string;
  description: string;
  path: string;
  icon?: React.ReactNode;
}

// Cross-module related content mapping
const RELATED_CONTENT: Record<string, RelatedItem[]> = {
  '/health': [
    { title: 'Book a Doctor', description: 'Find and book healthcare providers', path: '/care' },
    { title: 'Medicine Reminders', description: 'Never miss your medications', path: '/medicine-reminders' },
    { title: 'Lab Reports', description: 'View and manage lab results', path: '/lab-reports' },
    { title: 'Emergency Services', description: 'Quick access to emergency care', path: '/emergency-services' },
  ],
  '/care': [
    { title: 'Health Hub', description: 'Track your wellness journey', path: '/health' },
    { title: 'ChatrPay Wallet', description: 'Pay for healthcare services', path: '/chatr-wallet' },
    { title: 'Local Healthcare', description: 'Find nearby clinics', path: '/local-healthcare' },
    { title: 'Health Passport', description: 'Your medical records', path: '/health-passport' },
  ],
  '/jobs': [
    { title: 'AI Browser', description: 'Search for more opportunities', path: '/ai-browser' },
    { title: 'Chatr Points', description: 'Earn rewards for applications', path: '/points' },
    { title: 'Communities', description: 'Join professional networks', path: '/communities' },
    { title: 'Tutors', description: 'Upskill for better jobs', path: '/tutors' },
  ],
  '/chatr-wallet': [
    { title: 'Rewards', description: 'Redeem your points', path: '/rewards' },
    { title: 'QR Payment', description: 'Scan to pay instantly', path: '/qr-payment' },
    { title: 'Marketplace', description: 'Shop with ChatrPay', path: '/marketplace' },
    { title: 'Home Services', description: 'Book and pay for services', path: '/home-services' },
  ],
  '/communities': [
    { title: 'Stories', description: 'Share with your community', path: '/stories' },
    { title: 'Youth Hub', description: 'Connect with young minds', path: '/youth' },
    { title: 'Wellness Circles', description: 'Health-focused groups', path: '/wellness-circles' },
    { title: 'Expert Sessions', description: 'Learn from professionals', path: '/expert-sessions' },
  ],
  '/ai-agents': [
    { title: 'AI Assistant', description: 'Your personal AI helper', path: '/ai-assistant' },
    { title: 'AI Browser', description: 'Smart web search', path: '/ai-browser' },
    { title: 'Chatr Games', description: 'AI-powered games', path: '/chatr-games' },
    { title: 'Developer Portal', description: 'Build with AI', path: '/developer-portal' },
  ],
  '/settings': [
    { title: 'Privacy', description: 'Manage your privacy', path: '/privacy' },
    { title: 'Notifications', description: 'Customize alerts', path: '/notification-settings' },
    { title: 'Device Management', description: 'Manage connected devices', path: '/device-management' },
    { title: 'Account', description: 'Account settings', path: '/account' },
  ],
  '/chatr-studio': [
    { title: 'Stealth Mode', description: 'Seller tools and analytics', path: '/stealth-mode' },
    { title: 'Official Accounts', description: 'Build your brand', path: '/official-accounts' },
    { title: 'Marketplace', description: 'List your products', path: '/marketplace' },
    { title: 'Growth', description: 'Grow your business', path: '/growth' },
  ],
  '/chatr-games': [
    { title: 'Chatr Points', description: 'Earn while you play', path: '/points' },
    { title: 'Rewards', description: 'Redeem gaming rewards', path: '/rewards' },
    { title: 'Communities', description: 'Join gaming groups', path: '/communities' },
    { title: 'AI Agents', description: 'Challenge AI opponents', path: '/ai-agents' },
  ],
};

interface RelatedContentProps {
  currentPath?: string;
  title?: string;
  maxItems?: number;
}

export const RelatedContent = ({ 
  currentPath, 
  title = 'Related Features',
  maxItems = 4 
}: RelatedContentProps) => {
  const path = currentPath || window.location.pathname;
  
  // Find related content for current path
  let relatedItems = RELATED_CONTENT[path];
  
  // Try parent path if exact match not found
  if (!relatedItems) {
    const parentPath = '/' + path.split('/')[1];
    relatedItems = RELATED_CONTENT[parentPath];
  }

  if (!relatedItems || relatedItems.length === 0) return null;

  const itemsToShow = relatedItems.slice(0, maxItems);

  return (
    <section className="py-6 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {itemsToShow.map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{item.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

// Export related content map for external use
export const getRelatedContent = (path: string): RelatedItem[] => {
  return RELATED_CONTENT[path] || RELATED_CONTENT['/' + path.split('/')[1]] || [];
};

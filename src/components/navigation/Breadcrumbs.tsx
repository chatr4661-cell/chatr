import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

// Route to breadcrumb mapping
const ROUTE_LABELS: Record<string, string> = {
  '': 'Home',
  'chat': 'Chat',
  'contacts': 'Contacts',
  'global-contacts': 'Global Contacts',
  'call-history': 'Call History',
  'smart-inbox': 'Smart Inbox',
  'stories': 'Stories',
  'communities': 'Communities',
  'create-community': 'Create Community',
  'health': 'Health Hub',
  'wellness-tracking': 'Wellness Tracking',
  'health-passport': 'Health Passport',
  'lab-reports': 'Lab Reports',
  'medicine-reminders': 'Medicine Reminders',
  'care': 'Care Access',
  'booking': 'Booking',
  'provider-portal': 'Provider Portal',
  'provider-register': 'Provider Registration',
  'allied-healthcare': 'Allied Healthcare',
  'local-healthcare': 'Local Healthcare',
  'marketplace': 'Marketplace',
  'home-services': 'Home Services',
  'native-apps': 'Native Apps',
  'app-statistics': 'App Statistics',
  'developer-portal': 'Developer Portal',
  'jobs': 'Jobs',
  'ai-agents': 'AI Agents',
  'ai-assistant': 'AI Assistant',
  'ai-browser': 'AI Browser',
  'official-accounts': 'Official Accounts',
  'tutors': 'Tutors',
  'points': 'Chatr Points',
  'rewards': 'Rewards',
  'growth': 'Growth',
  'ambassador': 'Ambassador',
  'youth': 'Youth',
  'youth-feed': 'Youth Feed',
  'settings': 'Settings',
  'account': 'Account',
  'privacy': 'Privacy',
  'notifications': 'Notifications',
  'notification-settings': 'Notification Settings',
  'device-management': 'Device Management',
  'geofences': 'Geofences',
  'geofence-history': 'Geofence History',
  'qr-payment': 'QR Payment',
  'qr-login': 'QR Login',
  'download': 'Download',
  'install': 'Install',
  'onboarding': 'Onboarding',
  'emergency': 'Emergency',
  'emergency-services': 'Emergency Services',
  'wellness-circles': 'Wellness Circles',
  'expert-sessions': 'Expert Sessions',
  'admin': 'Admin',
  'about': 'About',
  'help': 'Help',
  'contact': 'Contact',
  'terms': 'Terms',
  'privacy-policy': 'Privacy Policy',
  'refund': 'Refund Policy',
  'disclaimer': 'Disclaimer',
  'chatr-world': 'Chatr World',
  'chatr-wallet': 'ChatrPay Wallet',
  'chatr-studio': 'Chatr Studio',
  'chatr-games': 'Chatr Games',
  'stealth-mode': 'Stealth Mode',
  'profile': 'Profile',
};

// Parent routes for hierarchy
const ROUTE_PARENTS: Record<string, string> = {
  'wellness-tracking': 'health',
  'health-passport': 'health',
  'lab-reports': 'health',
  'medicine-reminders': 'health',
  'local-healthcare': 'care',
  'allied-healthcare': 'care',
  'booking': 'care',
  'provider-portal': 'care',
  'provider-register': 'care',
  'emergency-services': 'care',
  'wellness-circles': 'health',
  'expert-sessions': 'health',
  'create-community': 'communities',
  'youth-feed': 'youth',
  'notification-settings': 'settings',
  'device-management': 'settings',
  'geofence-history': 'geofences',
  'app-statistics': 'native-apps',
  'developer-portal': 'native-apps',
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) return null;

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
    
    let currentPath = '';
    const addedPaths = new Set<string>();

    pathSegments.forEach((segment, index) => {
      // Check if this segment has a parent that should come first
      const parentRoute = ROUTE_PARENTS[segment];
      if (parentRoute && !addedPaths.has(parentRoute)) {
        breadcrumbs.push({
          label: ROUTE_LABELS[parentRoute] || parentRoute,
          path: `/${parentRoute}`,
        });
        addedPaths.add(parentRoute);
      }

      currentPath += `/${segment}`;
      
      // Skip dynamic segments (UUIDs, IDs)
      if (segment.length > 20 || /^[0-9a-f-]+$/.test(segment)) {
        return;
      }

      if (!addedPaths.has(segment)) {
        breadcrumbs.push({
          label: ROUTE_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          path: currentPath,
        });
        addedPaths.add(segment);
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 text-sm">
      <ol className="flex items-center gap-1 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        {breadcrumbs.map((crumb, index) => (
          <li 
            key={crumb.path} 
            className="flex items-center"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span 
                className="text-foreground font-medium"
                itemProp="name"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                itemProp="item"
              >
                {index === 0 && <Home className="w-3 h-3" />}
                <span itemProp="name">{crumb.label}</span>
              </Link>
            )}
            <meta itemProp="position" content={String(index + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  );
};

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';

const Marketplace = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Marketplace - Medicines & Health Products | Chatr"
        description="Shop for medicines, health products, and wellness items. Fast delivery and quality products."
        keywords="marketplace, medicines, health products, online pharmacy, wellness"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Marketplace', url: '/marketplace' }
        ]}
      />
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Medicines and health products</p>
          </div>
          <ShareDeepLink path="/marketplace" title="Chatr Marketplace" />
        </div>
      </div>
      
      <Breadcrumbs />

      {/* Service Categories Grid */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">All Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Redirect to HomeServices for now - can be customized later */}
            <p className="col-span-full text-center text-muted-foreground">
              Marketplace coming soon! Visit{' '}
              <span 
                className="text-primary cursor-pointer hover:underline"
                onClick={() => navigate('/home-services')}
              >
                Local Services
              </span>
              {' '}for now.
            </p>
          </div>
          
          {/* Cross-Module Navigation */}
          <CrossModuleNav variant="footer" />
        </div>
      </div>
    </div>
    </>
  );
};

export default Marketplace;

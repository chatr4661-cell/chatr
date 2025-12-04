import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';

const Communities = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Communities - Connect & Share | Chatr"
        description="Join communities, share experiences, and connect with like-minded people. Discover groups for health, careers, hobbies, and more."
        keywords="communities, groups, social, connect, share, discussion"
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Communities', url: '/communities' }
        ]}
      />
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">Communities</h1>
          <ShareDeepLink path="/communities" title="Chatr Communities" />
        </div>
      </div>
      
      <Breadcrumbs />

      {/* Communities Explorer */}
      {user && <CommunitiesExplorer userId={user.id} />}
      
      {/* Cross-Module Navigation */}
      <div className="px-4 pb-4">
        <CrossModuleNav variant="footer" />
      </div>
    </div>
    </>
  );
};

export default Communities;
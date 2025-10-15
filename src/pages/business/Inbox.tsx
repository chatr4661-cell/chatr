import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BusinessInbox } from '@/components/business/BusinessInbox';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function InboxPage() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        navigate('/business/onboard');
        return;
      }

      setBusinessId(profile.id);
    } catch (error) {
      console.error('Error loading business profile:', error);
      navigate('/business/onboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/business')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {businessId && <BusinessInbox businessId={businessId} />}
      </div>
    </div>
  );
}

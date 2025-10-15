import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, ArrowLeft, Users, TrendingUp, 
  DollarSign, Target, LayoutGrid, LayoutList 
} from 'lucide-react';
import { LeadsList } from '@/components/crm/LeadsList';
import { PipelineView } from '@/components/crm/PipelineView';
import { CreateLeadDialog } from '@/components/crm/CreateLeadDialog';

interface CRMStats {
  total_leads: number;
  active_leads: number;
  won_deals: number;
  total_value: number;
}

export default function CRMPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CRMStats>({
    total_leads: 0,
    active_leads: 0,
    won_deals: 0,
    total_value: 0
  });
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'won' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
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
      await loadStats(profile.id);
    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load CRM data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (bizId: string) => {
    try {
      const { count: totalCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bizId);

      const { count: activeCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bizId)
        .in('status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation']);

      const { count: wonCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', bizId)
        .eq('status', 'won');

      const { data: valueData } = await supabase
        .from('crm_leads')
        .select('deal_value')
        .eq('business_id', bizId)
        .eq('status', 'won');

      const totalValue = valueData?.reduce((sum, lead) => sum + (Number(lead.deal_value) || 0), 0) || 0;

      setStats({
        total_leads: totalCount || 0,
        active_leads: activeCount || 0,
        won_deals: wonCount || 0,
        total_value: totalValue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/business')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">CRM</h1>
                <p className="text-sm text-muted-foreground">Manage your leads and customers</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Leads</span>
              </div>
              <p className="text-2xl font-bold">{stats.total_leads}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <p className="text-2xl font-bold">{stats.active_leads}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Won Deals</span>
              </div>
              <p className="text-2xl font-bold">{stats.won_deals}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Value</span>
              </div>
              <p className="text-2xl font-bold">₹{stats.total_value.toLocaleString()}</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Tabs value={filter} onValueChange={(value: any) => setFilter(value)} className="flex-1 md:flex-none">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="won">Won</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="h-8 w-8 p-0"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'pipeline' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('pipeline')}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {businessId && (
          view === 'list' ? (
            <LeadsList 
              businessId={businessId} 
              filter={filter}
              searchQuery={searchQuery}
              onLeadCreated={() => loadStats(businessId)}
            />
          ) : (
            <PipelineView 
              businessId={businessId}
              onLeadUpdated={() => loadStats(businessId)}
            />
          )
        )}
      </div>

      <CreateLeadDialog
        businessId={businessId || ''}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onLeadCreated={() => {
          loadStats(businessId || '');
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}

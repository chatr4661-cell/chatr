import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, GripVertical } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  status: string;
  deal_value: number | null;
  priority: string | null;
  probability: number | null;
}

interface PipelineViewProps {
  businessId: string;
  onLeadUpdated: () => void;
}

const STAGES: { id: string; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export function PipelineView({ businessId, onLeadUpdated }: PipelineViewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('id, name, company, status, deal_value, priority, probability')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pipeline leads:', error);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadLeads();
    const channel = supabase
      .channel(`crm-pipeline-${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_leads', filter: `business_id=eq.${businessId}` },
        () => loadLeads()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, loadLeads]);

  const moveLead = async (leadId: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

    const { error } = await supabase
      .from('crm_leads')
      .update({ status: newStatus, last_contacted_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) {
      console.error('Error moving lead:', error);
      toast({ title: 'Error', description: 'Could not move lead', variant: 'destructive' });
      loadLeads();
    } else {
      onLeadUpdated();
    }
  };

  const handleDrop = (stageId: string) => {
    if (draggingId) moveLead(draggingId, stageId);
    setDraggingId(null);
    setDragOverStage(null);
  };

  const getPriorityVariant = (priority: string | null): any => {
    const variants: Record<string, any> = {
      urgent: 'destructive',
      high: 'default',
      normal: 'secondary',
      low: 'outline',
    };
    return variants[priority || 'normal'] || 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
          return (
            <div
              key={stage.id}
              className={`w-72 flex-shrink-0 rounded-lg transition-colors ${
                dragOverStage === stage.id ? 'bg-accent/40 ring-2 ring-primary/40' : 'bg-muted/30'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="p-3 border-b sticky top-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                    <span className="font-semibold text-sm">{stage.label}</span>
                    <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                  </div>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {stageValue.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="p-2 space-y-2 min-h-[120px]">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Drop leads here</p>
                ) : (
                  stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggingId(lead.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                      onClick={() => navigate(`/business/crm/leads/${lead.id}`)}
                      className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                        draggingId === lead.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {lead.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lead.name}</p>
                          {lead.company && (
                            <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                          )}
                          <div className="flex items-center justify-between mt-2 gap-1">
                            <Badge variant={getPriorityVariant(lead.priority)} className="text-[10px] px-1.5">
                              {lead.priority || 'normal'}
                            </Badge>
                            {(lead.deal_value || 0) > 0 && (
                              <span className="text-xs font-medium flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {Number(lead.deal_value).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

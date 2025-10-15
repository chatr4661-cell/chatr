import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface PipelineViewProps {
  businessId: string;
  onLeadUpdated: () => void;
}

export function PipelineView({ businessId, onLeadUpdated }: PipelineViewProps) {
  return (
    <Card className="p-8 text-center">
      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Pipeline View Coming Soon</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        The Kanban-style pipeline view will let you drag and drop leads between stages. 
        For now, use the list view to manage your leads.
      </p>
    </Card>
  );
}

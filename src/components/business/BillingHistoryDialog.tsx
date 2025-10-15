import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt, Calendar, CreditCard, Download } from 'lucide-react';
import { format } from 'date-fns';

interface BillingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

interface BillingRecord {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  plan_name: string;
  period_start: string;
  period_end: string;
}

export function BillingHistoryDialog({
  open,
  onOpenChange,
  businessId,
}: BillingHistoryDialogProps) {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadBillingHistory();
    }
  }, [open, businessId]);

  const loadBillingHistory = async () => {
    setLoading(true);
    try {
      // This is a mock - in production, you'd fetch from a billing_history table
      // For now, we'll create sample data based on the subscription
      const { data: subscription } = await supabase
        .from('business_subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (subscription) {
        // Generate mock billing history
        const mockHistory: BillingRecord[] = [
          {
            id: '1',
            created_at: new Date().toISOString(),
            amount: subscription.monthly_price,
            status: 'paid',
            plan_name: subscription.plan_type,
            period_start: new Date().toISOString(),
            period_end: subscription.next_billing_date || new Date().toISOString(),
          },
        ];
        setBillingHistory(mockHistory);
      }
    } catch (error) {
      console.error('Error loading billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </DialogTitle>
          <DialogDescription>
            View your past invoices and payment history
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : billingHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No billing history available
            </div>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold capitalize">
                          {record.plan_name} Plan
                        </h4>
                        <Badge
                          variant={record.status === 'paid' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.created_at), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          ₹{record.amount}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-accent rounded-md transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Period: {format(new Date(record.period_start), 'MMM dd')} -{' '}
                    {format(new Date(record.period_end), 'MMM dd, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

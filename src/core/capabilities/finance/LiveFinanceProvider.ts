import { WorkflowSDK } from '@/core/sdk/WorkflowSDK';
import { supabase } from '@/integrations/supabase/client';
import { TraceContext } from '@/core/runtime/TraceContext';

export const LiveFinanceProvider = WorkflowSDK.createProvider(
  'testbed-finance',
  'Live Finance Testbed Provider',
  'finance',
  'ExecutionProvider',
  {
    recordTransaction: async (payload: any, trace?: TraceContext) => {
      trace?.publish('FINANCE_LEDGER_UPDATE_STARTED', { payload });

      const { data, error } = await supabase
        .from('testbed_finance_ledgers')
        .insert({
          transaction_type: payload.type || 'expense',
          amount: payload.amount,
          metadata: payload.metadata || {},
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        trace?.publish('FINANCE_LEDGER_UPDATE_FAILED', { error: error.message });
        throw error;
      }

      trace?.publish('FINANCE_LEDGER_UPDATE_COMPLETED', { ledger_id: data.id });
      return { id: data.id, status: data.status };
    },
  },
);

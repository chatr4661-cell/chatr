import { WorkflowSDK } from '@/core/sdk/WorkflowSDK';
import { supabase } from '@/integrations/supabase/client';
import { TraceContext } from '@/core/runtime/TraceContext';

export const LiveHRProvider = WorkflowSDK.createProvider(
  'testbed-hr',
  'Live HR Testbed Provider',
  'hr',
  'ExecutionProvider',
  {
    screenCandidate: async (payload: any, trace?: TraceContext) => {
      trace?.publish('HR_SCREENING_STARTED', { payload });

      const { data, error } = await supabase
        .from('testbed_hr_candidates')
        .insert({
          name: payload.name,
          role: payload.role,
          resume_url: payload.resume_url || null,
          status: 'screening',
        })
        .select()
        .single();

      if (error) {
        trace?.publish('HR_SCREENING_FAILED', { error: error.message });
        throw error;
      }

      trace?.publish('HR_SCREENING_COMPLETED', { candidate_id: data.id });
      return { id: data.id, status: data.status, name: data.name };
    },
  },
);

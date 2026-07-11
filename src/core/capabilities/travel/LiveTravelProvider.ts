import { WorkflowSDK } from '@/core/sdk/WorkflowSDK';
import { supabase } from '@/integrations/supabase/client';
import { TraceContext } from '@/core/runtime/TraceContext';

export const LiveTravelProvider = WorkflowSDK.createProvider(
  'testbed-travel',
  'Live Travel Testbed Provider',
  'travel',
  'ExecutionProvider',
  {
    bookFlight: async (payload: any, trace?: TraceContext) => {
      trace?.publish('TRAVEL_BOOKING_STARTED', { payload });

      const { data, error } = await supabase
        .from('testbed_travel_bookings')
        .insert({
          employee_id: payload.employee_id || '00000000-0000-0000-0000-000000000000',
          destination: payload.destination,
          start_date: payload.start_date || new Date().toISOString(),
          end_date: payload.end_date || new Date(Date.now() + 86400000).toISOString(),
          status: 'pending_approval',
          estimated_cost: payload.estimated_cost || 500.0,
        })
        .select()
        .single();

      if (error) {
        trace?.publish('TRAVEL_BOOKING_FAILED', { error: error.message });
        throw error;
      }

      trace?.publish('TRAVEL_BOOKING_COMPLETED', { booking_id: data.id });
      return { id: data.id, status: data.status, destination: data.destination };
    },
  },
);

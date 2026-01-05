/**
 * PSTN Call Hook
 * Enables calling landlines and non-CHATR users
 */

import { useState, useCallback, useEffect } from 'react';
import { PSTNService, PSTNCall, PSTNRates } from '@/services/calling/PSTNService';
import { useToast } from '@/hooks/use-toast';

interface PSTNCallState {
  activeCall: PSTNCall | null;
  isInitiating: boolean;
  rates: PSTNRates | null;
  balance: { balance: number; currency: string } | null;
  error: string | null;
}

export function usePSTNCall() {
  const { toast } = useToast();
  const [state, setState] = useState<PSTNCallState>({
    activeCall: null,
    isInitiating: false,
    rates: null,
    balance: null,
    error: null,
  });

  // Listen for PSTN call events
  useEffect(() => {
    const handleCallEvent = (event: CustomEvent<{ call: PSTNCall; event: string }>) => {
      const { call, event: callEvent } = event.detail;
      
      setState(prev => ({ ...prev, activeCall: call }));

      switch (callEvent) {
        case 'ringing':
          toast({
            title: '📞 Calling...',
            description: `Ringing ${call.to}`,
          });
          break;
        case 'answered':
          toast({
            title: '✅ Connected',
            description: 'Call in progress',
          });
          break;
        case 'busy':
          toast({
            title: 'Line Busy',
            description: 'The number is busy, try again later',
            variant: 'destructive',
          });
          break;
        case 'no-answer':
          toast({
            title: 'No Answer',
            description: 'The call was not answered',
          });
          break;
        case 'ended':
          if (call.duration && call.cost) {
            toast({
              title: 'Call Ended',
              description: `Duration: ${formatDuration(call.duration)} • Cost: $${(call.cost / 100).toFixed(2)}`,
            });
          }
          setState(prev => ({ ...prev, activeCall: null }));
          break;
      }
    };

    window.addEventListener('pstn-call-event', handleCallEvent as EventListener);
    return () => {
      window.removeEventListener('pstn-call-event', handleCallEvent as EventListener);
    };
  }, [toast]);

  /**
   * Check if PSTN is required for this number
   */
  const checkPSTNRequired = useCallback(async (phoneNumber: string): Promise<boolean> => {
    return PSTNService.requiresPSTN(phoneNumber);
  }, []);

  /**
   * Get calling rates for a number
   */
  const getRates = useCallback(async (phoneNumber: string): Promise<PSTNRates> => {
    const rates = await PSTNService.getRates(phoneNumber);
    setState(prev => ({ ...prev, rates }));
    return rates;
  }, []);

  /**
   * Get account balance
   */
  const getBalance = useCallback(async () => {
    const balance = await PSTNService.getBalance();
    setState(prev => ({ ...prev, balance }));
    return balance;
  }, []);

  /**
   * Initiate PSTN call
   */
  const initiateCall = useCallback(async (
    to: string,
    from?: string
  ): Promise<PSTNCall | null> => {
    setState(prev => ({ ...prev, isInitiating: true, error: null }));

    try {
      // Check rates first
      const rates = await getRates(to);
      
      // Check balance
      const balance = await getBalance();
      if (balance.balance < rates.ratePerMinute) {
        throw new Error('Insufficient balance for this call');
      }

      // Initiate call
      const call = await PSTNService.initiateCall(to, from);
      
      setState(prev => ({
        ...prev,
        activeCall: call,
        isInitiating: false,
      }));

      return call;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Call failed';
      setState(prev => ({
        ...prev,
        isInitiating: false,
        error: errorMessage,
      }));

      toast({
        title: 'Call Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    }
  }, [getRates, getBalance, toast]);

  /**
   * End active call
   */
  const endCall = useCallback(async (): Promise<void> => {
    if (state.activeCall) {
      await PSTNService.endCall(state.activeCall.id);
    }
  }, [state.activeCall]);

  /**
   * Send DTMF tones
   */
  const sendDTMF = useCallback(async (digits: string): Promise<boolean> => {
    if (!state.activeCall) return false;
    return PSTNService.sendDTMF(state.activeCall.id, digits);
  }, [state.activeCall]);

  return {
    ...state,
    checkPSTNRequired,
    getRates,
    getBalance,
    initiateCall,
    endCall,
    sendDTMF,
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

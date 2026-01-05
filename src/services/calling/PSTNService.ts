/**
 * PSTN Outbound Calling Service
 * Enables calling landlines and non-VoIP numbers
 * Ready for Twilio/Vonage/Plivo integration
 */

import { supabase } from '@/integrations/supabase/client';

export interface PSTNCallConfig {
  provider: 'twilio' | 'vonage' | 'plivo' | 'mock';
  callerId: string;
  enableRecording: boolean;
  maxDuration: number; // seconds
  costPerMinute: number; // in cents
}

export interface PSTNCall {
  id: string;
  from: string;
  to: string;
  status: 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  direction: 'outbound' | 'inbound';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  cost?: number;
  recordingUrl?: string;
  error?: string;
}

export interface PSTNRates {
  country: string;
  countryCode: string;
  ratePerMinute: number; // in cents
  currency: string;
}

class PSTNServiceClass {
  private config: PSTNCallConfig = {
    provider: 'mock',
    callerId: '+1234567890',
    enableRecording: false,
    maxDuration: 3600, // 1 hour
    costPerMinute: 1, // 1 cent per minute (competitive rate)
  };

  private activeCalls = new Map<string, PSTNCall>();

  /**
   * Initialize PSTN service with provider config
   */
  async initialize(config: Partial<PSTNCallConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    console.log('[PSTN] Service initialized with provider:', this.config.provider);
  }

  /**
   * Check if a number requires PSTN (not a CHATR user)
   */
  async requiresPSTN(phoneNumber: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (error) return true;
      return !data || data.length === 0;
    } catch {
      return true; // Assume PSTN needed on error
    }
  }

  /**
   * Get calling rates for a destination
   */
  async getRates(phoneNumber: string): Promise<PSTNRates> {
    const country = this.getCountryFromNumber(phoneNumber);
    
    // Mock rates - would come from provider API
    const ratesMap = new Map<string, PSTNRates>([
      ['US', { country: 'United States', countryCode: '+1', ratePerMinute: 1, currency: 'USD' }],
      ['CA', { country: 'Canada', countryCode: '+1', ratePerMinute: 1, currency: 'USD' }],
      ['UK', { country: 'United Kingdom', countryCode: '+44', ratePerMinute: 2, currency: 'USD' }],
      ['IN', { country: 'India', countryCode: '+91', ratePerMinute: 3, currency: 'USD' }],
      ['AU', { country: 'Australia', countryCode: '+61', ratePerMinute: 3, currency: 'USD' }],
      ['DEFAULT', { country: 'International', countryCode: '', ratePerMinute: 5, currency: 'USD' }],
    ]);

    return ratesMap.get(country) || ratesMap.get('DEFAULT')!;
  }

  /**
   * Initiate PSTN outbound call
   */
  async initiateCall(
    to: string,
    from?: string,
    options?: {
      enableRecording?: boolean;
      callbackUrl?: string;
    }
  ): Promise<PSTNCall> {
    const callId = `pstn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const normalizedTo = this.normalizePhoneNumber(to);
    const callerId = from || this.config.callerId;

    console.log(`[PSTN] Initiating call: ${callerId} -> ${normalizedTo}`);

    const call: PSTNCall = {
      id: callId,
      from: callerId,
      to: normalizedTo,
      status: 'initiating',
      direction: 'outbound',
    };

    this.activeCalls.set(callId, call);

    try {
      // In production: Call the edge function that interfaces with Twilio/Vonage
      if (this.config.provider === 'mock') {
        // Simulate call initiation
        await this.simulateCallFlow(callId);
      } else {
        const { data, error } = await supabase.functions.invoke('pstn-call', {
          body: {
            action: 'initiate',
            to: normalizedTo,
            from: callerId,
            enableRecording: options?.enableRecording ?? this.config.enableRecording,
            callbackUrl: options?.callbackUrl,
          },
        });

        if (error) throw error;
        
        call.id = data.callSid || callId;
        call.status = 'ringing';
      }

      return call;
    } catch (error) {
      console.error('[PSTN] Call initiation failed:', error);
      call.status = 'failed';
      call.error = error instanceof Error ? error.message : 'Call failed';
      return call;
    }
  }

  /**
   * Simulate call flow for mock provider
   */
  private async simulateCallFlow(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    // Simulate ringing
    await this.delay(1000);
    call.status = 'ringing';
    this.emitCallEvent(call, 'ringing');

    // Simulate answer (70% answer rate)
    await this.delay(3000);
    if (Math.random() > 0.3) {
      call.status = 'in-progress';
      call.startedAt = new Date().toISOString();
      this.emitCallEvent(call, 'answered');
    } else {
      call.status = Math.random() > 0.5 ? 'no-answer' : 'busy';
      this.emitCallEvent(call, call.status);
    }
  }

  /**
   * End active PSTN call
   */
  async endCall(callId: string): Promise<PSTNCall | null> {
    const call = this.activeCalls.get(callId);
    if (!call) return null;

    console.log(`[PSTN] Ending call: ${callId}`);

    try {
      if (this.config.provider !== 'mock') {
        await supabase.functions.invoke('pstn-call', {
          body: { action: 'end', callId },
        });
      }

      call.status = 'completed';
      call.endedAt = new Date().toISOString();
      
      if (call.startedAt) {
        const start = new Date(call.startedAt).getTime();
        const end = new Date(call.endedAt).getTime();
        call.duration = Math.ceil((end - start) / 1000);
        call.cost = Math.ceil(call.duration / 60) * this.config.costPerMinute;
      }

      this.emitCallEvent(call, 'ended');
      return call;
    } catch (error) {
      console.error('[PSTN] End call failed:', error);
      return null;
    }
  }

  /**
   * Send DTMF tones (for IVR navigation)
   */
  async sendDTMF(callId: string, digits: string): Promise<boolean> {
    console.log(`[PSTN] Sending DTMF: ${digits} on call ${callId}`);
    
    try {
      if (this.config.provider !== 'mock') {
        await supabase.functions.invoke('pstn-call', {
          body: { action: 'dtmf', callId, digits },
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle incoming PSTN call (from webhook)
   */
  async handleIncomingCall(payload: {
    callSid: string;
    from: string;
    to: string;
  }): Promise<PSTNCall> {
    const call: PSTNCall = {
      id: payload.callSid,
      from: payload.from,
      to: payload.to,
      status: 'ringing',
      direction: 'inbound',
    };

    this.activeCalls.set(call.id, call);
    this.emitCallEvent(call, 'incoming');

    return call;
  }

  /**
   * Answer incoming PSTN call
   */
  async answerCall(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call || call.direction !== 'inbound') return false;

    call.status = 'in-progress';
    call.startedAt = new Date().toISOString();
    this.emitCallEvent(call, 'answered');

    return true;
  }

  /**
   * Get active call by ID
   */
  getCall(callId: string): PSTNCall | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): PSTNCall[] {
    return Array.from(this.activeCalls.values())
      .filter(c => c.status === 'in-progress' || c.status === 'ringing');
  }

  /**
   * Emit call event (for UI updates)
   */
  private emitCallEvent(call: PSTNCall, event: string): void {
    const customEvent = new CustomEvent('pstn-call-event', {
      detail: { call, event },
    });
    window.dispatchEvent(customEvent);
  }

  /**
   * Get country code from phone number
   */
  private getCountryFromNumber(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    if (normalized.startsWith('+1')) return 'US'; // US/CA
    if (normalized.startsWith('+44')) return 'UK';
    if (normalized.startsWith('+91')) return 'IN';
    if (normalized.startsWith('+61')) return 'AU';
    return 'DEFAULT';
  }

  /**
   * Normalize phone number to E.164
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!phone.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    } else {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get call history from database
   */
  async getCallHistory(limit = 50): Promise<PSTNCall[]> {
    // Would query from database
    return [];
  }

  /**
   * Check available balance for PSTN calls
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    // Mock - would come from Twilio/Vonage account
    return { balance: 1000, currency: 'USD' }; // $10.00
  }
}

export const PSTNService = new PSTNServiceClass();

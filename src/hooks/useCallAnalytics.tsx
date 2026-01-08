/**
 * Call Analytics Hook - Features #114-117
 * Call detail records, dashboards, monitoring
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CallDetailRecord {
  id: string;
  callId: string;
  callType: 'voice' | 'video';
  direction: 'inbound' | 'outbound';
  callerId: string;
  callerName?: string;
  receiverId?: string;
  receiverName?: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  status: string;
  disposition: string;
  recordingUrl?: string;
  transcriptAvailable: boolean;
  qualityScore?: number;
  networkStats?: {
    avgRtt: number;
    packetLoss: number;
    jitter: number;
  };
}

export interface CallAnalytics {
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  missedCalls: number;
  missedRate: number;
  callsByType: { voice: number; video: number };
  callsByDirection: { inbound: number; outbound: number };
  callsByHour: Record<number, number>;
  avgQualityScore: number;
  topContacts: Array<{ id: string; name: string; count: number }>;
}

interface UseCallAnalyticsOptions {
  userId?: string;
  dateRange?: { start: Date; end: Date };
}

export const useCallAnalytics = (options: UseCallAnalyticsOptions = {}) => {
  const [records, setRecords] = useState<CallDetailRecord[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = options.userId || user?.id;
      if (!targetUserId) return;

      let query = supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start.toISOString())
          .lte('created_at', options.dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: CallDetailRecord[] = (data || []).map(call => ({
        id: call.id,
        callId: call.id,
        callType: call.call_type as 'voice' | 'video',
        direction: call.caller_id === targetUserId ? 'outbound' : 'inbound',
        callerId: call.caller_id,
        callerName: call.caller_name || undefined,
        receiverId: call.receiver_id || undefined,
        receiverName: call.receiver_name || undefined,
        startedAt: call.started_at || call.created_at || '',
        endedAt: call.ended_at || undefined,
        duration: call.duration || 0,
        status: call.status || 'unknown',
        disposition: call.status === 'ended' ? 'completed' : call.missed ? 'missed' : call.status || 'unknown',
        qualityScore: call.quality_rating || undefined,
        transcriptAvailable: false,
      }));

      setRecords(mapped);
      calculateAnalytics(mapped, targetUserId);
    } catch (error) {
      console.error('[useCallAnalytics] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.dateRange]);

  const calculateAnalytics = useCallback((data: CallDetailRecord[], userId: string) => {
    if (data.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalCalls = data.length;
    const totalDuration = data.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = totalDuration / totalCalls;
    const missedCalls = data.filter(c => c.disposition === 'missed').length;
    const missedRate = (missedCalls / totalCalls) * 100;

    const callsByType = {
      voice: data.filter(c => c.callType === 'voice').length,
      video: data.filter(c => c.callType === 'video').length,
    };

    const callsByDirection = {
      inbound: data.filter(c => c.direction === 'inbound').length,
      outbound: data.filter(c => c.direction === 'outbound').length,
    };

    const callsByHour: Record<number, number> = {};
    data.forEach(c => {
      const hour = new Date(c.startedAt).getHours();
      callsByHour[hour] = (callsByHour[hour] || 0) + 1;
    });

    const qualityScores = data.filter(c => c.qualityScore).map(c => c.qualityScore!);
    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    // Calculate top contacts
    const contactCounts = new Map<string, { id: string; name: string; count: number }>();
    data.forEach(c => {
      const otherId = c.direction === 'outbound' ? c.receiverId : c.callerId;
      const otherName = c.direction === 'outbound' ? c.receiverName : c.callerName;
      if (otherId) {
        const existing = contactCounts.get(otherId);
        if (existing) {
          existing.count++;
        } else {
          contactCounts.set(otherId, { id: otherId, name: otherName || 'Unknown', count: 1 });
        }
      }
    });

    const topContacts = Array.from(contactCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalytics({
      totalCalls,
      totalDuration,
      avgDuration,
      missedCalls,
      missedRate,
      callsByType,
      callsByDirection,
      callsByHour,
      avgQualityScore,
      topContacts,
    });
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const getRecord = useCallback((callId: string): CallDetailRecord | undefined => {
    return records.find(r => r.callId === callId);
  }, [records]);

  const exportRecords = useCallback((format: 'json' | 'csv' = 'json'): string => {
    if (format === 'csv') {
      const headers = ['Call ID', 'Type', 'Direction', 'Caller', 'Receiver', 'Duration', 'Status'];
      const rows = records.map(r => [
        r.callId,
        r.callType,
        r.direction,
        r.callerName || r.callerId,
        r.receiverName || r.receiverId || '',
        r.duration.toString(),
        r.status,
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    return JSON.stringify(records, null, 2);
  }, [records]);

  return {
    records,
    analytics,
    loading,
    getRecord,
    exportRecords,
    reload: loadRecords,
  };
};

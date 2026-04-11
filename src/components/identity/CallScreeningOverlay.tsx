import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Shield, AlertTriangle, Bot, User, Briefcase, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface CallScreeningData {
  caller_name?: string;
  caller_avatar?: string;
  caller_id?: string;
  call_type?: string;
  trust_score?: number;
  risk_level?: string;
  intent?: string;
  confidence?: number;
  recommendation?: string;
  reasons?: string[];
}

interface CallScreeningOverlayProps {
  callId: string;
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  callType?: string;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export const CallScreeningOverlay: React.FC<CallScreeningOverlayProps> = ({
  callId,
  callerId,
  callerName,
  callerAvatar,
  callType = 'voice',
  onAccept,
  onReject,
  onDismiss,
  visible,
}) => {
  const [screening, setScreening] = useState<CallScreeningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && callerId) {
      screenCall();
    }
  }, [visible, callerId]);

  const screenCall = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('screen-incoming-call', {
        body: {
          caller_id: callerId,
          caller_name: callerName,
          call_type: callType,
        },
      });

      if (!error && data) {
        setScreening(data);
      } else {
        // Fallback screening data
        setScreening({
          caller_name: callerName,
          trust_score: 50,
          risk_level: 'unknown',
          intent: 'Unknown',
          confidence: 0,
          recommendation: 'use_caution',
          reasons: ['Unable to screen this caller'],
        });
      }
    } catch {
      setScreening({
        caller_name: callerName,
        trust_score: 50,
        risk_level: 'unknown',
        intent: 'Unknown',
        confidence: 0,
        recommendation: 'use_caution',
        reasons: ['Screening unavailable'],
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getRiskIcon = (level?: string) => {
    switch (level) {
      case 'low': return <Shield className="h-5 w-5 text-green-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getRecommendationText = (rec?: string) => {
    switch (rec) {
      case 'safe_to_answer': return 'Safe to Answer';
      case 'use_caution': return 'Use Caution';
      case 'likely_spam': return 'Likely Spam';
      case 'block_recommended': return 'Block Recommended';
      default: return 'Unknown';
    }
  };

  const getRecommendationColor = (rec?: string) => {
    switch (rec) {
      case 'safe_to_answer': return 'bg-green-500';
      case 'use_caution': return 'bg-yellow-500';
      case 'likely_spam': return 'bg-orange-500';
      case 'block_recommended': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">AI Call Screening</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-sm mx-auto w-full">
            {/* Caller Info */}
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-20 h-20">
                {callerAvatar ? (
                  <img src={callerAvatar} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                )}
                {!loading && screening && (
                  <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background ${getRecommendationColor(screening.recommendation)}`}>
                    {screening.risk_level === 'high' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{callerName || 'Unknown Caller'}</h2>
                <p className="text-sm text-muted-foreground capitalize">{callType} call</p>
              </div>
            </div>

            {/* Screening Results */}
            {loading ? (
              <div className="text-center space-y-3">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">Screening caller...</p>
              </div>
            ) : screening && (
              <Card className="w-full">
                <CardContent className="p-4 space-y-3">
                  {/* Trust Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trust Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${screening.trust_score || 0}%`,
                            backgroundColor: (screening.trust_score || 0) >= 70 ? '#22c55e' : (screening.trust_score || 0) >= 40 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold">{screening.trust_score || 0}%</span>
                    </div>
                  </div>

                  {/* Intent */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Intent</span>
                    <Badge variant="outline" className={getRiskColor(screening.risk_level)}>
                      {screening.intent || 'Unknown'}
                    </Badge>
                  </div>

                  {/* Risk Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk</span>
                    <div className="flex items-center gap-1.5">
                      {getRiskIcon(screening.risk_level)}
                      <span className="text-sm font-medium capitalize">{screening.risk_level || 'unknown'}</span>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        {getRecommendationText(screening.recommendation)}
                      </span>
                    </div>
                    {screening.reasons && screening.reasons.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {screening.reasons.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Confidence */}
                  {screening.confidence !== undefined && screening.confidence > 0 && (
                    <p className="text-[10px] text-muted-foreground text-right">
                      AI Confidence: {Math.round(screening.confidence * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 w-full">
              <Button
                variant="destructive"
                className="flex-1 h-14 rounded-full"
                onClick={onReject}
              >
                <PhoneOff className="h-6 w-6 mr-2" /> Decline
              </Button>
              <Button
                className="flex-1 h-14 rounded-full bg-green-500 hover:bg-green-600"
                onClick={onAccept}
              >
                <Phone className="h-6 w-6 mr-2" /> Answer
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

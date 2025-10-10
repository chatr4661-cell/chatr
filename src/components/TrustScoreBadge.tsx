import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface TrustScore {
  trust_score: number;
  verification_level: string;
}

export const TrustScoreBadge = ({ userId }: { userId: string }) => {
  const [score, setScore] = useState<TrustScore | null>(null);

  useEffect(() => {
    loadTrustScore();
  }, [userId]);

  const loadTrustScore = async () => {
    const { data } = await supabase
      .from('user_trust_scores' as any)
      .select('trust_score, verification_level')
      .eq('user_id', userId)
      .maybeSingle() as any;

    setScore(data);
  };

  if (!score) return null;

  const getScoreColor = () => {
    if (score.trust_score >= 80) return 'default';
    if (score.trust_score >= 50) return 'secondary';
    return 'destructive';
  };

  const getIcon = () => {
    if (score.trust_score >= 80) return <ShieldCheck className="h-3 w-3" />;
    if (score.trust_score >= 50) return <Shield className="h-3 w-3" />;
    return <ShieldAlert className="h-3 w-3" />;
  };

  const getVerificationLabel = () => {
    const labels: Record<string, string> = {
      premium: '✓ Premium',
      identity: '✓ Verified',
      email: '✓ Email',
      phone: '✓ Phone',
      unverified: 'Unverified',
    };
    return labels[score.verification_level] || 'Unverified';
  };

  return (
    <Badge variant={getScoreColor()} className="gap-1" title={`Trust Score: ${score.trust_score}/100 - ${getVerificationLabel()}`}>
      {getIcon()}
      {score.trust_score}
    </Badge>
  );
};

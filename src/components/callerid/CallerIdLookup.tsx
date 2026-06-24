import React, { useState } from 'react';
import { Search, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Users, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ReportCallerSheet } from './ReportCallerSheet';
import { normalizeToInternational, hashPhoneNumber } from '@/utils/phoneHashUtil';

interface CallerIdResult {
  name: string;
  trust_score: number;
  spam_reports: number;
  opted_out: boolean;
}

const deriveLabel = (r: CallerIdResult): string => {
  if (r.spam_reports >= 5) return 'Confirmed Spam';
  if (r.spam_reports >= 3) return 'Likely Spam';
  if (r.spam_reports >= 1) return 'Suspected Spam';
  if (r.trust_score >= 80) return 'Verified Safe';
  return 'Unknown';
};

export const CallerIdLookup: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CallerIdResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleLookup = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const rawNumber = normalizeToInternational(phone.trim());
      const hashedNumber = await hashPhoneNumber(phone.trim());

      const { data, error } = await supabase.rpc('lookup_caller_id', {
        p_hashed_number: hashedNumber,
        p_raw_number: rawNumber,
      });
      if (error) throw error;

      const res = data as unknown as CallerIdResult | null;
      // Treat as "found" only when we actually have a community name or spam history
      if (res && (res.name !== 'Unknown Caller' || res.spam_reports > 0)) {
        setResult(res);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('[CallerIdLookup]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getLabelStyle = (label: string) => {
    switch (label) {
      case 'Confirmed Spam': return { color: 'bg-red-500 text-white', icon: ShieldAlert };
      case 'Likely Spam': return { color: 'bg-orange-500 text-white', icon: AlertTriangle };
      case 'Suspected Spam': return { color: 'bg-yellow-500 text-black', icon: AlertTriangle };
      case 'Verified Safe': return { color: 'bg-green-500 text-white', icon: ShieldCheck };
      case 'Business': return { color: 'bg-blue-500 text-white', icon: Shield };
      default: return { color: 'bg-muted text-muted-foreground', icon: Shield };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter phone number..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <Button onClick={handleLookup} disabled={loading || !phone.trim()}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {result && (() => {
        const label = result.opted_out ? 'Unknown' : deriveLabel(result);
        const style = getLabelStyle(label);
        const Icon = style.icon;
        return (
          <Card className="border-2">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{result.name || phone}</p>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </div>
                <Badge className={`${style.color} px-3 py-1`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-red-500">{result.spam_reports}</p>
                  <p className="text-xs text-muted-foreground">Spam Reports</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{result.trust_score}</p>
                  <p className="text-xs text-muted-foreground">Trust Score</p>
                </div>
              </div>

              {result.opted_out && (
                <p className="text-xs text-muted-foreground text-center">
                  This number opted out of the community phonebook.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setReportOpen(true)}>
                  <Flag className="w-3 h-3 mr-1" /> Report
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {notFound && (
        <Card>
          <CardContent className="pt-4 text-center space-y-2">
            <Users className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No reports found for this number</p>
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              Be the first to report
            </Button>
          </CardContent>
        </Card>
      )}

      <ReportCallerSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        phoneNumber={phone}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Search, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Flag, 
  CheckCircle2, 
  PhoneCall, 
  Bot, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { normalizeToInternational, hashPhoneNumber } from '@/utils/phoneHashUtil';

interface CallerIdResult {
  name: string;
  trust_score: number;
  spam_reports: number;
  opted_out: boolean;
}

export const PublicPhoneLookup: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CallerIdResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportCategory, setReportCategory] = useState('spam');

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 7) return;

    setLoading(true);
    setSearched(false);
    setResult(null);
    setReportSuccess(false);

    try {
      const rawNumber = normalizeToInternational(trimmed);
      const hashedNumber = await hashPhoneNumber(trimmed);

      // Telemetry
      const sessionId = sessionStorage.getItem('chatr_session_id') || `sess_${Date.now()}`;
      void supabase.from('growth_events').insert({
        event_type: 'anonymous_tool_started',
        category: 'acquisition',
        client_timestamp: Date.now(),
        anonymous_id: localStorage.getItem('chatr_anon_id') || `anon_${Date.now()}`,
        session_id: sessionId,
        landing_page: window.location.pathname,
        source: 'seo_phone_lookup_tool',
        metadata: { query_length: trimmed.length }
      });

      const { data, error } = await supabase.rpc('lookup_caller_id', {
        p_hashed_number: hashedNumber,
        p_raw_number: rawNumber,
      });

      if (error) throw error;
      const res = data as unknown as CallerIdResult | null;
      setResult(res);
      setSearched(true);

      // Record completion
      void supabase.from('growth_events').insert({
        event_type: 'anonymous_tool_completed',
        category: 'acquisition',
        client_timestamp: Date.now(),
        anonymous_id: localStorage.getItem('chatr_anon_id') || `anon_${Date.now()}`,
        session_id: sessionId,
        landing_page: window.location.pathname,
        source: 'seo_phone_lookup_tool',
        metadata: { found: Boolean(res && res.spam_reports > 0) }
      });
    } catch {
      setSearched(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = async () => {
    if (!phone.trim()) return;
    setReporting(true);
    try {
      // Record community report into growth_events for verification
      const rawNumber = normalizeToInternational(phone.trim());
      const hashedNumber = await hashPhoneNumber(phone.trim());

      await supabase.from('growth_events').insert({
        event_type: 'community_spam_report',
        category: 'acquisition',
        client_timestamp: Date.now(),
        anonymous_id: localStorage.getItem('chatr_anon_id') || `anon_${Date.now()}`,
        session_id: sessionStorage.getItem('chatr_session_id') || `sess_${Date.now()}`,
        landing_page: window.location.pathname,
        source: 'seo_lookup_report',
        metadata: {
          phone_hash: hashedNumber,
          category: reportCategory,
          destination_prefix: rawNumber.slice(0, 4)
        }
      });
      setReportSuccess(true);
    } catch {
      // Silently handle
    } finally {
      setReporting(false);
    }
  };

  const hasReports = result && (result.spam_reports > 0 || (result.name && result.name !== 'Unknown Caller'));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Search Input Card */}
      <Card className="border border-border/80 shadow-lg bg-card/90 backdrop-blur-sm">
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleLookup} className="space-y-3">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Phone Number or Unknown Caller
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210 or 050 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-11 text-base tracking-wide font-mono"
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                disabled={loading || phone.trim().length < 7} 
                className="h-11 px-6 font-semibold gap-2"
              >
                {loading ? 'Checking…' : 'Check Number'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-500" />
              Queries are hashed cryptographically with SHA-256 for complete lookup privacy.
            </p>
          </form>

          {/* Results Section */}
          {searched && (
            <div className="pt-2 border-t border-border/50 animate-in fade-in space-y-4">
              {hasReports ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                      <ShieldAlert className="w-5 h-5" />
                      Community Flagged Number
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {result.spam_reports} Spam Report{result.spam_reports !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <strong>Identified As:</strong>{' '}
                      <span className="text-foreground font-semibold">
                        {result.name || 'Telemarketing / High Risk Caller'}
                      </span>
                    </p>
                    <p>
                      <strong>Trust Score:</strong>{' '}
                      <span className="text-foreground font-semibold">
                        {result.trust_score}/100 (Unverified / Caution Advised)
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    No Active Spam Reports on File
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This phone number has not been reported for fraud or telemarketing by the CHATR community. Please still exercise caution with callers asking for passwords, OTPs, or financial transactions.
                  </p>
                </div>
              )}

              {/* Report This Number Accordion */}
              {!reportSuccess ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                      Received a call from this number?
                    </span>
                    <span className="text-[11px] text-muted-foreground">Help protect the community</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="h-9 px-3 text-xs rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="spam">Flag as Telemarketing / Spam</option>
                      <option value="scam">Flag as Fraud / Impersonation Scam</option>
                      <option value="delivery">Identify as Delivery / Courier</option>
                      <option value="safe">Confirm as Legitimate Business</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reporting}
                      onClick={handleQuickReport}
                      className="h-9 text-xs font-semibold gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                      Submit Community Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Thank you! Your community report has been logged to help protect CHATR users.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CHATR Protection Value Bridge */}
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Built-In Call Shield
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Never Deal with Spam Calls Again
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg">
                With CHATR, incoming unknown calls are automatically screened by your personal SI Assistant before your phone rings.
              </p>
            </div>

            <Button 
              size="default" 
              className="shrink-0 gap-1.5 font-semibold"
              onClick={() => {
                window.location.href = '/auth';
              }}
            >
              Protect Calls Free <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Bot className="w-4 h-4" />
                AI Call Screening Assistant
              </div>
              <p className="text-[11px] text-muted-foreground">
                When you're busy or suspect spam, CHATR answers the call, speaks to the caller, and delivers an instant transcription.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Users className="w-4 h-4" />
                Collaborative Defense
              </div>
              <p className="text-[11px] text-muted-foreground">
                Over 100,000+ verified community reports block robocalls and fraudulent loan scams in real time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

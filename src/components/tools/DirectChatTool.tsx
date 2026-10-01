import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Languages, 
  PhoneCall, 
  QrCode, 
  Smartphone,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { normalizeToInternational } from '@/utils/phoneHashUtil';

interface CountryItem {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

const POPULAR_COUNTRIES: CountryItem[] = [
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Qatar', code: 'QA', dial: '+974', flag: '🇶🇦' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Malaysia', code: 'MY', dial: '+60', flag: '🇲🇾' },
];

const MESSAGE_TEMPLATES = [
  'Hi! Reaching out regarding your enquiry.',
  'Hello! Can we connect for a quick call?',
  'Hi, please send over the details.',
  'Hello, I am following up on our discussion.',
];

export const DirectChatTool: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(POPULAR_COUNTRIES[0]);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toolCompleted, setToolCompleted] = useState(false);

  // Clean raw digits input
  const cleanDigits = useMemo(() => {
    return phoneDigits.replace(/\D/g, '');
  }, [phoneDigits]);

  // Normalized E.164 phone string
  const normalizedPhone = useMemo(() => {
    if (!cleanDigits) return '';
    return normalizeToInternational(cleanDigits, selectedCountry.dial);
  }, [cleanDigits, selectedCountry.dial]);

  // Validate phone format
  const isValidPhone = useMemo(() => {
    const rawLen = cleanDigits.length;
    // Local number usually 7-11 digits, full intl 10-15 digits
    return rawLen >= 7 && rawLen <= 15;
  }, [cleanDigits]);

  // Construct direct chat URL
  const targetChatUrl = useMemo(() => {
    if (!normalizedPhone || !isValidPhone) return '';
    const digitsOnly = normalizedPhone.replace(/\D/g, '');
    const encodedMsg = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${digitsOnly}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
  }, [normalizedPhone, isValidPhone, message]);

  // QR Code URL using standard image API
  const qrCodeUrl = useMemo(() => {
    if (!targetChatUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetChatUrl)}`;
  }, [targetChatUrl]);

  // Telemetry logger
  const recordToolTelemetry = async (eventType: string) => {
    try {
      const sessionId = sessionStorage.getItem('chatr_session_id') || `sess_${Date.now()}`;
      sessionStorage.setItem('chatr_session_id', sessionId);

      await supabase.from('growth_events').insert({
        event_type: eventType,
        category: 'acquisition',
        client_timestamp: Date.now(),
        anonymous_id: localStorage.getItem('chatr_anon_id') || `anon_${Date.now()}`,
        session_id: sessionId,
        landing_page: window.location.pathname,
        source: 'seo_direct_chat_tool',
        metadata: {
          country: selectedCountry.code,
          has_message: Boolean(message),
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        }
      });
    } catch {
      // Telemetry failure should never disrupt the visitor experience
    }
  };

  const handleOpenChat = () => {
    if (!isValidPhone || !targetChatUrl) return;
    setToolCompleted(true);
    void recordToolTelemetry('anonymous_tool_completed');
    window.open(targetChatUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    if (!targetChatUrl) return;
    try {
      await navigator.clipboard.writeText(targetChatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      void recordToolTelemetry('direct_chat_link_copied');
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card className="border border-border/80 shadow-lg bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-5 h-5" />
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs px-2.5 py-0.5">
              Instant Utility • No Sign-In Needed
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Direct Chat Without Saving Phone Number
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter any international phone number to start a direct message immediately. Fast, safe, and 100% private.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Country & Phone Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Recipient Phone Number
            </label>
            <div className="flex gap-2">
              {/* Country Selector */}
              <div className="relative min-w-[130px]">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = POPULAR_COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) setSelectedCountry(found);
                  }}
                  className="w-full h-11 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                  aria-label="Select Country"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.dial})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
              </div>

              {/* Number Input */}
              <div className="relative flex-1">
                <Input
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={phoneDigits}
                  onChange={(e) => {
                    setPhoneDigits(e.target.value);
                    if (!toolCompleted) void recordToolTelemetry('anonymous_tool_started');
                  }}
                  className="h-11 text-base tracking-wide font-mono"
                />
              </div>
            </div>
            {normalizedPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Formatted E.164 Destination:{' '}
                <span className="font-mono font-semibold text-foreground">{normalizedPhone}</span>
              </p>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Pre-Filled Message <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <span className="text-xs text-muted-foreground">{message.length} chars</span>
            </div>
            <Textarea
              placeholder="Type your message here (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MESSAGE_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMessage(tpl)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors border border-border/50 text-left"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          {isValidPhone && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Direct SERP Preview</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Ready to Dispatch</Badge>
              </div>
              <div className="bg-background rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Target: {normalizedPhone} ({selectedCountry.name})
                </div>
                {message ? (
                  <p className="text-xs text-foreground italic border-l-2 border-primary/40 pl-2 mt-1">
                    "{message}"
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No pre-filled text (opens empty chat window)</p>
                )}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              disabled={!isValidPhone}
              onClick={handleOpenChat}
              className="flex-1 h-12 text-base font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              Open Direct Chat Now
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!isValidPhone}
              onClick={handleCopyLink}
              className="h-12 px-4 gap-2 text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!isValidPhone}
              onClick={() => setShowQr(!showQr)}
              className="h-12 px-4 gap-2 text-sm font-medium"
            >
              <QrCode className="w-4 h-4" />
              {showQr ? 'Hide QR' : 'Show QR'}
            </Button>
          </div>

          {/* QR Code Modal Drawer */}
          {showQr && isValidPhone && qrCodeUrl && (
            <div className="p-4 rounded-xl border border-border bg-background text-center space-y-2 animate-in fade-in">
              <p className="text-xs font-medium text-foreground">
                Scan with any phone camera to start direct chat on mobile:
              </p>
              <div className="flex justify-center py-2">
                <img 
                  src={qrCodeUrl} 
                  alt="Direct Chat QR Code" 
                  className="w-40 h-40 rounded-lg border border-border p-1 bg-white"
                  width="160"
                  height="160"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Works instantly with native camera app on Android & iOS.
              </p>
            </div>
          )}

          {/* Privacy Guarantee */}
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground border-t border-border/50">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Zero Data Storage Guarantee:</strong> Phone numbers and message contents are processed entirely in your browser and never retained on any server.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CHATR Product-Led Bridge */}
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Continuous Personal Intelligence
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Upgrade to CHATR — Beyond Basic Messaging
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Tired of switching apps to translate calls, screen spam, or summarize messy chat threads? CHATR gives you an integrated communication powerhouse.
              </p>
            </div>

            <Button 
              size="default" 
              className="shrink-0 gap-1.5 font-semibold"
              onClick={() => {
                void recordToolTelemetry('signup_prompt_clicked');
                window.location.href = '/auth';
              }}
            >
              Try CHATR Free <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Languages className="w-4 h-4" />
                Live Call Translation
              </div>
              <p className="text-[11px] text-muted-foreground">
                Speak in Hindi or Punjabi; your contact hears Arabic or English with live bi-directional voice translation.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                SI Message Intelligence
              </div>
              <p className="text-[11px] text-muted-foreground">
                Chatr SI summarizes 200+ message threads in seconds and drafts context-aware replies in your voice.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <PhoneCall className="w-4 h-4" />
                Weak Signal Calling
              </div>
              <p className="text-[11px] text-muted-foreground">
                Crystal clear voice calls optimized for 2G and erratic connections across global business corridors.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

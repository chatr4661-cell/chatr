import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Zap, 
  Search, 
  CheckCircle2, 
  PhoneCall, 
  PhoneOff, 
  Smartphone, 
  Lock, 
  Bot, 
  Radio, 
  Globe, 
  RefreshCw,
  Video
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';
import { runShieldPipeline, submitCommunityReport, ScoreOutput } from '@/lib/chatr-shield/shield-pipeline';
import { shieldMetricsService, ShieldLiveMetrics } from '@/services/shieldMetricsService';

interface ShieldDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallNumber?: (phoneNumber: string) => void;
}

export function ShieldDashboardDialog({ open, onOpenChange, onCallNumber }: ShieldDashboardDialogProps) {
  const [lookupNumber, setLookupNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<ScoreOutput | null>(null);
  const [metrics, setMetrics] = useState<ShieldLiveMetrics>(shieldMetricsService.getMetrics());

  useEffect(() => {
    const unsub = shieldMetricsService.subscribe(setMetrics);
    return () => unsub();
  }, []);

  // Live Defense Toggles (persisted in localStorage)
  const [defenses, setDefenses] = useState({
    aiScreening: true,
    scamAutoBlock: true,
    deepfakeDetector: true,
    darkWebMonitor: true,
    autoBlockSpammers: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatr_shield_defenses');
      if (saved) {
        setDefenses(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const toggleDefense = (key: keyof typeof defenses) => {
    setDefenses(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('chatr_shield_defenses', JSON.stringify(updated));
      const names: Record<string, string> = {
        aiScreening: 'AI Call Screening',
        scamAutoBlock: 'Scam Auto-Block',
        deepfakeDetector: 'Deepfake Detector',
        darkWebMonitor: 'Dark Web Monitor',
        autoBlockSpammers: 'Auto-Block Spammers'
      };
      toast.success(`${names[key]} ${updated[key] ? 'Enabled' : 'Disabled'}`);
      return updated;
    });
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupNumber.trim() || lookupNumber.replace(/\D/g, '').length < 4) {
      toast.error('Please enter at least 5 digits to verify');
      return;
    }
    setSearching(true);
    shieldMetricsService.recordVerifiedCheck();
    try {
      const res = await runShieldPipeline(lookupNumber);
      setLookupResult(res);
      toast.success(`Verification complete: ${res.is_on_chatr ? 'Verified on Chatr' : res.label}`);
    } catch {
      toast.error('Verification query failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleReport = async (type: 'SPAM' | 'FRAUD' | 'SAFE') => {
    if (!lookupResult || !lookupNumber) return;
    await submitCommunityReport(lookupNumber, type);
    if (type !== 'SAFE') {
      shieldMetricsService.recordThreatBlocked();
    }
    toast.success(`Number marked as ${type}. Shield intelligence updated!`);
    const refreshed = await runShieldPipeline(lookupNumber);
    setLookupResult(refreshed);
  };

  const getScoreBadge = (score: number, isOnChatr?: boolean) => {
    if (isOnChatr) return { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40', label: 'VERIFIED ON CHATR' };
    if (score >= 80) return { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'VERIFIED SAFE' };
    if (score >= 60) return { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'NEUTRAL / SAFE' };
    if (score >= 35) return { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'SUSPICIOUS TELEMARKETER' };
    return { bg: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'HIGH RISK FRAUD' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#060e24] border border-cyan-500/30 text-white shadow-2xl shadow-cyan-950/70 p-0 overflow-hidden max-h-[88vh] flex flex-col rounded-3xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-gradient-to-r from-[#071330] via-[#0a1a3e] to-[#071330] relative flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  CHATR <span className="text-cyan-400">Shield</span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[9px] uppercase font-bold tracking-wider">
                    AI Caller ID & Defense
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-200/70 mt-0.5">
                  Real-Time Spam, Scam & Threat Protection Network
                </DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Mesh
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0b1836]/70 border border-blue-500/20">
              <div className="flex items-center justify-between text-blue-300 text-xs font-medium">
                <span>Calls Screened</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-lg font-bold text-white mt-1">{metrics.callsScreened.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400">
                {metrics.callsScreened > 0 ? "100% automated screening" : "Active auto-screening"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0b1836]/70 border border-blue-500/20">
              <div className="flex items-center justify-between text-blue-300 text-xs font-medium">
                <span>Threats Blocked</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              </div>
              <p className="text-lg font-bold text-white mt-1">{metrics.threatsBlocked.toLocaleString()}</p>
              <p className="text-[10px] text-red-400">
                {metrics.threatsBlocked > 0 ? `${metrics.threatsBlocked} threats neutralized` : "0 fraud breaches"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0b1836]/70 border border-blue-500/20">
              <div className="flex items-center justify-between text-blue-300 text-xs font-medium">
                <span>Verified Checks</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-white mt-1">{metrics.verifiedChecks.toLocaleString()}</p>
              <p className="text-[10px] text-cyan-400">Real-time P2P Mesh</p>
            </div>
          </div>

          {/* SECTION 1: Chatr Shield Live Number Search */}
          <div className="p-3.5 rounded-2xl bg-[#0b1836]/80 border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Number Search & AI Verification</h3>
              </div>
              <span className="text-[10px] text-blue-300/70">5-Layer Shield Intelligence</span>
            </div>

            <form onSubmit={handleLookup} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                  placeholder="Enter global or Indian 10-digit number (e.g. 9717845477)..."
                  className="bg-[#050d20] border-blue-500/30 focus-visible:ring-cyan-400 text-white placeholder:text-blue-300/40 text-xs sm:text-sm h-9 rounded-xl"
                />
              </div>
              <Button 
                type="submit" 
                disabled={searching}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold h-9 px-3.5 rounded-xl gap-1 text-xs"
              >
                {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Scan
              </Button>
            </form>

            {/* Lookup Result Box */}
            {lookupResult && (
              <div className="p-3.5 rounded-xl bg-[#050d20] border border-cyan-500/30 space-y-2.5 animate-in fade-in-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {lookupResult.is_on_chatr && lookupResult.avatar_url ? (
                      <Avatar className="h-9 w-9 ring-2 ring-emerald-400 shrink-0">
                        <AvatarImage src={lookupResult.avatar_url} />
                        <AvatarFallback className="bg-emerald-800 text-xs font-bold text-white">
                          {lookupResult.display_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-xl shrink-0">{lookupResult.flag}</span>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{lookupResult.display_name}</h4>
                        {lookupResult.is_on_chatr && (
                          <Badge className="bg-emerald-500/25 text-emerald-300 border-emerald-400/50 text-[9px] px-1.5 py-0 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                            ✓ ON CHATR
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-blue-200/80 mt-0.5">
                        {lookupResult.carrier} • {lookupResult.country}
                      </p>
                    </div>
                  </div>
                  <Badge className={`px-2 py-0.5 text-[10px] font-bold border shrink-0 ${getScoreBadge(lookupResult.trust_score, lookupResult.is_on_chatr).bg}`}>
                    {getScoreBadge(lookupResult.trust_score, lookupResult.is_on_chatr).label}
                  </Badge>
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Shield Trust Score</span>
                    <span className="font-bold text-cyan-300">{lookupResult.trust_score} / 100</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        lookupResult.trust_score >= 80 ? 'bg-emerald-400' :
                        lookupResult.trust_score >= 50 ? 'bg-amber-400' : 'bg-red-500'
                      }`}
                      style={{ width: `${lookupResult.trust_score}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-blue-500/20">
                  {onCallNumber && (
                    <Button 
                      size="sm"
                      onClick={() => onCallNumber(lookupNumber)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 rounded-lg gap-1 px-3"
                    >
                      <PhoneCall className="w-3 h-3" />
                      Direct Call
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleReport('SAFE')}
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs h-7 rounded-lg gap-1 px-2.5"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark Safe
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleReport('SPAM')}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-7 rounded-lg gap-1 px-2.5"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Report Spam
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: AI Defense Switches */}
          <div className="p-3.5 rounded-2xl bg-[#0b1836]/80 border border-blue-500/25 space-y-2.5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Active AI Protection Engines
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050d20] border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">AI Call Screening & Voice Bot</p>
                    <p className="text-[10px] text-blue-300/60">Interrogates unknown callers with AI before device rings</p>
                  </div>
                </div>
                <Switch 
                  checked={defenses.aiScreening} 
                  onCheckedChange={() => toggleDefense('aiScreening')} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050d20] border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <PhoneOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Scam & Phishing Auto-Block</p>
                    <p className="text-[10px] text-blue-300/60">Instantly terminates known fraud, tax scams & financial spoofers</p>
                  </div>
                </div>
                <Switch 
                  checked={defenses.scamAutoBlock} 
                  onCheckedChange={() => toggleDefense('scamAutoBlock')} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050d20] border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Deepfake Voice & Audio Clone Detector</p>
                    <p className="text-[10px] text-blue-300/60">Real-time spectral analysis detects synthetic cloned voices</p>
                  </div>
                </div>
                <Switch 
                  checked={defenses.deepfakeDetector} 
                  onCheckedChange={() => toggleDefense('deepfakeDetector')} 
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050d20] border border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Dark Web Breach Monitor</p>
                    <p className="text-[10px] text-blue-300/60">Live surveillance for exposed credentials & number leaks</p>
                  </div>
                </div>
                <Switch 
                  checked={defenses.darkWebMonitor} 
                  onCheckedChange={() => toggleDefense('darkWebMonitor')} 
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Device Sync & QR Section */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#050e24] to-[#08183a] border border-cyan-500/30 flex items-center gap-4">
            <div className="p-1.5 bg-black/60 border border-cyan-400/50 rounded-xl shadow-lg shrink-0">
              <QRCodeSVG 
                value="https://chatr.chat/shield-sync?source=modal&device=desktop" 
                size={75}
                fgColor="#22d3ee"
                bgColor="transparent"
                level="M"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                Cross-Device Mobile Shield Sync
              </h4>
              <p className="text-[10px] text-blue-200/70 mt-0.5">
                Scan with the Chatr Mobile app (Android / iOS) to synchronize real-time spam intelligence across all devices.
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[9px] border-cyan-400/30 text-cyan-300">
                  Auto-Sync On
                </Badge>
                <span className="text-[9px] text-slate-400">Active Mesh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-blue-500/20 bg-[#040a1b] flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-slate-400">
            Chatr Global Spam & Scam Defense Mesh
          </span>
          <Button 
            onClick={() => onOpenChange(false)} 
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 h-8 rounded-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

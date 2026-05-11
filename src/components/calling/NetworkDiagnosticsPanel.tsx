/**
 * Network Diagnostics Panel
 * 
 * Hidden overlay showing real-time connection metrics:
 * - Resolution, Bitrate, FPS
 * - Packet loss, Jitter, RTT
 * - Codec, Connection type
 * 
 * Activated by triple-tap on call screen or long-press on quality indicator.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import type { VideoTier } from '@/utils/adaptiveBitrateEngine';

interface DiagnosticStats {
  resolution: string;
  fps: number;
  bitrate: string;
  packetLoss: string;
  jitter: string;
  rtt: string;
  codec: string;
  candidateType: string;
  connectionType: string;
  tier: VideoTier | string;
  localCandidateType: string;
  remoteCandidateType: string;
}

interface Props {
  peerConnection: RTCPeerConnection | null;
  isVisible: boolean;
  onClose: () => void;
  currentTier?: VideoTier | string;
}

export default function NetworkDiagnosticsPanel({ peerConnection, isVisible, onClose, currentTier = '' }: Props) {
  const [stats, setStats] = useState<DiagnosticStats>({
    resolution: '--',
    fps: 0,
    bitrate: '0 kbps',
    packetLoss: '0%',
    jitter: '0ms',
    rtt: '0ms',
    codec: '--',
    candidateType: '--',
    connectionType: '--',
    tier: currentTier,
    localCandidateType: '--',
    remoteCandidateType: '--',
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevBytesRef = useRef<{ sent: number; received: number; ts: number }>({ sent: 0, received: 0, ts: 0 });

  useEffect(() => {
    if (!isVisible || !peerConnection) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const collect = async () => {
      try {
        const rawStats = await peerConnection.getStats();
        let resolution = '--';
        let fps = 0;
        let packetLoss = '0%';
        let jitter = '0ms';
        let rtt = '0ms';
        let codec = '--';
        let localCandidateType = '--';
        let remoteCandidateType = '--';
        let connectionType = '--';
        let bytesSent = 0;
        let bytesReceived = 0;
        let ts = Date.now();
        let codecId = '';

        rawStats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}×${report.frameHeight}`;
            }
            fps = report.framesPerSecond || 0;
            const lost = report.packetsLost || 0;
            const sent = report.packetsSent || 0;
            packetLoss = sent > 0 ? `${((lost / sent) * 100).toFixed(2)}%` : '0%';
            bytesSent = report.bytesSent || 0;
            codecId = report.codecId || '';
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            bytesReceived = report.bytesReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = `${((report.currentRoundTripTime || 0) * 1000).toFixed(0)}ms`;
          }
          if (report.type === 'remote-inbound-rtp') {
            jitter = `${((report.jitter || 0) * 1000).toFixed(1)}ms`;
          }
          if (report.type === 'local-candidate') {
            localCandidateType = report.candidateType || '--';
            connectionType = report.networkType || report.protocol || '--';
          }
          if (report.type === 'remote-candidate') {
            remoteCandidateType = report.candidateType || '--';
          }
          if (report.type === 'codec' && report.id === codecId) {
            codec = report.mimeType?.replace('video/', '') || '--';
          }
        });

        // If we couldn't find codec by ID, try to find any video codec
        if (codec === '--') {
          rawStats.forEach(report => {
            if (report.type === 'codec' && report.mimeType?.startsWith('video/')) {
              codec = report.mimeType.replace('video/', '');
            }
          });
        }

        // Calculate bitrate
        let bitrate = '0 kbps';
        const prev = prevBytesRef.current;
        if (prev.ts > 0) {
          const timeDelta = (ts - prev.ts) / 1000;
          if (timeDelta > 0) {
            const bps = ((bytesSent - prev.sent) * 8) / timeDelta;
            if (bps >= 1_000_000) {
              bitrate = `${(bps / 1_000_000).toFixed(1)} Mbps`;
            } else {
              bitrate = `${(bps / 1000).toFixed(0)} kbps`;
            }
          }
        }
        prevBytesRef.current = { sent: bytesSent, received: bytesReceived, ts };

        setStats({
          resolution,
          fps: Math.round(fps),
          bitrate,
          packetLoss,
          jitter,
          rtt,
          codec,
          candidateType: `${localCandidateType} → ${remoteCandidateType}`,
          connectionType,
          tier: currentTier || '',
          localCandidateType,
          remoteCandidateType,
        });
      } catch {
        // Ignore stats errors
      }
    };

    collect();
    intervalRef.current = setInterval(collect, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible, peerConnection, currentTier]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-4 left-4 z-50 w-64 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 p-3 text-xs font-mono text-white/80"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Diagnostics</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Row label="Resolution" value={stats.resolution} />
            <Row label="FPS" value={String(stats.fps)} good={stats.fps >= 24} bad={stats.fps < 15} />
            <Row label="Bitrate" value={stats.bitrate} />
            <Row label="Packet Loss" value={stats.packetLoss} good={stats.packetLoss === '0%' || parseFloat(stats.packetLoss) < 2} bad={parseFloat(stats.packetLoss) > 5} />
            <Row label="RTT" value={stats.rtt} good={parseInt(stats.rtt) < 80} bad={parseInt(stats.rtt) > 150} />
            <Row label="Jitter" value={stats.jitter} good={parseFloat(stats.jitter) < 30} bad={parseFloat(stats.jitter) > 50} />
            <div className="border-t border-white/10 pt-1.5 mt-1.5" />
            <Row label="Codec" value={stats.codec} />
            <Row label="Tier" value={stats.tier} />
            <Row label="Path" value={stats.candidateType} />
            <Row label="Network" value={stats.connectionType} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className={`font-medium ${bad ? 'text-red-400' : good ? 'text-emerald-400' : 'text-white/80'}`}>
        {value}
      </span>
    </div>
  );
}

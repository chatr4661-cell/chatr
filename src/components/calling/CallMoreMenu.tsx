/**
 * CallMoreMenu - VoIP Features Menu for UnifiedCallScreen
 * Integrates: Transfer, Park, Hold, Recording, Noise Cancellation, Audio Routing
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, PhoneForwarded, ParkingCircle, Pause, Play,
  Circle, Square, Headphones, Users,
  Waves, Shield, Smartphone, Mic, Volume2, Check
} from 'lucide-react';
import { useCallTransfer } from '@/hooks/useCallTransfer';
import { useCallPark } from '@/hooks/useCallPark';
import { useCallRecording } from '@/hooks/useCallRecording';
import { useNoiseCancellation } from '@/hooks/useNoiseCancellation';
import { useCallHandoff } from '@/hooks/useCallHandoff';
import DeviceTransferSheet from './DeviceTransferSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone?: string;
}

interface CallMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  localStream: MediaStream | null;
  contactName?: string;
  callType?: 'voice' | 'video';
  isVideoOn?: boolean;
  isMuted?: boolean;
  duration?: number;
  partnerId?: string;
  contacts?: Contact[];
  onHoldChange?: (isHeld: boolean) => void;
  remoteAudioEl?: HTMLAudioElement | null;
  onReplaceMicTrack?: (track: MediaStreamTrack) => Promise<void> | void;
}

export default function CallMoreMenu({
  isOpen,
  onClose,
  callId,
  localStream,
  contactName = 'Unknown',
  callType = 'voice',
  isVideoOn = false,
  isMuted = false,
  duration = 0,
  partnerId = '',
  contacts = [],
  onHoldChange,
  remoteAudioEl,
  onReplaceMicTrack,
}: CallMoreMenuProps) {
  const [activePanel, setActivePanel] = useState<'main' | 'transfer' | 'audio'>('main');
  const [isHeld, setIsHeld] = useState(false);
  const [showDeviceSheet, setShowDeviceSheet] = useState(false);

  const { blindTransfer, startAttendedTransfer, isTransferring } = useCallTransfer();
  const { parkCall } = useCallPark();
  const { isRecording, startRecording, stopRecording } = useCallRecording();
  const { config: noiseConfig, toggle: toggleNoise, setLevel: setNoiseLevel } = useNoiseCancellation();

  const deviceFingerprint = btoa(`${navigator.userAgent}-${screen.width}x${screen.height}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`).slice(0, 32);
  const { initiateHandoff, availableDevices, isTransferring: isHandoffTransferring, loadActiveDevices } = useCallHandoff(deviceFingerprint);

  // ===== Audio devices =====
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [activeMicId, setActiveMicId] = useState<string>('');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(
    (remoteAudioEl as HTMLAudioElement & { sinkId?: string })?.sinkId || 'default'
  );

  const loadDevices = useCallback(async () => {
    try {
      // Trigger permission so labels appear
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMics(devices.filter(d => d.kind === 'audioinput'));
      setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      const currentMic = localStream?.getAudioTracks()[0]?.getSettings().deviceId;
      if (currentMic) setActiveMicId(currentMic);
    } catch (e) {
      console.warn('enumerateDevices failed', e);
    }
  }, [localStream]);

  useEffect(() => {
    if (activePanel === 'audio') loadDevices();
    const handler = () => { if (activePanel === 'audio') loadDevices(); };
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
  }, [activePanel, loadDevices]);

  const switchMic = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        } as MediaTrackConstraints,
      });
      const newTrack = stream.getAudioTracks()[0];
      if (!newTrack) throw new Error('No audio track');
      if (onReplaceMicTrack) {
        await onReplaceMicTrack(newTrack);
      }
      setActiveMicId(deviceId);
      toast.success('Microphone switched');
    } catch (e) {
      console.error('switchMic failed', e);
      toast.error('Could not switch microphone');
    }
  };

  const switchSpeaker = async (deviceId: string) => {
    try {
      const el = remoteAudioEl as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
      if (!el?.setSinkId) {
        toast.error('Speaker selection unsupported on this device');
        return;
      }
      await el.setSinkId(deviceId);
      setActiveSpeakerId(deviceId);
      toast.success('Speaker switched');
    } catch (e) {
      console.error('setSinkId failed', e);
      toast.error('Could not switch speaker');
    }
  };

  // ===== Auto-load recent contacts for Transfer if none provided =====
  const [recentContacts, setRecentContacts] = useState<Contact[]>(contacts);
  useEffect(() => {
    if (contacts.length || !isOpen) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('calls')
          .select('caller_id, receiver_id, caller_name, receiver_name, created_at')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(50);
        const seen = new Set<string>();
        const list: Contact[] = [];
        for (const c of data || []) {
          const otherId = c.caller_id === user.id ? c.receiver_id : c.caller_id;
          const otherName = c.caller_id === user.id ? (c.receiver_name || 'Contact') : (c.caller_name || 'Contact');
          if (!otherId || otherId === partnerId || seen.has(otherId)) continue;
          seen.add(otherId);
          list.push({ id: otherId, name: otherName });
          if (list.length >= 12) break;
        }
        setRecentContacts(list);
      } catch (e) {
        console.warn('Failed loading recent contacts', e);
      }
    })();
  }, [isOpen, contacts, partnerId]);

  const handleHold = async () => {
    const newHeld = !isHeld;
    setIsHeld(newHeld);
    onHoldChange?.(newHeld);
    // Pause/resume local tracks (audio + video) immediately
    localStream?.getTracks().forEach(t => { t.enabled = !newHeld; });
    // Sync to DB so partner UI reflects hold state in realtime
    try {
      await supabase
        .from('calls')
        .update({ webrtc_state: newHeld ? 'held' : 'connected' })
        .eq('id', callId);
    } catch (e) {
      console.warn('hold DB sync failed', e);
    }
  };

  const handleParkCall = async () => {
    const slot = await parkCall(callId);
    if (slot) onClose();
  };

  const handleBlindTransfer = async (contact: Contact) => {
    const success = await blindTransfer(callId, contact.id, contact.name);
    if (success) onClose();
  };

  const handleAttendedTransfer = async (contact: Contact) => {
    const success = await startAttendedTransfer(callId, contact.id, contact.name);
    if (success) onClose();
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording(callId);
    } else if (localStream) {
      await startRecording(callId, localStream);
    } else {
      toast.error('No audio stream available');
    }
  };

  const menuItems = [
    { icon: isHeld ? Play : Pause, label: isHeld ? 'Resume' : 'Hold', action: handleHold, active: isHeld },
    { icon: PhoneForwarded, label: 'Transfer', action: () => setActivePanel('transfer'), disabled: isTransferring },
    { icon: ParkingCircle, label: 'Park', action: handleParkCall },
    { icon: isRecording ? Square : Circle, label: isRecording ? 'Stop Rec' : 'Record', action: handleToggleRecording, active: isRecording, color: isRecording ? 'text-red-500' : undefined },
    { icon: Waves, label: 'Audio', action: () => setActivePanel('audio') },
    { icon: Smartphone, label: 'Switch Device', action: () => setShowDeviceSheet(true) },
  ];

  const transferList = recentContacts.length ? recentContacts : contacts;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 inset-x-0 bg-slate-900 rounded-t-3xl max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {activePanel === 'main' && 'More Options'}
                {activePanel === 'transfer' && 'Transfer Call'}
                {activePanel === 'audio' && 'Audio'}
              </h2>
              <button
                onClick={activePanel === 'main' ? onClose : () => setActivePanel('main')}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {activePanel === 'main' && (
              <div className="p-4 grid grid-cols-3 gap-4">
                {menuItems.map((item, i) => (
                  <button
                    key={i} onClick={item.action} disabled={item.disabled}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      item.active ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-white/5 hover:bg-white/10'
                    } ${item.disabled ? 'opacity-50' : ''}`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color || (item.active ? 'text-emerald-400' : 'text-white')}`} />
                    <span className={`text-xs ${item.active ? 'text-emerald-400' : 'text-white/70'}`}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activePanel === 'transfer' && (
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p className="text-white/60 text-sm">Select a contact to transfer this call:</p>
                {transferList.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent contacts</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transferList.slice(0, 12).map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-medium">{(contact.name || '?').charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{contact.name}</p>
                            {contact.phone && <p className="text-white/50 text-sm">{contact.phone}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleBlindTransfer(contact)} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium">Blind</button>
                          <button onClick={() => handleAttendedTransfer(contact)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">Consult</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePanel === 'audio' && (
              <div className="p-4 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* Microphone picker */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-emerald-400" />
                    <span className="text-white font-medium">Microphone</span>
                  </div>
                  <div className="space-y-1">
                    {mics.length === 0 && <p className="text-white/40 text-sm">No microphones found</p>}
                    {mics.map(d => (
                      <button
                        key={d.deviceId}
                        onClick={() => switchMic(d.deviceId)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                          activeMicId === d.deviceId ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-white text-sm truncate">{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</span>
                        {activeMicId === d.deviceId && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speaker picker */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Speaker</span>
                  </div>
                  <div className="space-y-1">
                    {speakers.length === 0 && <p className="text-white/40 text-sm">Using system default speaker</p>}
                    {speakers.map(d => (
                      <button
                        key={d.deviceId}
                        onClick={() => switchSpeaker(d.deviceId)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                          activeSpeakerId === d.deviceId ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-white text-sm truncate">{d.label || `Speaker ${d.deviceId.slice(0, 6)}`}</span>
                        {activeSpeakerId === d.deviceId && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Cancellation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span className="text-white font-medium">Noise Cancellation</span>
                    </div>
                    <button
                      onClick={toggleNoise}
                      className={`w-12 h-6 rounded-full transition-colors ${noiseConfig.enabled ? 'bg-emerald-500' : 'bg-white/20'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${noiseConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {noiseConfig.enabled && (
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map(level => (
                        <button
                          key={level} onClick={() => setNoiseLevel(level)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                            noiseConfig.level === level ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audio Quality Indicator */}
                <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Audio Quality</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-white/50">Sample Rate</p><p className="text-white">48 kHz (HD)</p></div>
                    <div><p className="text-white/50">Codec</p><p className="text-white">Opus FEC+DTX</p></div>
                    <div><p className="text-white/50">Echo Cancel</p><p className="text-emerald-400">Active</p></div>
                    <div><p className="text-white/50">Voice Isolation</p><p className="text-emerald-400">Active</p></div>
                  </div>
                </div>
              </div>
            )}

            <div className="h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <DeviceTransferSheet
      open={showDeviceSheet}
      onClose={() => setShowDeviceSheet(false)}
      devices={availableDevices}
      isTransferring={isHandoffTransferring}
      onTransfer={async (deviceId) => {
        await initiateHandoff(callId, deviceId, {
          partnerId, partnerName: contactName, callType, isVideoOn, isMuted, duration,
        });
        setShowDeviceSheet(false);
        onClose();
      }}
      onLoadDevices={loadActiveDevices}
    />
    </>
  );
}

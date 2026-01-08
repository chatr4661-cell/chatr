/**
 * CallMoreMenu - VoIP Features Menu for UnifiedCallScreen
 * Integrates: Transfer, Park, Hold, Recording, Noise Cancellation
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, PhoneForwarded, ParkingCircle, Pause, Play,
  Mic, MicOff, Circle, Square, Headphones, Users, 
  Settings, Waves, Shield, Bluetooth
} from 'lucide-react';
import { useCallTransfer } from '@/hooks/useCallTransfer';
import { useCallPark } from '@/hooks/useCallPark';
import { useCallRecording } from '@/hooks/useCallRecording';
import { useNoiseCancellation } from '@/hooks/useNoiseCancellation';
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
  contacts?: Contact[];
  onHoldChange?: (isHeld: boolean) => void;
}

export default function CallMoreMenu({
  isOpen,
  onClose,
  callId,
  localStream,
  contacts = [],
  onHoldChange
}: CallMoreMenuProps) {
  const [activePanel, setActivePanel] = useState<'main' | 'transfer' | 'audio'>('main');
  const [isHeld, setIsHeld] = useState(false);
  
  const { blindTransfer, startAttendedTransfer, isTransferring } = useCallTransfer();
  const { parkCall } = useCallPark();
  const { isRecording, startRecording, stopRecording } = useCallRecording();
  const { config: noiseConfig, toggle: toggleNoise, setLevel: setNoiseLevel } = useNoiseCancellation();

  const handleHold = () => {
    const newHeld = !isHeld;
    setIsHeld(newHeld);
    onHoldChange?.(newHeld);
    toast.info(newHeld ? 'Call on hold' : 'Call resumed');
  };

  const handleParkCall = async () => {
    const slot = await parkCall(callId);
    if (slot) {
      toast.success(`Call parked at slot ${slot}`);
      onClose();
    }
  };

  const handleBlindTransfer = async (contact: Contact) => {
    const success = await blindTransfer(callId, contact.id, contact.name);
    if (success) {
      onClose();
    }
  };

  const handleAttendedTransfer = async (contact: Contact) => {
    const success = await startAttendedTransfer(callId, contact.id, contact.name);
    if (success) {
      onClose();
    }
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
    { 
      icon: isHeld ? Play : Pause, 
      label: isHeld ? 'Resume' : 'Hold', 
      action: handleHold,
      active: isHeld
    },
    { 
      icon: PhoneForwarded, 
      label: 'Transfer', 
      action: () => setActivePanel('transfer'),
      disabled: isTransferring
    },
    { 
      icon: ParkingCircle, 
      label: 'Park', 
      action: handleParkCall 
    },
    { 
      icon: isRecording ? Square : Circle, 
      label: isRecording ? 'Stop Rec' : 'Record', 
      action: handleToggleRecording,
      active: isRecording,
      color: isRecording ? 'text-red-500' : undefined
    },
    { 
      icon: Waves, 
      label: 'Audio', 
      action: () => setActivePanel('audio') 
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 inset-x-0 bg-slate-900 rounded-t-3xl max-h-[70vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {activePanel === 'main' && 'More Options'}
                {activePanel === 'transfer' && 'Transfer Call'}
                {activePanel === 'audio' && 'Audio Settings'}
              </h2>
              <button 
                onClick={activePanel === 'main' ? onClose : () => setActivePanel('main')}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Main Panel */}
            {activePanel === 'main' && (
              <div className="p-4 grid grid-cols-3 gap-4">
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      item.active 
                        ? 'bg-emerald-500/20 border border-emerald-500/50' 
                        : 'bg-white/5 hover:bg-white/10'
                    } ${item.disabled ? 'opacity-50' : ''}`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color || (item.active ? 'text-emerald-400' : 'text-white')}`} />
                    <span className={`text-xs ${item.active ? 'text-emerald-400' : 'text-white/70'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Transfer Panel */}
            {activePanel === 'transfer' && (
              <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                <p className="text-white/60 text-sm">Select a contact to transfer this call:</p>
                
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No contacts available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.slice(0, 10).map(contact => (
                      <div 
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-medium">{contact.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{contact.name}</p>
                            {contact.phone && (
                              <p className="text-white/50 text-sm">{contact.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBlindTransfer(contact)}
                            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium"
                          >
                            Blind
                          </button>
                          <button
                            onClick={() => handleAttendedTransfer(contact)}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium"
                          >
                            Consult
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio Settings Panel */}
            {activePanel === 'audio' && (
              <div className="p-4 space-y-6">
                {/* Noise Cancellation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <span className="text-white font-medium">Noise Cancellation</span>
                    </div>
                    <button
                      onClick={toggleNoise}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        noiseConfig.enabled ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        noiseConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  
                  {noiseConfig.enabled && (
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setNoiseLevel(level)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                            noiseConfig.level === level
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
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
                    <div>
                      <p className="text-white/50">Sample Rate</p>
                      <p className="text-white">48 kHz (HD)</p>
                    </div>
                    <div>
                      <p className="text-white/50">Channels</p>
                      <p className="text-white">Stereo</p>
                    </div>
                    <div>
                      <p className="text-white/50">Echo Cancel</p>
                      <p className="text-emerald-400">Active</p>
                    </div>
                    <div>
                      <p className="text-white/50">Voice Isolation</p>
                      <p className="text-emerald-400">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Safe area padding */}
            <div className="h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

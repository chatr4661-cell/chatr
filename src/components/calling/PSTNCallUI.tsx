/**
 * PSTN Call UI Component
 * For calling landlines and non-CHATR users
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Hash,
  DollarSign,
  Clock,
  Signal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PSTNCall, PSTNRates } from '@/services/calling/PSTNService';

interface PSTNCallUIProps {
  call: PSTNCall;
  rates: PSTNRates | null;
  onEndCall: () => void;
  onSendDTMF: (digits: string) => void;
}

export function PSTNCallUI({ call, rates, onEndCall, onSendDTMF }: PSTNCallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [duration, setDuration] = useState(0);

  // Duration timer
  useEffect(() => {
    if (call.status !== 'in-progress') return;

    const interval = setInterval(() => {
      if (call.startedAt) {
        const start = new Date(call.startedAt).getTime();
        setDuration(Math.floor((Date.now() - start) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [call.status, call.startedAt]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedCost = rates 
    ? ((Math.ceil(duration / 60) || 1) * rates.ratePerMinute / 100).toFixed(2)
    : '0.00';

  const dialpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between p-6 z-50">
      {/* Header */}
      <div className="text-center pt-12">
        <div className="flex items-center justify-center gap-2 text-amber-400 text-sm mb-2">
          <Signal className="w-4 h-4" />
          <span>PSTN Call</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">{call.to}</h1>
        
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {call.status === 'in-progress' 
              ? formatDuration(duration)
              : call.status === 'ringing' 
                ? 'Ringing...'
                : call.status}
          </span>
          
          {rates && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ~${estimatedCost}
            </span>
          )}
        </div>
      </div>

      {/* Dialpad */}
      <AnimatePresence>
        {showDialpad && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="grid grid-cols-3 gap-4 my-8"
          >
            {dialpadButtons.flat().map((digit) => (
              <button
                key={digit}
                onClick={() => onSendDTMF(digit)}
                className="w-16 h-16 rounded-full bg-slate-700 hover:bg-slate-600 
                         text-white text-2xl font-semibold transition-colors
                         active:scale-95"
              >
                {digit}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Status Animation */}
      {call.status === 'ringing' && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <Phone className="w-16 h-16 text-green-400" />
        </motion.div>
      )}

      {/* Controls */}
      <div className="pb-12">
        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                       ${isMuted ? 'bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={() => setShowDialpad(!showDialpad)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                       ${showDialpad ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            <Hash className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                       ${isSpeaker ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            <Volume2 className="w-6 h-6 text-white" />
          </button>
        </div>

        <Button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 
                   flex items-center justify-center mx-auto"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </Button>
      </div>
    </div>
  );
}

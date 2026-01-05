/**
 * Emergency Call Banner
 * Shows during E911/E112 calls with location info
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Phone, Shield } from 'lucide-react';
import { EmergencyLocation, PSAPInfo } from '@/services/emergency/E911Service';

interface EmergencyCallBannerProps {
  location: EmergencyLocation | null;
  psap: PSAPInfo | null;
  isLocating: boolean;
}

export function EmergencyCallBanner({ location, psap, isLocating }: EmergencyCallBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-600 text-white p-4 rounded-lg shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <AlertTriangle className="w-8 h-8" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 bg-white/30 rounded-full"
          />
        </div>
        <div>
          <h3 className="font-bold text-lg">Emergency Call Active</h3>
          <p className="text-red-100 text-sm">
            {psap?.name || 'Connecting to Emergency Services'}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {isLocating ? (
            <span className="animate-pulse">Acquiring location...</span>
          ) : location ? (
            <span>
              {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
              <span className="text-red-200 ml-2">
                (±{Math.round(location.accuracy)}m accuracy)
              </span>
            </span>
          ) : (
            <span className="text-red-200">Location unavailable</span>
          )}
        </div>

        {psap && (
          <>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{psap.jurisdiction}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>E911 Location Data Shared</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-red-500 text-xs text-red-200">
        Your precise location is being shared with emergency services
      </div>
    </motion.div>
  );
}

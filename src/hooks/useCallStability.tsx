import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseCallStabilityOptions {
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  maxReconnectAttempts?: number;
}

export const useCallStability = (options: UseCallStabilityOptions = {}) => {
  const {
    onConnectionLost,
    onConnectionRestored,
    maxReconnectAttempts = 5
  } = options;

  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent');
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const statsIntervalRef = useRef<NodeJS.Timeout>();

  // Monitor connection state changes
  const handleConnectionStateChange = useCallback((
    peerConnection: RTCPeerConnection,
    onReconnect: () => Promise<void>
  ) => {
    const state = peerConnection.connectionState;
    console.log('📡 Connection state changed:', state);
    setConnectionState(state);

    switch (state) {
      case 'connected':
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setNetworkQuality('excellent');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        onConnectionRestored?.();
        toast({
          title: 'Connection restored',
          description: 'Call quality is back to normal',
        });
        break;

      case 'disconnected':
      case 'failed':
        setNetworkQuality('disconnected');
        onConnectionLost?.();
        
        if (reconnectAttempts < maxReconnectAttempts) {
          setIsReconnecting(true);
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10s
          
          toast({
            title: 'Connection lost',
            description: `Reconnecting in ${Math.round(delay / 1000)}s...`,
            variant: 'destructive',
          });

          reconnectTimeoutRef.current = setTimeout(async () => {
            console.log(`🔄 Reconnect attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
            setReconnectAttempts(prev => prev + 1);
            
            try {
              await onReconnect();
            } catch (error) {
              console.error('Reconnection failed:', error);
            }
          }, delay);
        } else {
          toast({
            title: 'Connection failed',
            description: 'Unable to reconnect. Please try calling again.',
            variant: 'destructive',
          });
        }
        break;

      case 'closed':
        setIsReconnecting(false);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        break;
    }
  }, [reconnectAttempts, maxReconnectAttempts, onConnectionLost, onConnectionRestored, toast]);

  // Monitor connection quality
  const monitorConnectionQuality = useCallback(async (peerConnection: RTCPeerConnection) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let jitter = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            jitter = report.jitter || 0;
          }
        });

        // Calculate packet loss percentage
        const totalPackets = packetsLost + packetsReceived;
        const lossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        // Determine quality
        let quality: typeof networkQuality;
        if (lossPercentage < 1 && jitter < 0.03) {
          quality = 'excellent';
        } else if (lossPercentage < 5 && jitter < 0.05) {
          quality = 'good';
        } else if (lossPercentage < 10 && jitter < 0.1) {
          quality = 'poor';
        } else {
          quality = 'disconnected';
        }

        // Only update if quality changed significantly
        setNetworkQuality(prev => {
          if (prev !== quality) {
            console.log('📊 Network quality:', quality, `(${lossPercentage.toFixed(2)}% loss, ${(jitter * 1000).toFixed(0)}ms jitter)`);
            
            if (quality === 'poor') {
              toast({
                title: 'Poor connection',
                description: 'Call quality may be affected',
                variant: 'default',
              });
            }
          }
          return quality;
        });
      } catch (error) {
        console.error('Error monitoring connection:', error);
      }
    }, 3000); // Check every 3 seconds
  }, [toast]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // ICE connection restart (for network changes)
  const restartICE = useCallback(async (peerConnection: RTCPeerConnection) => {
    console.log('🔄 Restarting ICE connection...');
    try {
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('❌ ICE restart failed:', error);
      throw error;
    }
  }, []);

  return {
    connectionState,
    isReconnecting,
    reconnectAttempts,
    networkQuality,
    handleConnectionStateChange,
    monitorConnectionQuality,
    restartICE,
    cleanup
  };
};

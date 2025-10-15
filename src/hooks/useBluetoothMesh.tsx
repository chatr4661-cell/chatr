import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BleClient } from '@capacitor-community/bluetooth-le';

interface BluetoothPeer {
  id: string;
  name: string;
  device: any;
  characteristic?: any;
}

const SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const CHARACTERISTIC_UUID = '87654321-4321-8765-4321-fedcba987654';

export const useBluetoothMesh = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [peers, setPeers] = useState<BluetoothPeer[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkBluetooth = async () => {
      try {
        await BleClient.initialize();
        setIsSupported(true);
      } catch {
        setIsSupported('bluetooth' in (navigator as any));
      }
    };
    checkBluetooth();
  }, []);

  const scanForPeers = useCallback(async () => {
    if (!isSupported) {
      toast.error('Bluetooth not supported on this device');
      return;
    }

    setIsScanning(true);
    try {
      // Try native Capacitor BLE first
      await BleClient.initialize();
      
      await BleClient.requestLEScan(
        { services: [SERVICE_UUID] },
        (result) => {
          const newPeer: BluetoothPeer = {
            id: result.device.deviceId,
            name: result.device.name || 'Unknown Device',
            device: result.device,
          };

          setPeers(prev => {
            const exists = prev.find(p => p.id === result.device.deviceId);
            if (exists) return prev;
            return [...prev, newPeer];
          });
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(async () => {
        await BleClient.stopLEScan();
        setIsScanning(false);
        toast.success('Scan complete');
      }, 10000);

      // Save discovered peers to database
      const { data: { user } } = await supabase.auth.getUser();
      peers.forEach(async (peer) => {
        await supabase.from('mesh_peers' as any).insert({
          user_id: user?.id,
          peer_id: peer.id,
          peer_name: peer.name,
          connection_type: 'bluetooth',
          is_active: true,
        } as any);
      });

    } catch (error) {
      console.error('Bluetooth scan error:', error);
      
      // Fallback to Web Bluetooth API
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: [SERVICE_UUID] }],
          optionalServices: [SERVICE_UUID]
        });

        const server = await device.gatt?.connect();
        const service = await server?.getPrimaryService(SERVICE_UUID);
        const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

        if (device && characteristic) {
          const newPeer: BluetoothPeer = {
            id: device.id,
            name: device.name || 'Unknown Device',
            device,
            characteristic,
          };

          setPeers(prev => [...prev.filter(p => p.id !== device.id), newPeer]);

          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('mesh_peers' as any).insert({
            user_id: user?.id,
            peer_id: device.id,
            peer_name: device.name,
            connection_type: 'bluetooth',
            is_active: true,
          } as any);

          toast.success(`Connected to ${device.name}`);
        }
      } catch (webError) {
        toast.error('Failed to connect to device');
      }
      setIsScanning(false);
    }
  }, [isSupported, peers]);

  const sendMessage = useCallback(async (
    peerId: string,
    message: string,
    conversationId: string
  ) => {
    const peer = peers.find(p => p.id === peerId);
    if (!peer?.characteristic) {
      toast.error('Peer not connected');
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ message, conversationId }));
      
      await peer.characteristic.writeValue(data);

      // Save offline message
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('offline_messages' as any).insert({
        sender_id: user?.id,
        recipient_id: peerId,
        conversation_id: conversationId,
        content: message,
        sent_via: 'bluetooth',
      } as any);

      toast.success('Message sent via Bluetooth');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  }, [peers]);

  const syncOfflineMessages = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: offlineMessages } = await supabase
      .from('offline_messages' as any)
      .select('*')
      .eq('sender_id', user?.id)
      .eq('is_synced', false) as any;

    if (!offlineMessages?.length) return;

    for (const msg of offlineMessages) {
      await supabase.from('messages').insert({
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type,
      });

      await supabase
        .from('offline_messages' as any)
        .update({ is_synced: true, synced_at: new Date().toISOString() } as any)
        .eq('id', msg.id);
    }

    toast.success(`Synced ${offlineMessages.length} offline messages`);
  }, []);

  const disconnectPeer = useCallback(async (peerId: string) => {
    const peer = peers.find(p => p.id === peerId);
    if (peer?.device.gatt?.connected) {
      peer.device.gatt.disconnect();
    }

    setPeers(prev => prev.filter(p => p.id !== peerId));

    await supabase
      .from('mesh_peers' as any)
      .update({ is_active: false } as any)
      .eq('peer_id', peerId);

    toast.success('Peer disconnected');
  }, [peers]);

  return {
    isSupported,
    isScanning,
    peers,
    scanForPeers,
    sendMessage,
    syncOfflineMessages,
    disconnectPeer,
  };
};

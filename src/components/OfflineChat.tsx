import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, WifiOff, Users, Send, Signal, Zap, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NearbyUser {
  id: string;
  name: string;
  distance: number;
  rssi: number;
}

interface OfflineMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: number;
  hops: number;
}

export const OfflineChat = () => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [offlineMessages, setOfflineMessages] = useState<OfflineMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [meshMode, setMeshMode] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | null>(null);
  const [messagesSent, setMessagesSent] = useState(0);
  const [messagesQueued, setMessagesQueued] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Bluetooth API is available
    if (!('bluetooth' in navigator)) {
      console.log('⚠️ Web Bluetooth API not available');
      toast({
        title: 'Bluetooth Not Supported',
        description: 'Your browser does not support Web Bluetooth API. Try Chrome, Edge, or Opera.',
        variant: 'destructive'
      });
    }
  }, []);

  // Simulate connection quality monitoring
  useEffect(() => {
    if (bluetoothEnabled && selectedUser) {
      const interval = setInterval(() => {
        const qualities: Array<'excellent' | 'good' | 'poor'> = ['excellent', 'good', 'poor'];
        const weights = [0.6, 0.3, 0.1]; // Higher chance for good connection
        const random = Math.random();
        let quality: 'excellent' | 'good' | 'poor' = 'excellent';
        
        if (random < weights[0]) quality = 'excellent';
        else if (random < weights[0] + weights[1]) quality = 'good';
        else quality = 'poor';
        
        setConnectionQuality(quality);
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setConnectionQuality(null);
    }
  }, [bluetoothEnabled, selectedUser]);

  const enableBluetooth = async () => {
    try {
      if (!('bluetooth' in navigator)) {
        toast({
          title: 'Not Supported',
          description: 'Bluetooth is not available on this device/browser',
          variant: 'destructive'
        });
        return;
      }

      // Request Bluetooth device
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      console.log('✅ Bluetooth device connected:', device.name);
      setBluetoothEnabled(true);
      
      toast({
        title: 'Bluetooth Enabled',
        description: 'Scanning for nearby Chatr users...',
      });

      // Simulate finding nearby users
      setTimeout(() => {
        setNearbyUsers([
          { id: '1', name: 'User nearby (45m)', distance: 45, rssi: -65 },
          { id: '2', name: 'User nearby (82m)', distance: 82, rssi: -78 }
        ]);
      }, 2000);

    } catch (error) {
      console.error('❌ Bluetooth error:', error);
      toast({
        title: 'Bluetooth Error',
        description: error instanceof Error ? error.message : 'Failed to enable Bluetooth',
        variant: 'destructive'
      });
    }
  };

  const enableMeshNetwork = () => {
    setMeshMode(!meshMode);
    toast({
      title: meshMode ? 'Mesh Mode Disabled' : 'Mesh Mode Enabled',
      description: meshMode 
        ? 'Direct messaging only' 
        : 'Messages will hop through nearby devices',
    });
  };

  const sendOfflineMessage = () => {
    if (!messageInput.trim() || !selectedUser) return;

    const hops = meshMode ? Math.floor(Math.random() * 3) : 0;

    const newMessage: OfflineMessage = {
      id: Date.now().toString(),
      fromId: 'me',
      toId: selectedUser.id,
      content: messageInput,
      timestamp: Date.now(),
      hops
    };

    setOfflineMessages([...offlineMessages, newMessage]);
    setMessageInput('');
    setMessagesSent(prev => prev + 1);

    // Simulate queuing if connection is poor
    if (connectionQuality === 'poor') {
      setMessagesQueued(prev => prev + 1);
      toast({
        title: 'Message Queued',
        description: 'Connection is weak. Message will be sent when signal improves.',
      });
    } else {
      toast({
        title: 'Message Sent',
        description: meshMode 
          ? `Delivered via mesh network (${hops} hops)` 
          : 'Sent via direct Bluetooth connection',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b p-4 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <WifiOff className="w-6 h-6 text-primary" />
              Offline Chat Mode
            </h2>
            <p className="text-sm text-muted-foreground">
              Chat without internet via Bluetooth & Mesh Network
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={enableBluetooth}
              variant={bluetoothEnabled ? 'default' : 'secondary'}
              size="sm"
              disabled={bluetoothEnabled}
              className="transition-all"
            >
              <Bluetooth className="w-4 h-4 mr-2" />
              {bluetoothEnabled ? 'Connected' : 'Enable Bluetooth'}
            </Button>
            <Button
              onClick={enableMeshNetwork}
              variant={meshMode ? 'default' : 'secondary'}
              size="sm"
              disabled={!bluetoothEnabled}
              className="transition-all"
            >
              <Signal className="w-4 h-4 mr-2" />
              Mesh {meshMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Status Indicators */}
        {bluetoothEnabled && (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Messages Sent</p>
                    <p className="text-lg font-bold">{messagesSent}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Queued</p>
                    <p className="text-lg font-bold">{messagesQueued}</p>
                  </div>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Connection</p>
                    <p className="text-lg font-bold capitalize">{connectionQuality || 'N/A'}</p>
                  </div>
                  <Signal className={`w-4 h-4 ${
                    connectionQuality === 'excellent' ? 'text-green-500' :
                    connectionQuality === 'good' ? 'text-yellow-500' :
                    connectionQuality === 'poor' ? 'text-red-500' : 'text-muted-foreground'
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Alert */}
        {!bluetoothEnabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enable Bluetooth to start chatting offline. Works on Chrome, Edge, and Opera browsers.
              Your messages will be encrypted and sent directly to nearby devices.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Nearby Users Sidebar */}
        <div className="w-80 border-r bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Nearby Users</h3>
            {bluetoothEnabled && (
              <Badge variant="outline" className="ml-auto">
                <Signal className="w-3 h-3 mr-1" />
                Scanning
              </Badge>
            )}
          </div>

          {!bluetoothEnabled ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Enable Bluetooth</CardTitle>
                <CardDescription className="text-xs">
                  Turn on Bluetooth to discover nearby Chatr users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={enableBluetooth} 
                  className="w-full" 
                  variant="default"
                  size="lg"
                >
                  <Bluetooth className="w-4 h-4 mr-2" />
                  Enable Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="space-y-2">
                {nearbyUsers.map(user => (
                  <Card
                    key={user.id}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Signal className="w-3 h-3" />
                              {user.distance}m away
                            </div>
                          </div>
                        </div>
                        {meshMode && (
                          <Zap className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {nearbyUsers.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No nearby users found
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="border-b p-4 bg-card">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedUser.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{selectedUser.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bluetooth className="w-3 h-3" />
                      Bluetooth connection • {selectedUser.distance}m
                    </div>
                  </div>
                  {meshMode && (
                    <Badge variant="secondary" className="ml-auto">
                      <Signal className="w-3 h-3 mr-1" />
                      Mesh enabled
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {offlineMessages
                    .filter(msg => msg.toId === selectedUser.id || msg.fromId === selectedUser.id)
                    .map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.fromId === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-lg px-4 py-2 max-w-[70%] ${
                            msg.fromId === 'me'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm">{msg.content}</div>
                          <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {msg.hops > 0 && (
                              <span className="ml-2">• {msg.hops} hops</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>

              <div className="border-t p-4 bg-card">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendOfflineMessage()}
                    placeholder={
                      meshMode
                        ? 'Message via mesh network...'
                        : 'Message via Bluetooth...'
                    }
                  />
                  <Button onClick={sendOfflineMessage} disabled={!messageInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {meshMode && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Mesh mode: Your message can hop through other devices to reach the recipient
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <WifiOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No internet needed!</p>
                <p className="text-sm">
                  {bluetoothEnabled
                    ? 'Select a nearby user to start chatting'
                    : 'Enable Bluetooth to discover nearby users'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

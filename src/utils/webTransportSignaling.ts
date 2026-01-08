/**
 * WebTransport API for Low-Latency Signaling
 * 
 * WebTransport provides:
 * - QUIC-based transport (lower latency than WebSocket)
 * - Unreliable datagrams for ICE candidates (faster)
 * - Reliable streams for offers/answers
 * - Built-in connection migration
 * 
 * Note: Requires a WebTransport server (HTTP/3)
 * This implementation provides a fallback to WebSocket when unavailable
 */

// Feature detection
export const isWebTransportSupported = (): boolean => {
  return 'WebTransport' in window;
};

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'ping' | 'pong';
  callId: string;
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

export interface WebTransportStats {
  rtt: number;
  messagesReceived: number;
  messagesSent: number;
  datagramsReceived: number;
  datagramsSent: number;
}

/**
 * WebTransportSignaling
 * Low-latency signaling using WebTransport (QUIC) with WebSocket fallback
 */
export class WebTransportSignaling {
  private transport: WebTransport | null = null;
  private reliableWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pingInterval: NodeJS.Timeout | null = null;
  
  private userId: string;
  private callId: string;
  private serverUrl: string;
  
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private datagramsSent: number = 0;
  private datagramsReceived: number = 0;
  private lastRtt: number = 0;
  
  private onMessage?: (message: SignalMessage) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;
  private onError?: (error: Error) => void;
  
  constructor(
    serverUrl: string,
    userId: string,
    callId: string,
    options?: {
      onMessage?: (message: SignalMessage) => void;
      onConnected?: () => void;
      onDisconnected?: () => void;
      onError?: (error: Error) => void;
    }
  ) {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.callId = callId;
    this.onMessage = options?.onMessage;
    this.onConnected = options?.onConnected;
    this.onDisconnected = options?.onDisconnected;
    this.onError = options?.onError;
  }
  
  /**
   * Connect to WebTransport server
   */
  async connect(): Promise<boolean> {
    if (!isWebTransportSupported()) {
      console.warn('⚠️ [WebTransport] Not supported, use fallback signaling');
      return false;
    }
    
    try {
      console.log('🔌 [WebTransport] Connecting to', this.serverUrl);
      
      this.transport = new WebTransport(this.serverUrl);
      
      // Wait for connection
      await this.transport.ready;
      this.connected = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ [WebTransport] Connected');
      
      // Setup reliable bidirectional stream for offers/answers
      await this.setupReliableStream();
      
      // Start receiving datagrams (ICE candidates)
      this.startDatagramReceiver();
      
      // Start ping/pong for latency measurement
      this.startPingPong();
      
      // Handle connection close
      this.transport.closed.then(() => {
        this.handleDisconnect();
      }).catch((error) => {
        console.error('❌ [WebTransport] Connection error:', error);
        this.handleDisconnect();
      });
      
      this.onConnected?.();
      return true;
    } catch (error) {
      console.error('❌ [WebTransport] Failed to connect:', error);
      this.onError?.(error as Error);
      return false;
    }
  }
  
  /**
   * Setup reliable bidirectional stream for critical messages
   */
  private async setupReliableStream(): Promise<void> {
    if (!this.transport) return;
    
    try {
      const stream = await this.transport.createBidirectionalStream();
      this.reliableWriter = stream.writable.getWriter();
      
      // Read incoming reliable messages
      const reader = stream.readable.getReader();
      this.readReliableStream(reader);
      
      console.log('✅ [WebTransport] Reliable stream established');
    } catch (error) {
      console.error('❌ [WebTransport] Failed to create reliable stream:', error);
    }
  }
  
  /**
   * Read from reliable stream
   */
  private async readReliableStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    
    try {
      while (this.connected) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (value) {
          const text = decoder.decode(value);
          const message = JSON.parse(text) as SignalMessage;
          this.messagesReceived++;
          
          // Handle ping/pong internally
          if (message.type === 'pong') {
            this.lastRtt = Date.now() - message.timestamp;
            continue;
          }
          
          this.onMessage?.(message);
        }
      }
    } catch (error) {
      console.error('❌ [WebTransport] Stream read error:', error);
    }
  }
  
  /**
   * Start receiving datagrams (unreliable, low-latency)
   */
  private async startDatagramReceiver(): Promise<void> {
    if (!this.transport?.datagrams) return;
    
    const reader = this.transport.datagrams.readable.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (this.connected) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (value) {
          this.datagramsReceived++;
          const text = decoder.decode(value);
          const message = JSON.parse(text) as SignalMessage;
          this.onMessage?.(message);
        }
      }
    } catch (error) {
      console.error('❌ [WebTransport] Datagram read error:', error);
    }
  }
  
  /**
   * Start ping/pong for latency measurement
   */
  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.sendReliable({
          type: 'ping',
          callId: this.callId,
          from: this.userId,
          to: '',
          data: null,
          timestamp: Date.now()
        });
      }
    }, 5000);
  }
  
  /**
   * Send message via reliable stream (offers/answers)
   */
  async sendReliable(message: SignalMessage): Promise<boolean> {
    if (!this.reliableWriter || !this.connected) {
      console.warn('⚠️ [WebTransport] Not connected for reliable send');
      return false;
    }
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      await this.reliableWriter.write(data);
      this.messagesSent++;
      return true;
    } catch (error) {
      console.error('❌ [WebTransport] Reliable send failed:', error);
      return false;
    }
  }
  
  /**
   * Send message via datagram (ICE candidates - unreliable but faster)
   */
  async sendDatagram(message: SignalMessage): Promise<boolean> {
    if (!this.transport?.datagrams || !this.connected) {
      // Fallback to reliable if datagrams not available
      return this.sendReliable(message);
    }
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      const writer = this.transport.datagrams.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      this.datagramsSent++;
      return true;
    } catch (error) {
      console.warn('⚠️ [WebTransport] Datagram send failed, using reliable:', error);
      return this.sendReliable(message);
    }
  }
  
  /**
   * Send offer (reliable)
   */
  async sendOffer(to: string, offer: RTCSessionDescriptionInit): Promise<boolean> {
    return this.sendReliable({
      type: 'offer',
      callId: this.callId,
      from: this.userId,
      to,
      data: offer,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send answer (reliable)
   */
  async sendAnswer(to: string, answer: RTCSessionDescriptionInit): Promise<boolean> {
    return this.sendReliable({
      type: 'answer',
      callId: this.callId,
      from: this.userId,
      to,
      data: answer,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send ICE candidate (datagram - unreliable but faster)
   */
  async sendIceCandidate(to: string, candidate: RTCIceCandidate): Promise<boolean> {
    return this.sendDatagram({
      type: 'ice-candidate',
      callId: this.callId,
      from: this.userId,
      to,
      data: candidate.toJSON(),
      timestamp: Date.now()
    });
  }
  
  /**
   * Send hangup (reliable)
   */
  async sendHangup(to: string): Promise<boolean> {
    return this.sendReliable({
      type: 'hangup',
      callId: this.callId,
      from: this.userId,
      to,
      data: null,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.connected = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.onDisconnected?.();
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 [WebTransport] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }
  
  /**
   * Get connection statistics
   */
  getStats(): WebTransportStats {
    return {
      rtt: this.lastRtt,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      datagramsReceived: this.datagramsReceived,
      datagramsSent: this.datagramsSent
    };
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Get RTT (round-trip time)
   */
  getRtt(): number {
    return this.lastRtt;
  }
  
  /**
   * Close connection
   */
  async close(): Promise<void> {
    this.connected = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reliableWriter) {
      try {
        await this.reliableWriter.close();
      } catch {}
      this.reliableWriter = null;
    }
    
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {}
      this.transport = null;
    }
    
    console.log('👋 [WebTransport] Closed');
  }
}

/**
 * Hybrid Signaling Manager
 * Uses WebTransport when available, falls back to Supabase Realtime
 */
export class HybridSignalingManager {
  private webTransport: WebTransportSignaling | null = null;
  private useWebTransport: boolean = false;
  
  async initialize(
    serverUrl: string | null,
    userId: string,
    callId: string,
    onMessage: (message: SignalMessage) => void
  ): Promise<'webtransport' | 'fallback'> {
    // Try WebTransport first if server URL provided
    if (serverUrl && isWebTransportSupported()) {
      this.webTransport = new WebTransportSignaling(
        serverUrl,
        userId,
        callId,
        { onMessage }
      );
      
      const connected = await this.webTransport.connect();
      if (connected) {
        this.useWebTransport = true;
        console.log('✅ [HybridSignaling] Using WebTransport');
        return 'webtransport';
      }
    }
    
    console.log('ℹ️ [HybridSignaling] Using Supabase Realtime fallback');
    return 'fallback';
  }
  
  async sendSignal(
    type: SignalMessage['type'],
    to: string,
    data: any,
    userId: string,
    callId: string
  ): Promise<boolean> {
    if (this.useWebTransport && this.webTransport) {
      const message: SignalMessage = {
        type,
        callId,
        from: userId,
        to,
        data,
        timestamp: Date.now()
      };
      
      // Use datagram for ICE candidates, reliable for others
      if (type === 'ice-candidate') {
        return this.webTransport.sendDatagram(message);
      }
      return this.webTransport.sendReliable(message);
    }
    
    // Return false to indicate fallback should be used
    return false;
  }
  
  isUsingWebTransport(): boolean {
    return this.useWebTransport;
  }
  
  getStats(): WebTransportStats | null {
    return this.webTransport?.getStats() || null;
  }
  
  async close(): Promise<void> {
    await this.webTransport?.close();
    this.webTransport = null;
    this.useWebTransport = false;
  }
}

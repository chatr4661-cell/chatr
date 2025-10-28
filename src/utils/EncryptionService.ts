/**
 * End-to-End Encryption Service
 * Uses ECDH (X25519) for key exchange + AES-GCM for data encryption
 */

export class EncryptionService {
  private keyPair: CryptoKeyPair | null = null;

  /**
   * Generate ephemeral ECDH key pair
   */
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey('raw', this.keyPair.publicKey);
    const publicKeyBase64 = this.arrayBufferToBase64(publicKeyBuffer);

    return {
      publicKey: publicKeyBase64,
      privateKey: this.keyPair.privateKey
    };
  }

  /**
   * Derive shared AES-GCM key from ECDH exchange
   */
  async deriveSharedKey(theirPublicKeyBase64: string, ourPrivateKey: CryptoKey): Promise<CryptoKey> {
    const theirPublicKeyBuffer = this.base64ToArrayBuffer(theirPublicKeyBase64);
    const theirPublicKey = await window.crypto.subtle.importKey(
      'raw',
      theirPublicKeyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: theirPublicKey
      },
      ourPrivateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-GCM
   */
  async encrypt(data: ArrayBuffer, sharedKey: CryptoKey): Promise<{ 
    ciphertext: string; 
    iv: string;
    authTag: string;
  }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      sharedKey,
      data
    );

    // Split auth tag (last 16 bytes) from ciphertext
    const ciphertextArray = new Uint8Array(encryptedBuffer);
    const ciphertext = ciphertextArray.slice(0, -16);
    const authTag = ciphertextArray.slice(-16);

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext.buffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      authTag: this.arrayBufferToBase64(authTag.buffer)
    };
  }

  /**
   * Decrypt data with AES-GCM
   */
  async decrypt(
    ciphertextBase64: string, 
    ivBase64: string,
    authTagBase64: string,
    sharedKey: CryptoKey
  ): Promise<ArrayBuffer> {
    const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
    const iv = this.base64ToArrayBuffer(ivBase64);
    const authTag = this.base64ToArrayBuffer(authTagBase64);

    // Combine ciphertext + auth tag
    const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(authTag), ciphertext.byteLength);

    return await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: 128
      },
      sharedKey,
      combined.buffer
    );
  }

  /**
   * Generate SHA-256 checksum for integrity verification
   */
  async generateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify checksum
   */
  async verifyChecksum(data: ArrayBuffer, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  // Helper methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Chunk data for transfer (32KB chunks)
   */
  chunkData(data: ArrayBuffer, chunkSize = 32 * 1024): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    for (let i = 0; i < data.byteLength; i += chunkSize) {
      chunks.push(data.slice(i, Math.min(i + chunkSize, data.byteLength)));
    }
    return chunks;
  }

  /**
   * Reassemble chunks
   */
  reassembleChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    
    chunks.forEach(chunk => {
      result.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });
    
    return result.buffer;
  }
}

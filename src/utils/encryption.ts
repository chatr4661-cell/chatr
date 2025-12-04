/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for client-side encryption
 */

export class E2EEncryption {
  private static algorithm = {
    name: 'AES-GCM',
    length: 256,
  };

  /**
   * Generate a new encryption key pair for a user
   */
  static async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKey: this.arrayBufferToBase64(publicKey),
      privateKey: this.arrayBufferToBase64(privateKey),
    };
  }

  /**
   * Encrypt a message
   */
  static async encryptMessage(
    message: string,
    recipientPublicKey: string
  ): Promise<{
    encryptedMessage: string;
    iv: string;
    symmetricKey: string;
  }> {
    // Generate a random symmetric key
    const symmetricKey = await window.crypto.subtle.generateKey(
      this.algorithm,
      true,
      ['encrypt', 'decrypt']
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the message with the symmetric key
    const encoder = new TextEncoder();
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: this.algorithm.name,
        iv,
      },
      symmetricKey,
      encoder.encode(message)
    );

    // Export symmetric key
    const exportedKey = await window.crypto.subtle.exportKey('raw', symmetricKey);

    // Encrypt the symmetric key with recipient's public key
    const publicKey = await this.importPublicKey(recipientPublicKey);
    const encryptedSymmetricKey = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      exportedKey
    );

    return {
      encryptedMessage: this.arrayBufferToBase64(encryptedContent),
      iv: this.arrayBufferToBase64(iv.buffer), // Use iv.buffer for ArrayBuffer
      symmetricKey: this.arrayBufferToBase64(encryptedSymmetricKey),
    };
  }

  /**
   * Decrypt a message
   */
  static async decryptMessage(
    encryptedMessage: string,
    encryptedSymmetricKey: string,
    iv: string,
    privateKey: string
  ): Promise<string> {
    // Import private key
    const key = await this.importPrivateKey(privateKey);

    // Decrypt symmetric key
    const symmetricKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      key,
      this.base64ToArrayBuffer(encryptedSymmetricKey)
    );

    // Import symmetric key
    const symmetricKey = await window.crypto.subtle.importKey(
      'raw',
      symmetricKeyBuffer,
      this.algorithm,
      false,
      ['decrypt']
    );

    // Decrypt message
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: this.algorithm.name,
        iv: this.base64ToArrayBuffer(iv),
      },
      symmetricKey,
      this.base64ToArrayBuffer(encryptedMessage)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  }

  /**
   * Store private key securely in IndexedDB (with Capacitor fallback for mobile)
   */
  static async storePrivateKey(userId: string, privateKey: string): Promise<void> {
    try {
      // Try Capacitor Secure Storage first (for mobile)
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        await SecureStoragePlugin.set({ key: `chatr_private_key_${userId}`, value: privateKey });
        console.log('✅ Private key stored in native secure storage');
        return;
      }
    } catch (e) {
      console.warn('Capacitor secure storage not available, using IndexedDB');
    }

    // Fallback to IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatrEncryption', 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        
        store.put({ userId, privateKey, createdAt: Date.now() });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'userId' });
        }
      };
    });
  }

  /**
   * Retrieve private key from secure storage
   */
  static async getPrivateKey(userId: string): Promise<string | null> {
    try {
      // Try Capacitor Secure Storage first (for mobile)
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        const result = await SecureStoragePlugin.get({ key: `chatr_private_key_${userId}` });
        if (result.value) {
          console.log('✅ Private key retrieved from native secure storage');
          return result.value;
        }
      }
    } catch (e) {
      // Key not found or not on mobile
    }

    // Fallback to IndexedDB
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChatrEncryption', 1);

      request.onerror = () => {
        console.warn('IndexedDB error, returning null');
        resolve(null);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('keys')) {
          resolve(null);
          return;
        }
        
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get(userId);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.privateKey || null);
        };
        getRequest.onerror = () => {
          console.warn('Error getting key from IndexedDB');
          resolve(null);
        };
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'userId' });
        }
      };
    });
  }

  // Helper methods
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer; // Return the underlying ArrayBuffer
  }

  private static async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    );
  }

  private static async importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    );
  }
}

/**
 * Encryption Service (Optional)
 * Lightweight client-side encryption for privacy
 */

/**
 * Generate encryption key
 */
export const generateKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Export key as base64 string
 */
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

/**
 * Import key from base64 string
 */
export const importKey = async (keyString: string): Promise<CryptoKey> => {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt data
 */
export const encryptData = async (
  data: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
};

/**
 * Decrypt data
 */
export const decryptData = async (
  encryptedData: string,
  ivString: string,
  key: CryptoKey
): Promise<string> => {
  const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivString), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
};

/**
 * Encrypt file
 */
export const encryptFile = async (
  file: File,
  key: CryptoKey
): Promise<{ encrypted: Blob; iv: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileData = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileData
  );

  return {
    encrypted: new Blob([encrypted]),
    iv: btoa(String.fromCharCode(...iv)),
  };
};

/**
 * Decrypt file
 */
export const decryptFile = async (
  encryptedBlob: Blob,
  ivString: string,
  key: CryptoKey
): Promise<Blob> => {
  const encrypted = await encryptedBlob.arrayBuffer();
  const iv = Uint8Array.from(atob(ivString), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return new Blob([decrypted]);
};

import type { EncryptedData } from '@/types/crypto';

/**
 * ArrayBufferをBase64文字列に変換
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64文字列をArrayBufferに変換
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * データを暗号化
 */
export async function encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCMでは12バイト推奨
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    new TextEncoder().encode(data)
  );
  
  return {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encrypted),
    algorithm: 'AES-GCM',
    version: 1
  };
}

/**
 * データを復号化
 */
export async function decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
  if (encryptedData.algorithm !== 'AES-GCM') {
    throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
  }
  
  if (encryptedData.version !== 1) {
    throw new Error(`Unsupported data version: ${encryptedData.version}`);
  }
  
  const iv = base64ToArrayBuffer(encryptedData.iv);
  const data = base64ToArrayBuffer(encryptedData.data);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  );
  
  return new TextDecoder().decode(decrypted);
}

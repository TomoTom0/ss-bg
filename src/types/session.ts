/**
 * セッション情報（メモリ上のみ）
 */
export interface Session {
  encryptionKey: CryptoKey;
  credentialId: ArrayBuffer;
  expiresAt: number;       // Unix timestamp (ms)
  isLocked: boolean;
}

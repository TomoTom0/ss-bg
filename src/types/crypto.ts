/**
 * 暗号化データ型
 */
export interface EncryptedData {
  iv: string;              // Base64エンコードされたIV (12 bytes for AES-GCM)
  data: string;            // Base64エンコードされた暗号化データ
  algorithm: 'AES-GCM';    
  version: 1;              // データフォーマットバージョン
}

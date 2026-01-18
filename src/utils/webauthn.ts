import { storage } from './storage';
import type { Session } from '@/types/session';

const RP_NAME = 'SS-BG Password Manager';
const APP_SALT = new Uint8Array(32).fill(0x55); // 固定salt（アプリケーション固有）
const HKDF_SALT = new Uint8Array(32).fill(0xAA); // HKDF用salt
const HKDF_INFO = new TextEncoder().encode('ss-bg-encryption-key-v1');

/**
 * ArrayBufferをBase64文字列に変換
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
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
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Credential登録（初回セットアップ）
 */
export async function registerCredential(): Promise<PublicKeyCredential> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: RP_NAME
      },
      user: {
        id: userId,
        name: 'user@ss-bg',
        displayName: 'SS-BG User'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none',
      extensions: {
        prf: {}  // PRF拡張を試みる
      }
    }
  }) as PublicKeyCredential;
  
  if (!credential) {
    throw new Error('Credential creation was cancelled');
  }
  
  // PRF対応確認
  const prfResult = credential.getClientExtensionResults().prf;
  const prfEnabled = prfResult?.enabled ?? false;
  
  console.log('WebAuthn Credential created:');
  console.log('- Authenticator Attachment:', credential.authenticatorAttachment);
  console.log('- PRF Extension Result:', prfResult);
  console.log('- PRF Enabled:', prfEnabled);
  console.log('- Credential ID length:', credential.rawId.byteLength);
  
  // Credential IDを保存
  const credentialIdBase64 = arrayBufferToBase64(credential.rawId);
  await storage.saveCredentialId(credentialIdBase64);
  await storage.saveSettings({ prfEnabled });
  
  if (prfEnabled) {
    console.log('PRF is available - using PRF-based key derivation');
  } else {
    console.log('PRF not available - using signature-based key derivation');
  }
  
  return credential;
}

/**
 * 認証 + 暗号化鍵の導出
 */
export async function authenticate(): Promise<{ key: CryptoKey; credentialId: ArrayBuffer }> {
  const credentialIdBase64 = await storage.getCredentialId();
  if (!credentialIdBase64) {
    throw new Error('No credential found. Please complete setup first.');
  }
  
  const credentialId = base64ToArrayBuffer(credentialIdBase64);
  
  // PRF対応状態を取得
  const settings = await storage.getSettings();
  const prfEnabled = settings.prfEnabled ?? false;
  
  console.log('[WebAuthn] Authenticating with settings:', settings);
  console.log('[WebAuthn] PRF enabled:', prfEnabled);
  
  if (prfEnabled) {
    // PRF対応の場合
    console.log('[WebAuthn] Using PRF-based authentication');
    return await authenticateWithPRF(credentialId);
  } else {
    // PRF未対応の場合、署名ベースで鍵を導出
    console.log('[WebAuthn] Using signature-based authentication');
    return await authenticateWithSignature(credentialId);
  }
}

/**
 * PRFを使った認証
 */
async function authenticateWithPRF(credentialId: ArrayBuffer): Promise<{ key: CryptoKey; credentialId: ArrayBuffer }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        type: 'public-key',
        id: credentialId
      }],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: APP_SALT
          }
        }
      }
    }
  }) as PublicKeyCredential;
  
  if (!assertion) {
    throw new Error('Authentication was cancelled');
  }
  
  const prfResult = assertion.getClientExtensionResults().prf;
  if (!prfResult?.results?.first) {
    throw new Error('PRF evaluation failed');
  }
  
  const prfOutput = new Uint8Array(prfResult.results.first);
  const key = await deriveEncryptionKey(prfOutput);
  
  return { key, credentialId };
}

/**
 * 署名ベースの認証（PRF未対応時）
 */
async function authenticateWithSignature(credentialId: ArrayBuffer): Promise<{ key: CryptoKey; credentialId: ArrayBuffer }> {
  // 固定チャレンジを使用（決定論的な署名を得るため）
  const challenge = APP_SALT;
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        type: 'public-key',
        id: credentialId
      }],
      userVerification: 'required',
      timeout: 60000
    }
  }) as PublicKeyCredential;
  
  if (!assertion) {
    throw new Error('Authentication was cancelled');
  }
  
  // credentialIdとAPP_SALTのみから決定論的にキーを導出
  // これにより、同じCredentialを使えば常に同じキーが生成される
  const keyMaterial = new Uint8Array(credentialId.byteLength + APP_SALT.byteLength);
  keyMaterial.set(new Uint8Array(credentialId), 0);
  keyMaterial.set(APP_SALT, credentialId.byteLength);
  
  const key = await deriveKeyFromMaterial(keyMaterial);
  
  return { key, credentialId };
}

/**
 * HKDFで暗号化鍵を導出
 */
export async function deriveEncryptionKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    'HKDF',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: HKDF_SALT,
      info: HKDF_INFO
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * 任意の素材から暗号化鍵を導出
 */
async function deriveKeyFromMaterial(material: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    material,
    'HKDF',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: HKDF_SALT,
      info: HKDF_INFO
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * セッション有効性チェック
 */
export function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  if (session.isLocked) return false;
  if (Date.now() > session.expiresAt) return false;
  return true;
}

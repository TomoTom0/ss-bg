import type { Message, Response } from '@/types/message';
import type { Session } from '@/types/session';
import type { PasswordEntry } from '@/types/storage';
import { authenticate, isSessionValid, registerCredential } from '@/utils/webauthn';
import { decrypt, encrypt } from '@/utils/crypto';
import { storage } from '@/utils/storage';
import { matchUrls } from '@/utils/url-matcher';

// セッション（メモリ上のみ）
let currentSession: Session | null = null;

/**
 * Service Workerの起動時にsession storageからセッションを復元
 */
async function restoreSession(): Promise<void> {
  try {
    const sessionData = await chrome.storage.session.get(['encryptionKeyJwk', 'credentialId', 'expiresAt', 'isLocked']);
    
    if (sessionData.encryptionKeyJwk && sessionData.credentialId) {
      // JWKからCryptoKeyを復元
      const key = await crypto.subtle.importKey(
        'jwk',
        sessionData.encryptionKeyJwk,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Base64からArrayBufferを復元
      const credentialId = base64ToArrayBuffer(sessionData.credentialId);
      
      currentSession = {
        encryptionKey: key,
        credentialId,
        expiresAt: sessionData.expiresAt || 0,
        isLocked: sessionData.isLocked || false
      };
      
      console.log('Session restored from storage');
    }
  } catch (error) {
    console.error('Failed to restore session:', error);
  }
}

// Service Worker起動時にセッションを復元
restoreSession();

/**
 * セッションを作成
 */
export async function createSession(
  encryptionKey: CryptoKey,
  credentialId: ArrayBuffer,
  timeoutMinutes: number
): Promise<void> {
  const expiresAt = Date.now() + timeoutMinutes * 60 * 1000;
  
  currentSession = {
    encryptionKey,
    credentialId,
    expiresAt,
    isLocked: false
  };
  
  // session storageに保存してService Worker再起動後も維持
  const keyJwk = await crypto.subtle.exportKey('jwk', encryptionKey);
  await chrome.storage.session.set({
    encryptionKeyJwk: keyJwk,
    credentialId: arrayBufferToBase64(credentialId),
    expiresAt,
    isLocked: false
  });
}

/**
 * 現在のセッションを取得
 */
export function getCurrentSession(): Session | null {
  return currentSession;
}

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
 * セッションをロック
 */
export async function lockSession(): Promise<void> {
  currentSession = null;
  await chrome.storage.session.clear();
}

/**
 * セッションステータスを取得
 */
export function getSessionStatus(): { authenticated: boolean; expiresAt?: number } {
  const isValid = isSessionValid(currentSession);
  const now = Date.now();
  if (currentSession) {
    console.log('Session check:', {
      now: new Date(now).toISOString(),
      expiresAt: new Date(currentSession.expiresAt).toISOString(),
      isLocked: currentSession.isLocked,
      timeLeft: Math.round((currentSession.expiresAt - now) / 1000 / 60) + ' minutes',
      isValid
    });
  }
  return {
    authenticated: isValid,
    expiresAt: currentSession?.expiresAt
  };
}

/**
 * メッセージハンドラ
 */
export async function handleMessage(message: Message): Promise<Response> {
  try {
    switch (message.type) {
      case 'CREATE_SESSION':
        return await handleCreateSession(message.payload);
      
      case 'AUTHENTICATE':
        return await handleAuthenticate();
      
      case 'GET_PASSWORDS':
        return await handleGetPasswords();
      
      case 'SAVE_PASSWORD':
        return await handleSavePassword(message.payload);
      
      case 'UPDATE_PASSWORD':
        return await handleUpdatePassword(message.payload);
      
      case 'DELETE_PASSWORD':
        return await handleDeletePassword(message.payload);
      
      case 'AUTOFILL_REQUEST':
        return await handleAutofillRequest(message.payload);
      
      case 'LOCK_SESSION':
        return handleLockSession();
      
      case 'GET_SESSION_STATUS':
        return handleGetSessionStatus();
      
      case 'TAKE_SCREENSHOT':
        return await handleTakeScreenshot(message.payload);
      
      case 'GET_SETTINGS':
        return await handleGetSettings();
      
      case 'UPDATE_SETTINGS':
        return await handleUpdateSettings(message.payload);
      
      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * セッション作成（オプションページから呼ばれる）
 */
async function handleCreateSession(payload: {
  encryptionKey: JsonWebKey;
  credentialId: string;
  timeoutMinutes: number;
}): Promise<Response> {
  try {
    // JWK形式のキーをCryptoKeyにインポート
    const key = await crypto.subtle.importKey(
      'jwk',
      payload.encryptionKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Base64をArrayBufferに変換
    const credentialId = base64ToArrayBuffer(payload.credentialId);
    
    console.log('Creating session with timeout:', payload.timeoutMinutes, 'minutes');
    console.log('Session will expire at:', new Date(Date.now() + payload.timeoutMinutes * 60 * 1000).toISOString());
    
    await createSession(key, credentialId, payload.timeoutMinutes);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session'
    };
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 認証処理（後方互換性のため残す。Popupから使用）
 */
async function handleAuthenticate(): Promise<Response> {
  try {
    const { key, credentialId } = await authenticate();
    
    const settings = await storage.getSettings();
    const timeout = settings.sessionTimeout || 30;
    
    await createSession(key, credentialId, timeout);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * パスワード取得
 */
async function handleGetPasswords(): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    return { success: false, error: 'Session expired. Please authenticate.' };
  }
  
  try {
    const encryptedData = await storage.getEncryptedPasswords();
    if (!encryptedData) {
      return { success: true, data: [] };
    }
    
    const decryptedJson = await decrypt(encryptedData, currentSession!.encryptionKey);
    const passwords = JSON.parse(decryptedJson);
    
    return { success: true, data: passwords };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get passwords'
    };
  }
}

/**
 * パスワード保存
 */
async function handleSavePassword(entry: PasswordEntry): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    return { success: false, error: 'Session expired' };
  }
  
  try {
    const response = await handleGetPasswords();
    if (!response.success) {
      return response;
    }
    
    const passwords = (response.data as PasswordEntry[]) || [];
    passwords.push(entry);
    
    const json = JSON.stringify(passwords);
    const encrypted = await encrypt(json, currentSession!.encryptionKey);
    
    await storage.saveEncryptedPasswords(encrypted);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save password'
    };
  }
}

/**
 * パスワード更新
 */
async function handleUpdatePassword(payload: { id: string; entry: PasswordEntry }): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    return { success: false, error: 'Session expired' };
  }
  
  try {
    const response = await handleGetPasswords();
    if (!response.success) {
      return response;
    }
    
    const passwords = (response.data as PasswordEntry[]) || [];
    const index = passwords.findIndex(p => p.id === payload.id);
    
    if (index === -1) {
      return { success: false, error: 'Password not found' };
    }
    
    passwords[index] = payload.entry;
    
    const json = JSON.stringify(passwords);
    const encrypted = await encrypt(json, currentSession!.encryptionKey);
    
    await storage.saveEncryptedPasswords(encrypted);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password'
    };
  }
}

/**
 * パスワード削除
 */
async function handleDeletePassword(payload: { id: string }): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    return { success: false, error: 'Session expired' };
  }
  
  try {
    const response = await handleGetPasswords();
    if (!response.success) {
      return response;
    }
    
    const passwords = (response.data as PasswordEntry[]) || [];
    const filtered = passwords.filter(p => p.id !== payload.id);
    
    const json = JSON.stringify(filtered);
    const encrypted = await encrypt(json, currentSession!.encryptionKey);
    
    await storage.saveEncryptedPasswords(encrypted);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete password'
    };
  }
}

/**
 * 自動入力リクエスト
 */
async function handleAutofillRequest(payload: { url: string; tabId: number }): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    // 未認証の場合、Popupを開いて認証を促す
    await chrome.action.openPopup();
    return { success: false, error: 'Authentication required. Please authenticate in the popup.' };
  }
  
  const passwordsResponse = await handleGetPasswords();
  if (!passwordsResponse.success) {
    return passwordsResponse;
  }
  
  const passwords = passwordsResponse.data as PasswordEntry[];
  const matches = matchUrls(payload.url, passwords);
  
  if (matches.length === 0) {
    return { success: false, error: 'No matching passwords found for this URL' };
  }
  
  // 候補が1つの場合は自動的に入力
  if (matches.length === 1) {
    await chrome.tabs.sendMessage(payload.tabId, {
      type: 'FILL_PASSWORD',
      payload: matches[0]
    });
    return { success: true };
  }
  
  // 複数候補がある場合は選択UIを表示
  // chrome.storageに候補を保存してPopupで表示
  await chrome.storage.session.set({
    autofillCandidates: matches,
    autofillTabId: payload.tabId
  });
  
  await chrome.action.openPopup();
  return { success: true, data: { needsSelection: true, count: matches.length } };
}

/**
 * セッションロック
 */
function handleLockSession(): Response {
  lockSession();
  return { success: true };
}

/**
 * セッションステータス取得
 */
function handleGetSessionStatus(): Response {
  const status = getSessionStatus();
  return { success: true, data: status };
}

/**
 * スクリーンショット撮影
 */
async function handleTakeScreenshot(payload: { crop: boolean }): Promise<Response> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.windowId) {
      return { success: false, error: 'No active tab found' };
    }
    
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });
    
    if (payload.crop) {
      // トリミングUIを表示（Phase 3で実装）
      // TODO: implement cropping UI
    }
    
    const filename = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    
    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: false
    });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take screenshot'
    };
  }
}

/**
 * 設定取得
 */
async function handleGetSettings(): Promise<Response> {
  try {
    const settings = await storage.getSettings();
    return { success: true, data: settings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get settings'
    };
  }
}

/**
 * 設定更新
 */
async function handleUpdateSettings(payload: Partial<import('@/types/storage').AppSettings>): Promise<Response> {
  try {
    await storage.saveSettings(payload);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    };
  }
}

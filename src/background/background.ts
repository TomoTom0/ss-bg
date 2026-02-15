import type { Message, Response } from '@/types/message';
import type { Session } from '@/types/session';
import type { PasswordEntry } from '@/types/storage';
import { authenticate, isSessionValid } from '@/utils/webauthn';
import { decrypt, encrypt } from '@/utils/crypto';
import { storage } from '@/utils/storage';
import { isStringRecord, isAppSettings, isPasswordEntry } from '@/types/message';

// セッション（メモリ上のみ）
let currentSession: Session | null = null;

/**
 * Service Workerの起動時にsession storageからセッションを復元
 */
async function restoreSession(): Promise<void> {
  try {
    const sessionData = await chrome.storage.session.get(['encryptionKeyJwk', 'credentialId', 'expiresAt', 'isLocked']);

    if (isStringRecord(sessionData) &&
        typeof sessionData.encryptionKeyJwk === 'object' &&
        sessionData.encryptionKeyJwk !== null &&
        typeof sessionData.credentialId === 'string') {
      // JWKからCryptoKeyを復元
      const key = await crypto.subtle.importKey(
        'jwk',
        sessionData.encryptionKeyJwk as JsonWebKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Base64からArrayBufferを復元
      const credentialId = base64ToArrayBuffer(sessionData.credentialId);

      currentSession = {
        encryptionKey: key,
        credentialId,
        expiresAt: typeof sessionData.expiresAt === 'number' ? sessionData.expiresAt : 0,
        isLocked: typeof sessionData.isLocked === 'boolean' ? sessionData.isLocked : false
      };

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
        if (!isStringRecord(message.payload)) {
          return { success: false, error: 'Invalid payload for CREATE_SESSION' };
        }
        return await handleCreateSession(message.payload as {
          encryptionKey: JsonWebKey;
          credentialId: string;
          timeoutMinutes: number;
        });

      case 'AUTHENTICATE':
        return await handleAuthenticate();

      case 'GET_PASSWORDS':
        return await handleGetPasswords();

      case 'SAVE_PASSWORD':
        if (!isPasswordEntry(message.payload)) {
          return { success: false, error: 'Invalid payload for SAVE_PASSWORD' };
        }
        return await handleSavePassword(message.payload as PasswordEntry);

      case 'UPDATE_PASSWORD':
        if (!isStringRecord(message.payload)) {
          return { success: false, error: 'Invalid payload for UPDATE_PASSWORD' };
        }
        return await handleUpdatePassword(message.payload as { id: string; entry: PasswordEntry });

      case 'DELETE_PASSWORD':
        if (!isStringRecord(message.payload) || !('id' in message.payload)) {
          return { success: false, error: 'Invalid payload for DELETE_PASSWORD' };
        }
        return await handleDeletePassword(message.payload as { id: string });

      case 'SHOW_PASSWORD_DIALOG_FOR_TAB':
        // Popupからの要求でダイアログを表示
        if (!isStringRecord(message.payload) || !('tabId' in message.payload)) {
          return { success: false, error: 'Invalid payload for SHOW_PASSWORD_DIALOG_FOR_TAB' };
        }
        return await handleShowPasswordDialogForTab(message.payload as { tabId: number });

      case 'LOCK_SESSION':
        return handleLockSession();

      case 'GET_SESSION_STATUS':
        return handleGetSessionStatus();

      case 'TAKE_SCREENSHOT':
        return await handleTakeScreenshot();

      case 'GET_SETTINGS':
        return await handleGetSettings();

      case 'UPDATE_SETTINGS':
        if (!isAppSettings(message.payload)) {
          return { success: false, error: 'Invalid payload for UPDATE_SETTINGS' };
        }
        return await handleUpdateSettings(message.payload as Partial<Record<string, unknown>>);

      case 'OPEN_OPTIONS_WITH_FORM_DATA':
        return handleOpenOptionsWithFormData();

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
    const settings = await storage.getSettings();

    const { key, credentialId } = await authenticate();

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
    // 復号化エラーの場合、詳細情報を提供
    if (error instanceof Error && error.name === 'OperationError') {
      return {
        success: false,
        error: 'Decryption failed. The encryption key may have changed. Please reset the extension data from settings.'
      };
    }

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
 * タブにパスワードダイアログを表示
 */
async function handleShowPasswordDialogForTab(payload: { tabId: number }): Promise<Response> {
  if (!isSessionValid(currentSession)) {
    console.error('[bg-ss] Session is not valid');
    return { success: false, error: 'Session expired' };
  }
  
  try {
    const passwordsResponse = await handleGetPasswords();
    if (!passwordsResponse.success) {
      return passwordsResponse;
    }
    const passwords = (passwordsResponse.data as PasswordEntry[]) || [];

    await chrome.tabs.sendMessage(payload.tabId, {
      type: 'SHOW_PASSWORD_DIALOG',
      payload: {
        candidates: passwords,
        tabId: payload.tabId
      }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to show password dialog'
    };
  }
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
 * スクリーンショット撮影（ウィンドウのコンテンツ部分）
 */
async function handleTakeScreenshot(): Promise<Response> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.windowId) {
      return { success: false, error: 'No active tab found' };
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });

    const settings = await storage.getSettings();

    if (settings.screenshotCopyToClipboard) {
      await copyToClipboard(dataUrl);
    }

    if (settings.screenshotDownloadImage) {
      const filename = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

      await chrome.downloads.download({
        url: dataUrl,
        filename,
        saveAs: false
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take screenshot'
    };
  }
}

async function copyToClipboard(dataUrl: string): Promise<void> {
  let offscreenUrl = chrome.runtime.getURL('src/offscreen/index.html');

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['CLIPBOARD'],
      justification: 'Copy screenshot to clipboard'
    });
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'COPY_IMAGE_TO_CLIPBOARD', payload: { dataUrl } },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to copy to clipboard'));
        }
      }
    );
  });
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

/**
 * フォームデータ保存後にオプションページを開く
 */
function handleOpenOptionsWithFormData(): Response {
  try {
    chrome.runtime.openOptionsPage();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open options page'
    };
  }
}

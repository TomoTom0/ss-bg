import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { handleMessage, createSession, getCurrentSession, lockSession, getSessionStatus } from './background';
import type { Message } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import type { EncryptedData } from '@/types/crypto';
import * as cryptoUtils from '@/utils/crypto';
import * as webauthn from '@/utils/webauthn';

// crypto関数のモック
vi.mock('@/utils/crypto', () => ({
  encrypt: vi.fn(async (data: string) => ({
    iv: 'mocked-iv',
    data: btoa(data), // 単純にbase64エンコード
    algorithm: 'AES-GCM' as const,
    version: 1 as const
  })),
  decrypt: vi.fn(async (encrypted: EncryptedData) => {
    return atob(encrypted.data); // base64デコード
  })
}));

// webauthn関数のモック（一部）
vi.mock('@/utils/webauthn', async () => {
  const actual = await vi.importActual<typeof import('@/utils/webauthn')>('@/utils/webauthn');
  return {
    ...actual,
    authenticate: vi.fn()
  };
});

// モック
const mockStorage: Record<string, any> = {};
const mockEncryptionKey = {} as CryptoKey;

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        return Promise.resolve(
          typeof keys === 'string'
            ? { [keys]: mockStorage[keys] }
            : keys === null
            ? { ...mockStorage }
            : keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
        );
      }),
      set: vi.fn((items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      })
    }
  },
  tabs: {
    captureVisibleTab: vi.fn(),
    query: vi.fn()
  },
  downloads: {
    download: vi.fn()
  },
  action: {
    openPopup: vi.fn()
  }
} as any;

global.navigator = {
  credentials: {
    create: vi.fn(),
    get: vi.fn()
  }
} as any;

describe('background service worker', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    lockSession(); // セッションをクリア
  });

  describe('セッション管理', () => {
    it('createSessionでセッションを作成できる', () => {
      const credentialId = new ArrayBuffer(8);
      const timeout = 30;
      
      createSession(mockEncryptionKey, credentialId, timeout);
      
      const session = getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.encryptionKey).toBe(mockEncryptionKey);
      expect(session?.isLocked).toBe(false);
    });

    it('lockSessionでセッションをクリアできる', () => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
      expect(getCurrentSession()).not.toBeNull();
      
      lockSession();
      
      expect(getCurrentSession()).toBeNull();
    });

    it('getSessionStatusでセッション状態を取得できる', () => {
      const status1 = getSessionStatus();
      expect(status1.isAuthenticated).toBe(false);
      
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
      
      const status2 = getSessionStatus();
      expect(status2.isAuthenticated).toBe(true);
      expect(status2.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('AUTHENTICATE メッセージ', () => {
    it('認証成功時にセッションを作成する', async () => {
      const mockKey = await globalThis.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      (webauthn.authenticate as Mock).mockResolvedValue({
        key: mockKey,
        credentialId: new Uint8Array([1, 2, 3, 4]).buffer
      });
      
      mockStorage.credentialId = 'dGVzdA=='; // base64
      
      const message: Message = { type: 'AUTHENTICATE' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(getCurrentSession()).not.toBeNull();
    });

    it('認証失敗時にエラーを返す', async () => {
      (webauthn.authenticate as Mock).mockRejectedValue(new Error('Auth failed'));
      mockStorage.credentialId = 'dGVzdA==';
      
      const message: Message = { type: 'AUTHENTICATE' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('GET_PASSWORDS メッセージ', () => {
    beforeEach(() => {
      // 有効なセッションを作成
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
    });

    it('セッション有効時にパスワードを取得できる', async () => {
      const passwords: PasswordEntry[] = [
        {
          id: '1',
          title: 'Test',
          urls: ['https://example.com'],
          username: 'user',
          password: 'pass',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      
      // モック化されたencryptを使用して保存
      const passwordsJson = JSON.stringify(passwords);
      const encrypted = await (cryptoUtils.encrypt as Mock)(passwordsJson, mockEncryptionKey);
      mockStorage.encryptedPasswords = JSON.stringify(encrypted);
      
      const message: Message = { type: 'GET_PASSWORDS' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect((response.data as PasswordEntry[]).length).toBe(1);
      expect((response.data as PasswordEntry[])[0].title).toBe('Test');
    });

    it('セッション無効時にエラーを返す', async () => {
      lockSession();
      
      const message: Message = { type: 'GET_PASSWORDS' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Session expired');
    });

    it('暗号化データが未設定の場合は空配列を返す', async () => {
      const message: Message = { type: 'GET_PASSWORDS' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('SAVE_PASSWORD メッセージ', () => {
    beforeEach(() => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
    });

    it('パスワードを保存できる', async () => {
      const entry: PasswordEntry = {
        id: '1',
        title: 'Test',
        urls: ['https://example.com'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const message: Message = { type: 'SAVE_PASSWORD', payload: entry };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(cryptoUtils.encrypt).toHaveBeenCalled();
    });

    it('セッション無効時にエラーを返す', async () => {
      lockSession();
      
      const entry: PasswordEntry = {
        id: '1',
        title: 'Test',
        urls: ['https://example.com'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const message: Message = { type: 'SAVE_PASSWORD', payload: entry };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Session expired');
    });
  });

  describe('LOCK_SESSION メッセージ', () => {
    it('セッションをロックできる', async () => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
      expect(getCurrentSession()).not.toBeNull();
      
      const message: Message = { type: 'LOCK_SESSION' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(getCurrentSession()).toBeNull();
    });
  });

  describe('GET_SESSION_STATUS メッセージ', () => {
    it('セッションステータスを取得できる', async () => {
      const message: Message = { type: 'GET_SESSION_STATUS' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('isAuthenticated');
    });

    it('認証済みの場合は有効期限も返す', async () => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
      
      const message: Message = { type: 'GET_SESSION_STATUS' };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('expiresAt');
      expect((response.data as any).isAuthenticated).toBe(true);
    });
  });

  describe('AUTOFILL_REQUEST メッセージ', () => {
    beforeEach(() => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
    });

    it('URLマッチングでパスワード候補を返す', async () => {
      const passwords: PasswordEntry[] = [
        {
          id: '1',
          title: 'GitHub',
          urls: ['https://github.com/login'],
          username: 'user',
          password: 'pass',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      
      const passwordsJson = JSON.stringify(passwords);
      const encrypted = await (cryptoUtils.encrypt as Mock)(passwordsJson, mockEncryptionKey);
      mockStorage.encryptedPasswords = JSON.stringify(encrypted);
      
      const message: Message = {
        type: 'AUTOFILL_REQUEST',
        payload: { url: 'https://github.com/login' }
      };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      // URLマッチング結果の優先度チェック
      const matches = response.data as any[];
      expect(matches[0].priority).toBe(2); // 完全一致
    });

    it('セッション無効時はエラーを返す', async () => {
      lockSession();
      
      const message: Message = {
        type: 'AUTOFILL_REQUEST',
        payload: { url: 'https://example.com' }
      };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
    });
  });

  describe('TAKE_SCREENSHOT メッセージ', () => {
    it('スクリーンショットを撮影できる', async () => {
      vi.mocked(chrome.tabs.query).mockResolvedValue([
        { id: 1, windowId: 1 }
      ] as any);
      vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValue('data:image/png;base64,test');
      vi.mocked(chrome.downloads.download).mockResolvedValue(1);
      
      const message: Message = {
        type: 'TAKE_SCREENSHOT',
        payload: { crop: false }
      };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(true);
      expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
      expect(chrome.downloads.download).toHaveBeenCalled();
    });

    it('タブ取得失敗時はエラーを返す', async () => {
      vi.mocked(chrome.tabs.query).mockRejectedValue(new Error('No tab'));
      
      const message: Message = {
        type: 'TAKE_SCREENSHOT',
        payload: { crop: false }
      };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('不明なメッセージタイプ', () => {
    it('エラーを返す', async () => {
      const message: Message = { type: 'UNKNOWN_TYPE' as any };
      const response = await handleMessage(message);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown message type');
    });
  });
});

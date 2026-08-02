import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import type { Message } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import type { EncryptedData } from '@/types/crypto';

// crypto関数のモック
vi.mock('@/utils/crypto', () => ({
  encrypt: vi.fn(async (data: string) => ({
    iv: 'mocked-iv',
    data: btoa(data),
    algorithm: 'AES-GCM' as const,
    version: 1 as const
  })),
  decrypt: vi.fn(async (encrypted: EncryptedData) => {
    return atob(encrypted.data);
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

// モジュールをインポート
import { handleMessage, createSession, getCurrentSession, lockSession, getSessionStatus } from './background';
import * as cryptoUtils from '@/utils/crypto';
import * as webauthn from '@/utils/webauthn';

const mockEncryptionKey = {} as CryptoKey;

describe('background service worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lockSession();

    // crypto.subtle.exportKey/importKey をモック（createSession 内で使用される）
    // webauthn テストでの本物 exportKey 使用に影響しないよう、ここで局所的にモック
    vi.spyOn(crypto.subtle, 'exportKey').mockResolvedValue({
      kty: 'oct',
      k: 'mock-key',
      alg: 'A256GCM',
      ext: true
    } as JsonWebKey);
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockEncryptionKey);

    // デフォルトでcredentialIdを返すようにモック
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      credentialId: 'dGVzdA==',
      sessionTimeout: 30,
      screenshotCopyToClipboard: false,
      screenshotDownloadImage: false
    });
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
      expect(status1.authenticated).toBe(false);

      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);

      const status2 = getSessionStatus();
      expect(status2.authenticated).toBe(true);
      expect(status2.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('AUTHENTICATE メッセージ', () => {
    it('認証失敗時にエラーを返す', async () => {
      (webauthn.authenticate as Mock).mockRejectedValue(new Error('Auth failed'));
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        credentialId: 'dGVzdA=='
      });

      const message: Message = { type: 'AUTHENTICATE' };
      const response = await handleMessage(message);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('GET_PASSWORDS メッセージ', () => {
    beforeEach(() => {
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

      const passwordsJson = JSON.stringify(passwords);
      const encrypted = await (cryptoUtils.encrypt as Mock)(passwordsJson, mockEncryptionKey);

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        encryptedPasswords: JSON.stringify(encrypted)
      });

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
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

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

  describe('UPDATE_PASSWORD メッセージ', () => {
    // 既存の暗号化パスワード配列をstorageに設定するヘルパー
    const setStoredPasswords = async (passwords: PasswordEntry[]): Promise<void> => {
      const encrypted = await (cryptoUtils.encrypt as Mock)(
        JSON.stringify(passwords),
        mockEncryptionKey
      );
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        encryptedPasswords: JSON.stringify(encrypted)
      });
    };

    beforeEach(() => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);
    });

    it('既存エントリを上書き更新できる（重複追加されない）', async () => {
      const existing: PasswordEntry = {
        id: '1',
        title: 'Test',
        urls: ['https://example.com'],
        username: 'user',
        password: 'old-pass',
        createdAt: 1000,
        updatedAt: 1000
      };
      await setStoredPasswords([existing]);

      const updated: PasswordEntry = { ...existing, password: 'new-pass', updatedAt: 2000 };
      const message: Message = { type: 'UPDATE_PASSWORD', payload: { id: '1', entry: updated } };
      const response = await handleMessage(message);

      expect(response.success).toBe(true);

      // encryptに渡された配列を検証: 重複追加(2件)ではなく1件の上書きであること
      const calls = (cryptoUtils.encrypt as Mock).mock.calls;
      const savedJson = calls[calls.length - 1][0] as string;
      const saved = JSON.parse(savedJson) as PasswordEntry[];
      expect(saved.length).toBe(1);
      expect(saved[0].id).toBe('1');
      expect(saved[0].password).toBe('new-pass');
    });

    it('存在しないidの場合はエラーを返す', async () => {
      await setStoredPasswords([
        {
          id: '1',
          title: 'Test',
          urls: ['https://example.com'],
          username: 'user',
          password: 'pass',
          createdAt: 1000,
          updatedAt: 1000
        }
      ]);

      const updated: PasswordEntry = {
        id: '999',
        title: 'Test',
        urls: ['https://example.com'],
        username: 'user',
        password: 'pass',
        createdAt: 1000,
        updatedAt: 2000
      };
      const message: Message = { type: 'UPDATE_PASSWORD', payload: { id: '999', entry: updated } };
      const response = await handleMessage(message);

      expect(response.success).toBe(false);
      expect(response.error).toContain('not found');
    });

    it('セッション無効時にエラーを返す', async () => {
      lockSession();

      const updated = {} as PasswordEntry;
      const message: Message = { type: 'UPDATE_PASSWORD', payload: { id: '1', entry: updated } };
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
      expect(response.data).toHaveProperty('authenticated');
    });

    it('認証済みの場合は有効期限も返す', async () => {
      createSession(mockEncryptionKey, new ArrayBuffer(8), 30);

      const message: Message = { type: 'GET_SESSION_STATUS' };
      const response = await handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('expiresAt');
      expect((response.data as any).authenticated).toBe(true);
    });
  });

  describe('TAKE_SCREENSHOT メッセージ', () => {
    it('タブ取得失敗時はエラーを返す', async () => {
      vi.mocked(chrome.tabs.query).mockRejectedValue(new Error('No tab'));

      const message: Message = { type: 'TAKE_SCREENSHOT' };
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

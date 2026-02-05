import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from './storage';
import type { AppSettings } from '@/types/storage';
import type { EncryptedData } from '@/types/crypto';

// chrome.storage.local のモック
const mockStorage: Record<string, any> = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | null) => {
        return Promise.resolve(
          typeof keys === 'string'
            ? { [keys]: mockStorage[keys] }
            : keys === null
            ? { ...mockStorage }
            : keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
        );
      }),
      set: vi.fn((items: Record<string, any>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      })
    }
  }
} as any;

describe('storage utilities', () => {
  beforeEach(() => {
    // 各テスト前にストレージをクリア
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getCredentialId / saveCredentialId', () => {
    it('credentialIdを保存して取得できる', async () => {
      const credentialId = 'test-credential-id-base64';
      
      await storage.saveCredentialId(credentialId);
      const retrieved = await storage.getCredentialId();
      
      expect(retrieved).toBe(credentialId);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        credentialId
      });
    });

    it('credentialIdが未設定の場合はundefinedを返す', async () => {
      const retrieved = await storage.getCredentialId();
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSettings / saveSettings', () => {
    it('設定を保存して取得できる', async () => {
      const settings: AppSettings = {
        sessionTimeout: 45,
        screenshotCopyToClipboard: false,
        screenshotDownloadImage: false
      };

      await storage.saveSettings(settings);
      const retrieved = await storage.getSettings();

      // マージされた設定を確認（デフォルト値も含まれる）
      expect(retrieved).toMatchObject({
        sessionTimeout: 45,
        screenshotCopyToClipboard: false,
        screenshotDownloadImage: false
      });
    });

    it('設定が未設定の場合はデフォルト値を返す', async () => {
      const retrieved = await storage.getSettings();

      expect(retrieved).toEqual({
        sessionTimeout: 30,
        prfEnabled: false,
        screenshotCopyToClipboard: true,
        screenshotDownloadImage: true
      });
    });

    it('部分的な設定を保存した場合、デフォルト値とマージされる', async () => {
      await storage.saveSettings({ sessionTimeout: 60 } as any);
      const retrieved = await storage.getSettings();

      expect(retrieved).toEqual({
        sessionTimeout: 60,
        prfEnabled: false,
        screenshotCopyToClipboard: true,
        screenshotDownloadImage: true
      });
    });
  });

  describe('getEncryptedPasswords / saveEncryptedPasswords', () => {
    it('暗号化されたパスワードデータを保存して取得できる', async () => {
      const encryptedData: EncryptedData = {
        iv: 'test-iv',
        data: 'test-encrypted-data',
        algorithm: 'AES-GCM',
        version: 1
      };
      
      await storage.saveEncryptedPasswords(encryptedData);
      const retrieved = await storage.getEncryptedPasswords();
      
      expect(retrieved).toEqual(encryptedData);
    });

    it('暗号化データが未設定の場合はundefinedを返す', async () => {
      const retrieved = await storage.getEncryptedPasswords();
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSetupStatus / markSetupComplete', () => {
    it('セットアップ完了フラグを設定して取得できる', async () => {
      expect(await storage.getSetupStatus()).toBe(false);
      
      await storage.markSetupComplete();
      
      expect(await storage.getSetupStatus()).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('全てのデータをクリアできる', async () => {
      await storage.saveCredentialId('test-id');
      await storage.saveSettings({ sessionTimeout: 60 } as any);
      await storage.markSetupComplete();

      await storage.clearAll();

      expect(await storage.getCredentialId()).toBeUndefined();
      expect(await storage.getSettings()).toEqual({
        sessionTimeout: 30,
        prfEnabled: false,
        screenshotCopyToClipboard: true,
        screenshotDownloadImage: true
      });
      expect(await storage.getSetupStatus()).toBe(false);
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('storage.local.getがエラーを投げた場合、エラーを伝播する', async () => {
      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(storage.getCredentialId()).rejects.toThrow('Storage error');
    });

    it('storage.local.setがエラーを投げた場合、エラーを伝播する', async () => {
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(storage.saveCredentialId('test')).rejects.toThrow('Storage error');
    });
  });

  describe('integration scenarios', () => {
    it('完全なセットアップフローをシミュレート', async () => {
      // 初期状態
      expect(await storage.getSetupStatus()).toBe(false);
      expect(await storage.getCredentialId()).toBeUndefined();

      // セットアップ
      await storage.saveCredentialId('credential-abc123');
      await storage.saveSettings({ sessionTimeout: 60 } as any);

      // パスワード保存
      const encryptedData: EncryptedData = {
        iv: 'iv-123',
        data: 'encrypted-passwords',
        algorithm: 'AES-GCM',
        version: 1
      };
      await storage.saveEncryptedPasswords(encryptedData);

      // セットアップ完了
      await storage.markSetupComplete();

      // 検証
      expect(await storage.getSetupStatus()).toBe(true);
      expect(await storage.getCredentialId()).toBe('credential-abc123');
      expect(await storage.getSettings()).toEqual({
        sessionTimeout: 60,
        prfEnabled: false,
        screenshotCopyToClipboard: true,
        screenshotDownloadImage: true
      });
      expect(await storage.getEncryptedPasswords()).toEqual(encryptedData);
    });

    it('設定を複数回更新できる', async () => {
      await storage.saveSettings({ sessionTimeout: 30 } as any);
      expect((await storage.getSettings()).sessionTimeout).toBe(30);

      await storage.saveSettings({ sessionTimeout: 60 } as any);
      expect((await storage.getSettings()).sessionTimeout).toBe(60);
    });
  });
});

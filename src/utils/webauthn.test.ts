import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerCredential, authenticate, isSessionValid, deriveEncryptionKey } from './webauthn';
import type { Session } from '@/types/session';
import { storage } from './storage';

// Chrome Storage APIのモック
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

// WebAuthn APIのモック
const mockCredentialId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
const mockPrfOutput = new Uint8Array(32).fill(42).buffer; // 32バイトのテストデータ

const createMockCredential = (prfEnabled: boolean = true): PublicKeyCredential => {
  return {
    id: 'mock-credential-id',
    rawId: mockCredentialId,
    type: 'public-key',
    response: {
      clientDataJSON: new ArrayBuffer(0),
      attestationObject: new ArrayBuffer(0)
    } as AuthenticatorAttestationResponse,
    getClientExtensionResults: () => ({
      prf: prfEnabled ? { enabled: true } : undefined
    }),
    authenticatorAttachment: 'platform'
  } as PublicKeyCredential;
};

const createMockAssertion = (): PublicKeyCredential => {
  return {
    id: 'mock-assertion-id',
    rawId: mockCredentialId,
    type: 'public-key',
    response: {
      clientDataJSON: new ArrayBuffer(0),
      authenticatorData: new ArrayBuffer(0),
      signature: new ArrayBuffer(0),
      userHandle: new ArrayBuffer(0)
    } as AuthenticatorAssertionResponse,
    getClientExtensionResults: () => ({
      prf: {
        results: {
          first: mockPrfOutput
        }
      }
    }),
    authenticatorAttachment: 'platform'
  } as PublicKeyCredential;
};

describe('webauthn utilities', () => {
  beforeEach(() => {
    // Storageをクリア
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    
    // navigator.credentials のモック
    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: vi.fn()
      }
    } as any;
  });

  describe('registerCredential', () => {
    it('WebAuthn credentialを登録できる', async () => {
      const mockCredential = createMockCredential(true);
      vi.mocked(navigator.credentials.create).mockResolvedValue(mockCredential);
      
      const credential = await registerCredential();
      
      expect(credential).toBeDefined();
      expect(credential.type).toBe('public-key');
      expect(navigator.credentials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            rp: expect.objectContaining({
              name: expect.any(String)
            }),
            user: expect.any(Object),
            pubKeyCredParams: expect.any(Array),
            authenticatorSelection: expect.objectContaining({
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            }),
            extensions: expect.objectContaining({
              prf: {}
            })
          })
        })
      );
    });

    it('PRF拡張が有効化されたcredentialを作成する', async () => {
      const mockCredential = createMockCredential(true);
      vi.mocked(navigator.credentials.create).mockResolvedValue(mockCredential);
      
      const credential = await registerCredential();
      const extensions = credential.getClientExtensionResults();
      
      expect(extensions.prf?.enabled).toBe(true);
    });

    it('PRF非対応の場合はエラーを投げる', async () => {
      const mockCredential = createMockCredential(false);
      vi.mocked(navigator.credentials.create).mockResolvedValue(mockCredential);
      
      await expect(registerCredential()).rejects.toThrow('PRF extension is not supported');
    });

    it('credentialIdをstorageに保存する', async () => {
      const mockCredential = createMockCredential(true);
      vi.mocked(navigator.credentials.create).mockResolvedValue(mockCredential);
      
      const saveSpy = vi.spyOn(storage, 'saveCredentialId');
      
      await registerCredential();
      
      expect(saveSpy).toHaveBeenCalledWith(expect.any(String));
    });

    it('ユーザーがキャンセルした場合はエラーを投げる', async () => {
      vi.mocked(navigator.credentials.create).mockResolvedValue(null);
      
      await expect(registerCredential()).rejects.toThrow();
    });

    it('WebAuthn APIエラーを伝播する', async () => {
      const error = new Error('WebAuthn error');
      vi.mocked(navigator.credentials.create).mockRejectedValue(error);
      
      await expect(registerCredential()).rejects.toThrow('WebAuthn error');
    });
  });

  describe('authenticate', () => {
    beforeEach(async () => {
      // credentialIdを事前に保存
      await storage.saveCredentialId('dGVzdC1jcmVkZW50aWFsLWlk'); // "test-credential-id" in base64
    });

    it('認証して暗号化鍵を導出できる', async () => {
      const mockAssertion = createMockAssertion();
      vi.mocked(navigator.credentials.get).mockResolvedValue(mockAssertion);
      
      const result = await authenticate();
      
      expect(result.key).toBeInstanceOf(CryptoKey);
      expect(result.credentialId).toBeInstanceOf(ArrayBuffer);
    });

    it('PRF出力から鍵を導出する', async () => {
      const mockAssertion = createMockAssertion();
      vi.mocked(navigator.credentials.get).mockResolvedValue(mockAssertion);
      
      const result = await authenticate();
      
      // 鍵が正しく導出されているか（型チェック）
      expect(result.key.algorithm).toEqual(
        expect.objectContaining({
          name: 'AES-GCM',
          length: 256
        })
      );
    });

    it('credentialIdが未設定の場合はエラーを投げる', async () => {
      await storage.clearAll();
      
      await expect(authenticate()).rejects.toThrow('No credential found');
    });

    it('PRF結果が取得できない場合はエラーを投げる', async () => {
      const mockAssertion = {
        ...createMockAssertion(),
        getClientExtensionResults: () => ({ prf: undefined })
      } as PublicKeyCredential;
      
      vi.mocked(navigator.credentials.get).mockResolvedValue(mockAssertion);
      
      await expect(authenticate()).rejects.toThrow('PRF evaluation failed');
    });

    it('ユーザーがキャンセルした場合はエラーを投げる', async () => {
      vi.mocked(navigator.credentials.get).mockResolvedValue(null);
      
      await expect(authenticate()).rejects.toThrow();
    });

    it('同じcredentialで認証すると同じ鍵が導出される', async () => {
      const mockAssertion = createMockAssertion();
      vi.mocked(navigator.credentials.get).mockResolvedValue(mockAssertion);
      
      const result1 = await authenticate();
      const result2 = await authenticate();
      
      // 鍵の内容が同じことを確認（エクスポートして比較）
      const exported1 = await crypto.subtle.exportKey('raw', result1.key);
      const exported2 = await crypto.subtle.exportKey('raw', result2.key);
      
      expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
    });
  });

  describe('deriveEncryptionKey', () => {
    it('PRF出力からAES-GCM鍵を導出する', async () => {
      const prfOutput = new Uint8Array(32).fill(123);
      
      const key = await deriveEncryptionKey(prfOutput);
      
      expect(key.type).toBe('secret');
      expect(key.algorithm).toEqual({
        name: 'AES-GCM',
        length: 256
      });
    });

    it('同じPRF出力から同じ鍵を導出する', async () => {
      const prfOutput = new Uint8Array(32).fill(99);
      
      const key1 = await deriveEncryptionKey(prfOutput);
      const key2 = await deriveEncryptionKey(prfOutput);
      
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);
      
      expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
    });

    it('異なるPRF出力から異なる鍵を導出する', async () => {
      const prfOutput1 = new Uint8Array(32).fill(1);
      const prfOutput2 = new Uint8Array(32).fill(2);
      
      const key1 = await deriveEncryptionKey(prfOutput1);
      const key2 = await deriveEncryptionKey(prfOutput2);
      
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);
      
      expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2));
    });
  });

  describe('isSessionValid', () => {
    it('有効なセッションに対してtrueを返す', () => {
      const session: Session = {
        encryptionKey: {} as CryptoKey,
        credentialId: new ArrayBuffer(0),
        expiresAt: Date.now() + 10000,
        isLocked: false
      };
      
      expect(isSessionValid(session)).toBe(true);
    });

    it('nullセッションに対してfalseを返す', () => {
      expect(isSessionValid(null)).toBe(false);
    });

    it('ロックされたセッションに対してfalseを返す', () => {
      const session: Session = {
        encryptionKey: {} as CryptoKey,
        credentialId: new ArrayBuffer(0),
        expiresAt: Date.now() + 10000,
        isLocked: true
      };
      
      expect(isSessionValid(session)).toBe(false);
    });

    it('期限切れのセッションに対してfalseを返す', () => {
      const session: Session = {
        encryptionKey: {} as CryptoKey,
        credentialId: new ArrayBuffer(0),
        expiresAt: Date.now() - 1000,
        isLocked: false
      };
      
      expect(isSessionValid(session)).toBe(false);
    });

    it('境界値: ちょうど期限切れの場合はfalse', () => {
      const now = Date.now();
      const session: Session = {
        encryptionKey: {} as CryptoKey,
        credentialId: new ArrayBuffer(0),
        expiresAt: now,
        isLocked: false
      };
      
      // 時間が進んでいる可能性があるため、少し待つ
      vi.useFakeTimers();
      vi.setSystemTime(now + 1);
      
      expect(isSessionValid(session)).toBe(false);
      
      vi.useRealTimers();
    });
  });
});

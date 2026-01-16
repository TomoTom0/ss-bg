import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from './crypto';
import type { EncryptedData } from '@/types/crypto';

describe('crypto utilities', () => {
  let testKey: CryptoKey;

  beforeAll(async () => {
    // テスト用のAES-GCM鍵を生成
    testKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  });

  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('ArrayBufferをBase64文字列に変換できる', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      const base64 = arrayBufferToBase64(buffer);
      
      expect(base64).toBe('SGVsbG8=');
    });

    it('Base64文字列をArrayBufferに変換できる', () => {
      const base64 = 'SGVsbG8='; // "Hello"
      const buffer = base64ToArrayBuffer(base64);
      const uint8 = new Uint8Array(buffer);
      
      expect(uint8[0]).toBe(72);  // H
      expect(uint8[1]).toBe(101); // e
      expect(uint8[2]).toBe(108); // l
      expect(uint8[3]).toBe(108); // l
      expect(uint8[4]).toBe(111); // o
    });

    it('変換が可逆的である', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).buffer;
      const base64 = arrayBufferToBase64(original);
      const restored = base64ToArrayBuffer(base64);
      
      expect(new Uint8Array(restored)).toEqual(new Uint8Array(original));
    });
  });

  describe('encrypt', () => {
    it('文字列を暗号化してEncryptedDataを返す', async () => {
      const plaintext = 'Hello, World!';
      
      const encrypted = await encrypt(plaintext, testKey);
      
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('data');
      expect(encrypted.algorithm).toBe('AES-GCM');
      expect(encrypted.version).toBe(1);
      
      // Base64文字列であることを確認
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.data).toBe('string');
      expect(encrypted.iv.length).toBeGreaterThan(0);
      expect(encrypted.data.length).toBeGreaterThan(0);
    });

    it('同じ平文でも異なるIVにより異なる暗号文を生成する', async () => {
      const plaintext = 'Test message';
      
      const encrypted1 = await encrypt(plaintext, testKey);
      const encrypted2 = await encrypt(plaintext, testKey);
      
      // IVが異なる
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      // 暗号文も異なる
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('日本語を含む文字列を暗号化できる', async () => {
      const plaintext = 'こんにちは、世界！';
      
      const encrypted = await encrypt(plaintext, testKey);
      
      expect(encrypted.algorithm).toBe('AES-GCM');
      expect(encrypted.data.length).toBeGreaterThan(0);
    });

    it('空文字列を暗号化できる', async () => {
      const plaintext = '';
      
      const encrypted = await encrypt(plaintext, testKey);
      
      expect(encrypted.algorithm).toBe('AES-GCM');
      expect(encrypted.data.length).toBeGreaterThan(0);
    });
  });

  describe('decrypt', () => {
    it('暗号化されたデータを復号化できる', async () => {
      const plaintext = 'Secret message';
      
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('日本語を含むデータを復号化できる', async () => {
      const plaintext = 'パスワード: テスト123';
      
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('長いテキストを復号化できる', async () => {
      const plaintext = 'a'.repeat(10000);
      
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('空文字列を復号化できる', async () => {
      const plaintext = '';
      
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      
      expect(decrypted).toBe('');
    });

    it('間違った鍵で復号化するとエラーを投げる', async () => {
      const plaintext = 'Secret';
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      const encrypted = await encrypt(plaintext, testKey);
      
      await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
    });

    it('サポートされていないアルゴリズムでエラーを投げる', async () => {
      const invalidData: EncryptedData = {
        iv: 'AAAA',
        data: 'BBBB',
        algorithm: 'INVALID' as any,
        version: 1
      };
      
      await expect(decrypt(invalidData, testKey)).rejects.toThrow('Unsupported algorithm');
    });

    it('サポートされていないバージョンでエラーを投げる', async () => {
      const invalidData: EncryptedData = {
        iv: 'AAAA',
        data: 'BBBB',
        algorithm: 'AES-GCM',
        version: 999 as any
      };
      
      await expect(decrypt(invalidData, testKey)).rejects.toThrow('Unsupported data version');
    });

    it('不正なBase64でエラーを投げる', async () => {
      const invalidData: EncryptedData = {
        iv: 'invalid!!!',
        data: 'invalid!!!',
        algorithm: 'AES-GCM',
        version: 1
      };
      
      await expect(decrypt(invalidData, testKey)).rejects.toThrow();
    });
  });

  describe('encrypt & decrypt integration', () => {
    it('JSONオブジェクトを文字列化して暗号化・復号化できる', async () => {
      const obj = {
        username: 'user@example.com',
        password: 'secret123',
        notes: 'テストメモ'
      };
      
      const plaintext = JSON.stringify(obj);
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      const restored = JSON.parse(decrypted);
      
      expect(restored).toEqual(obj);
    });

    it('配列を暗号化・復号化できる', async () => {
      const array = ['item1', 'item2', 'アイテム3'];
      
      const plaintext = JSON.stringify(array);
      const encrypted = await encrypt(plaintext, testKey);
      const decrypted = await decrypt(encrypted, testKey);
      const restored = JSON.parse(decrypted);
      
      expect(restored).toEqual(array);
    });
  });
});

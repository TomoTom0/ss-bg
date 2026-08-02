import type { AppSettings, FavoriteAction } from '@/types/storage';
import type { EncryptedData } from '@/types/crypto';

/**
 * デフォルト設定
 */
const DEFAULT_SETTINGS: AppSettings = {
  sessionTimeout: 30,
  prfEnabled: false,
  screenshotCopyToClipboard: true,
  screenshotDownloadImage: true,
  theme: 'auto'
};

/**
 * Storage ラッパー
 */
class StorageWrapper {
  /**
   * Credential IDを取得
   */
  async getCredentialId(): Promise<string | undefined> {
    const result = await chrome.storage.local.get('credentialId') as { credentialId?: string };
    return result.credentialId;
  }

  /**
   * Credential IDを保存
   */
  async saveCredentialId(credentialId: string): Promise<void> {
    await chrome.storage.local.set({ credentialId });
  }

  /**
   * アプリケーション設定を取得
   */
  async getSettings(): Promise<AppSettings> {
    const result = await chrome.storage.local.get('settings') as { settings?: Partial<AppSettings> };
    return {
      ...DEFAULT_SETTINGS,
      ...(result.settings || {})
    };
  }

  /**
   * アプリケーション設定を保存
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({
      settings: {
        ...current,
        ...settings
      }
    });
  }

  /**
   * 暗号化されたパスワードデータを取得
   */
  async getEncryptedPasswords(): Promise<EncryptedData | undefined> {
    const result = await chrome.storage.local.get('encryptedPasswords') as { encryptedPasswords?: string };
    if (!result.encryptedPasswords) {
      return undefined;
    }
    return JSON.parse(result.encryptedPasswords);
  }

  /**
   * 暗号化されたパスワードデータを保存
   */
  async saveEncryptedPasswords(encryptedData: EncryptedData): Promise<void> {
    await chrome.storage.local.set({
      encryptedPasswords: JSON.stringify(encryptedData)
    });
  }

  /**
   * セットアップ完了状態を取得
   */
  async getSetupStatus(): Promise<boolean> {
    const result = await chrome.storage.local.get('isSetupComplete') as { isSetupComplete?: boolean };
    return result.isSetupComplete ?? false;
  }

  /**
   * セットアップ完了をマーク
   */
  async markSetupComplete(): Promise<void> {
    await chrome.storage.local.set({ isSetupComplete: true });
  }

  /**
   * お気に入り動作を全て取得
   */
  async getFavorites(): Promise<FavoriteAction[]> {
    const result = await chrome.storage.local.get('favorites') as { favorites?: FavoriteAction[] };
    return result.favorites || [];
  }

  /**
   * ドメインのお気に入り動作を取得
   */
  async getFavoritesByDomain(domain: string): Promise<FavoriteAction[]> {
    const all = await this.getFavorites();
    return all.filter(f => f.domain === domain);
  }

  /**
   * お気に入り動作を保存（ドメインごとに最大3つ）
   */
  async saveFavorite(favorite: FavoriteAction): Promise<void> {
    const all = await this.getFavorites();
    // 同じドメイン・同じスロットの既存エントリを削除
    const filtered = all.filter(
      f => !(f.domain === favorite.domain && f.slot === favorite.slot)
    );
    filtered.push(favorite);
    await chrome.storage.local.set({ favorites: filtered });
  }

  /**
   * お気に入り動作を削除
   */
  async deleteFavorite(domain: string, slot: 1 | 2 | 3): Promise<void> {
    const all = await this.getFavorites();
    const filtered = all.filter(
      f => !(f.domain === domain && f.slot === slot)
    );
    await chrome.storage.local.set({ favorites: filtered });
  }

  /**
   * 全てのデータをクリア
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }
}

export const storage = new StorageWrapper();

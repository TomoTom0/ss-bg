import type { PasswordEntry } from '@/types/storage';

/**
 * URLマッチ結果
 */
export interface UrlMatchResult {
  entry: PasswordEntry;
  priority: number;        // 2: 完全一致, 1: ドメイン一致, 0: マッチなし
}

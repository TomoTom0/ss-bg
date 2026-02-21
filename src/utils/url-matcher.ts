import type { PasswordEntry } from '@/types/storage';
import type { UrlMatchResult } from '@/types/url-matcher';

/**
 * 現在のURLとエントリのURLリストをマッチング
 * @returns priority: 2=完全一致, 1=ドメイン一致, 0=マッチなし
 */
export function matchUrl(currentUrl: string, entryUrls: string[]): number {
  // 空のURLリスト
  if (entryUrls.length === 0) {
    return 0;
  }

  let currentParsed: URL;
  try {
    currentParsed = new URL(currentUrl);
  } catch {
    // 無効なURL
    return 0;
  }

  // 完全一致チェック (priority 2)
  if (entryUrls.includes(currentUrl)) {
    return 2;
  }

  // ドメイン一致チェック (priority 1)
  // ホスト名（ドメイン+ポート）が一致する必要がある
  for (const url of entryUrls) {
    try {
      const entryParsed = new URL(url);
      if (currentParsed.hostname === entryParsed.hostname &&
          currentParsed.port === entryParsed.port) {
        return 1;
      }
    } catch {
      // 無効なURLはスキップ
      continue;
    }
  }

  // マッチなし (priority 0)
  return 0;
}

/**
 * 現在のURLと全てのパスワードエントリをマッチング
 * @returns 優先度順にソートされたマッチ結果
 */
export function matchUrls(currentUrl: string, entries: PasswordEntry[]): UrlMatchResult[] {
  const results: UrlMatchResult[] = [];

  for (const entry of entries) {
    const priority = matchUrl(currentUrl, entry.urls);
    results.push({ entry, priority });
  }

  // 優先度の降順でソート（同じ優先度の場合は元の順序を保持）
  results.sort((a, b) => b.priority - a.priority);

  return results;
}

/**
 * URLを正規化する
 * - プロトコルを除去
 * - 末尾のスラッシュを除去
 * - 空文字列を除外
 *
 * @param url 正規化するURL
 * @returns 正規化されたURL（無効な場合は空文字列）
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    // URLオブジェクトとして解析
    const parsed = new URL(trimmed);

    // プロトコルを除去し、ホスト名とパスを結合
    let normalized = parsed.hostname + parsed.pathname;

    // ポートがデフォルト以外の場合は追加
    if (parsed.port &&
        !((parsed.protocol === 'http:' && parsed.port === '80') ||
          (parsed.protocol === 'https:' && parsed.port === '443'))) {
      normalized = parsed.hostname + ':' + parsed.port + parsed.pathname;
    }

    // 末尾のスラッシュを除去
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    // URLとして解析できない場合はそのまま返す（空でなければ）
    return trimmed;
  }
}

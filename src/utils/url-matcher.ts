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

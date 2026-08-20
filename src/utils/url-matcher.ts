import type { PasswordEntry } from '@/types/storage';
import type { UrlMatchResult } from '@/types/url-matcher';

/**
 * URL文字列をパースする。
 * オプションページから保存されたURLは normalizeUrl() によりプロトコルなし
 * （例: example.com/login）のため、http/https URLと解釈できない場合は
 * https:// を補って再試行する。
 * ※ new URL('example.com:8080/x') は protocol='example.com:' としてパース成功するため、
 * プロトコルの検証も行う。
 */
function parseUrlOrNull(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed;
    }
  } catch {
    // https:// 補完で再試行
  }
  try {
    const fallback = new URL(`https://${url}`);
    if (fallback.protocol === 'https:') {
      return fallback;
    }
  } catch {
    // どちらも失敗
  }
  return null;
}

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
  // 保存形式は normalizeUrl() によるプロトコルなし形式のため、正規化してから比較する
  const normalizedCurrent = normalizeUrl(currentUrl);
  if (entryUrls.includes(currentUrl) || entryUrls.includes(normalizedCurrent)) {
    return 2;
  }

  // ドメイン一致チェック (priority 1)
  // ホスト名（ドメイン+ポート）が一致する必要がある
  for (const url of entryUrls) {
    const entryParsed = parseUrlOrNull(url);
    if (entryParsed && currentParsed.hostname === entryParsed.hostname &&
        currentParsed.port === entryParsed.port) {
      return 1;
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

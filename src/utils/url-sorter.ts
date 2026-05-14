/**
 * URLマッチング優先度でパスワードエントリをソート
 */

import type { PasswordEntry } from '@/types/storage';

export interface UrlMatchScore {
  entry: PasswordEntry;
  score: number; // 大きいほど優先度が高い
}

/**
 * URLマッチングスコアを計算
 */
export function calculateUrlMatchScore(currentUrl: string, entry: PasswordEntry): number {
  try {
    const current = new URL(currentUrl);
    let maxScore = 0;
    
    for (const entryUrl of entry.urls) {
      try {
        const target = new URL(entryUrl);
        let score = 0;
        
        // 完全一致
        if (current.href === target.href) {
          score = 1000;
        }
        // ホスト名（サブドメイン含む）完全一致
        else if (current.hostname === target.hostname) {
          score = 900;
        }
        // ドメイン一致（サブドメイン除く）
        else {
          const currentDomain = extractDomain(current.hostname);
          const targetDomain = extractDomain(target.hostname);
          
          if (currentDomain === targetDomain) {
            score = 800;
          }
        }
        
        maxScore = Math.max(maxScore, score);
      } catch {
        // URL解析失敗は無視
      }
    }
    
    return maxScore;
  } catch {
    return 0;
  }
}

/**
 * ドメイン部分を抽出（サブドメイン除く）
 * 例: www.example.co.jp -> example.co.jp
 */
function extractDomain(hostname: string): string {
  const parts = hostname.split('.');
  
  // .co.jp, .com.au などの2段TLD
  const twoPartTlds = ['co.jp', 'com.au', 'co.uk', 'gov.uk', 'ac.jp', 'ne.jp'];
  const lastTwo = parts.slice(-2).join('.');
  
  if (twoPartTlds.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  
  // 通常のTLD
  return parts.slice(-2).join('.');
}

/**
 * パスワードエントリをURLマッチング優先度でソート
 */
export function sortEntriesByUrl(currentUrl: string, entries: PasswordEntry[]): PasswordEntry[] {
  const scored: UrlMatchScore[] = entries.map(entry => ({
    entry,
    score: calculateUrlMatchScore(currentUrl, entry)
  }));
  
  // スコアの高い順にソート、同点の場合はタイトルのアルファベット順
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.entry.title.localeCompare(b.entry.title);
  });
  
  return scored.map(s => s.entry);
}

import { describe, it, expect } from 'vitest';
import { calculateUrlMatchScore, sortEntriesByUrl, rankEntriesForDialog, isRecentlyUsed, URL_MATCH_HIGHLIGHT_THRESHOLD } from './url-sorter';
import type { PasswordEntry } from '@/types/storage';

describe('calculateUrlMatchScore', () => {
  it('完全一致の場合、スコアは1000', () => {
    const currentUrl = 'https://example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://example.com/login'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(1000);
  });
  
  it('ホスト名一致の場合、スコアは900', () => {
    const currentUrl = 'https://example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://example.com/different-path'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(900);
  });
  
  it('サブドメイン含むホスト名一致の場合、スコアは900', () => {
    const currentUrl = 'https://www.example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://www.example.com/other'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(900);
  });
  
  it('ドメイン一致（サブドメイン違い）の場合、スコアは800', () => {
    const currentUrl = 'https://www.example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://api.example.com/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(800);
  });
  
  it('www有無の違いでもドメイン一致とみなす', () => {
    const currentUrl = 'https://example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://www.example.com/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(800);
  });
  
  it('2段TLD (.co.jp) のドメイン一致', () => {
    const currentUrl = 'https://www.example.co.jp/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://api.example.co.jp/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(800);
  });
  
  it('2段TLD (.com.au) のドメイン一致', () => {
    const currentUrl = 'https://www.example.com.au/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://shop.example.com.au/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(800);
  });
  
  it('ドメインが異なる場合、スコアは0', () => {
    const currentUrl = 'https://example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Other',
      urls: ['https://other.com/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(0);
  });
  
  it('複数URLがある場合、最大スコアを返す', () => {
    const currentUrl = 'https://example.com/login';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: [
        'https://other.com/',
        'https://example.com/login',
        'https://api.example.com/'
      ],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(1000);
  });
  
  it('無効なURLの場合、スコアは0', () => {
    const currentUrl = 'invalid-url';
    const entry: PasswordEntry = {
      id: '1',
      title: 'Example',
      urls: ['https://example.com/'],
      username: 'user',
      password: 'pass',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    expect(calculateUrlMatchScore(currentUrl, entry)).toBe(0);
  });
});

describe('sortEntriesByUrl', () => {
  it('スコアの高い順にソート', () => {
    const currentUrl = 'https://example.com/login';
    const entries: PasswordEntry[] = [
      {
        id: '1',
        title: 'A - Other',
        urls: ['https://other.com/'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '2',
        title: 'B - Subdomain',
        urls: ['https://api.example.com/'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '3',
        title: 'C - Exact',
        urls: ['https://example.com/login'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '4',
        title: 'D - Hostname',
        urls: ['https://example.com/other'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    const sorted = sortEntriesByUrl(currentUrl, entries);
    
    expect(sorted[0].id).toBe('3'); // 完全一致 (1000)
    expect(sorted[1].id).toBe('4'); // ホスト名一致 (900)
    expect(sorted[2].id).toBe('2'); // ドメイン一致 (800)
    expect(sorted[3].id).toBe('1'); // マッチなし (0)
  });
  
  it('同じスコアの場合、タイトルのアルファベット順', () => {
    const currentUrl = 'https://example.com/login';
    const entries: PasswordEntry[] = [
      {
        id: '1',
        title: 'Z - Last',
        urls: ['https://example.com/login'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '2',
        title: 'A - First',
        urls: ['https://example.com/login'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '3',
        title: 'M - Middle',
        urls: ['https://example.com/login'],
        username: 'user',
        password: 'pass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    const sorted = sortEntriesByUrl(currentUrl, entries);
    
    expect(sorted[0].title).toBe('A - First');
    expect(sorted[1].title).toBe('M - Middle');
    expect(sorted[2].title).toBe('Z - Last');
  });
  
  it('空配列の場合、空配列を返す', () => {
    const currentUrl = 'https://example.com/login';
    const entries: PasswordEntry[] = [];

    const sorted = sortEntriesByUrl(currentUrl, entries);

    expect(sorted).toEqual([]);
  });
});

describe('rankEntriesForDialog', () => {
  const baseEntry = (overrides: Partial<PasswordEntry>): PasswordEntry => ({
    id: overrides.id ?? 'x',
    title: overrides.title ?? 'T',
    urls: overrides.urls ?? ['https://example.com/'],
    username: 'u',
    password: 'p',
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  });

  it('URL一致エントリが先頭、不一致は末尾', () => {
    const entries = [
      baseEntry({ id: 'other', title: 'Other', urls: ['https://other.com/'] }),
      baseEntry({ id: 'match', title: 'Match', urls: ['https://example.com/login'] })
    ];
    const ranked = rankEntriesForDialog('https://example.com/login', entries);
    expect(ranked[0].id).toBe('match');
    expect(ranked[1].id).toBe('other');
  });

  it('同スコア内は lastUsedAt が新しい順', () => {
    const entries = [
      baseEntry({ id: 'old', title: 'Old', lastUsedAt: 1000 }),
      baseEntry({ id: 'new', title: 'New', lastUsedAt: 9000 }),
      baseEntry({ id: 'never', title: 'Never' })
    ];
    const ranked = rankEntriesForDialog('https://example.com/login', entries);
    // 全員ドメイン一致(800) → lastUsedAt順
    expect(ranked[0].id).toBe('new');
    expect(ranked[1].id).toBe('old');
    expect(ranked[2].id).toBe('never');
  });

  it('URLスコアがlastUsedAtより優先（不一致の最近使用より一致を上）', () => {
    const entries = [
      baseEntry({ id: 'recent-nomatch', title: 'RecentNoMatch', urls: ['https://other.com/'], lastUsedAt: 999999 }),
      baseEntry({ id: 'match-old', title: 'MatchOld', urls: ['https://example.com/'] })
    ];
    const ranked = rankEntriesForDialog('https://example.com/login', entries);
    expect(ranked[0].id).toBe('match-old');
    expect(ranked[1].id).toBe('recent-nomatch');
  });

  it('スコア・lastUsedAt同点ならタイトル昇順', () => {
    const entries = [
      baseEntry({ id: 'z', title: 'Zeta' }),
      baseEntry({ id: 'a', title: 'Alpha' })
    ];
    const ranked = rankEntriesForDialog('https://example.com/login', entries);
    expect(ranked[0].id).toBe('a');
    expect(ranked[1].id).toBe('z');
  });
});

describe('isRecentlyUsed', () => {
  it('lastUsedAtがwindow内ならtrue', () => {
    const e: PasswordEntry = { id: '1', title: 'T', urls: [], username: 'u', password: 'p', createdAt: 1, updatedAt: 1, lastUsedAt: 5000 };
    expect(isRecentlyUsed(e, 6000, 5000)).toBe(true);
  });

  it('lastUsedAtがwindow外ならfalse', () => {
    const e: PasswordEntry = { id: '1', title: 'T', urls: [], username: 'u', password: 'p', createdAt: 1, updatedAt: 1, lastUsedAt: 1000 };
    expect(isRecentlyUsed(e, 9999, 5000)).toBe(false);
  });

  it('lastUsedAt未設定はfalse', () => {
    const e: PasswordEntry = { id: '1', title: 'T', urls: [], username: 'u', password: 'p', createdAt: 1, updatedAt: 1 };
    expect(isRecentlyUsed(e, 9999, 5000)).toBe(false);
  });
});

describe('URL_MATCH_HIGHLIGHT_THRESHOLD', () => {
  it('ドメイン一致以上のスコアが閾値に達する', () => {
    expect(URL_MATCH_HIGHLIGHT_THRESHOLD).toBe(800);
  });
});

describe('normalizeUrl保存形式（プロトコルなし）のスコアリング', () => {
  const protocolLessEntry = (id: string, urls: string[]): PasswordEntry => ({
    id,
    title: `Entry ${id}`,
    urls,
    username: 'user',
    password: 'pass',
    createdAt: 1,
    updatedAt: 1
  });

  it('プロトコルなし保存URLとの完全一致はスコア1000', () => {
    const entry = protocolLessEntry('1', ['example.com/login']);
    expect(calculateUrlMatchScore('https://example.com/login', entry)).toBe(1000);
  });

  it('プロトコルなし保存URLとのホスト名一致はスコア900', () => {
    const entry = protocolLessEntry('1', ['www.example.com']);
    expect(calculateUrlMatchScore('https://www.example.com/other', entry)).toBe(900);
  });

  it('プロトコルなし保存URLとのドメイン一致はスコア800', () => {
    const entry = protocolLessEntry('1', ['example.com/login']);
    expect(calculateUrlMatchScore('https://www.example.com/dashboard', entry)).toBe(800);
  });

  it('プロトコルなし保存URLはハイライト閾値を超える', () => {
    const entry = protocolLessEntry('1', ['example.com']);
    const score = calculateUrlMatchScore('https://example.com/anywhere', entry);
    expect(score).toBeGreaterThanOrEqual(URL_MATCH_HIGHLIGHT_THRESHOLD);
  });

  it('rankEntriesForDialogでプロトコルなし保存URLのエントリが先頭にランクされる', () => {
    const entries = [
      protocolLessEntry('other', ['other.com/login']),
      protocolLessEntry('match', ['example.com/login'])
    ];
    const ranked = rankEntriesForDialog('https://www.example.com/dashboard', entries);
    expect(ranked[0].id).toBe('match');
  });
});

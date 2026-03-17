import { describe, it, expect } from 'vitest';
import { calculateUrlMatchScore, sortEntriesByUrl } from './url-sorter';
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

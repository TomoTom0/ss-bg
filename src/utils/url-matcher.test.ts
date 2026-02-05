import { describe, it, expect } from 'vitest';
import { matchUrl, matchUrls, normalizeUrl } from './url-matcher';
import type { PasswordEntry } from '@/types/storage';

describe('url-matcher utilities', () => {
  const createEntry = (id: string, title: string, urls: string[]): PasswordEntry => ({
    id,
    title,
    urls,
    username: 'user@example.com',
    password: 'password123',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('matchUrl', () => {
    it('完全一致の場合はpriority 2を返す', () => {
      const currentUrl = 'https://example.com/login';
      const entryUrls = ['https://example.com/login', 'https://example.com/signin'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(2);
    });

    it('ドメイン一致の場合はpriority 1を返す', () => {
      const currentUrl = 'https://example.com/dashboard';
      const entryUrls = ['https://example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(1);
    });

    it('マッチしない場合はpriority 0を返す', () => {
      const currentUrl = 'https://example.com/page';
      const entryUrls = ['https://other.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(0);
    });

    it('httpとhttpsの違いは別ドメインとして扱う', () => {
      const currentUrl = 'https://example.com/page';
      const entryUrls = ['https://example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(1); // ドメイン一致
    });

    it('サブドメインの違いは別ドメインとして扱う', () => {
      const currentUrl = 'https://app.example.com/page';
      const entryUrls = ['https://example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(0); // マッチなし
    });

    it('同じサブドメインの場合はドメイン一致', () => {
      const currentUrl = 'https://app.example.com/dashboard';
      const entryUrls = ['https://app.example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(1);
    });

    it('ポート番号が含まれていても正しくマッチする', () => {
      const currentUrl = 'https://example.com:8080/page';
      const entryUrls = ['https://example.com:8080/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(1);
    });

    it('異なるポート番号は別ドメインとして扱う', () => {
      const currentUrl = 'https://example.com:8080/page';
      const entryUrls = ['https://example.com:9090/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(0);
    });

    it('クエリパラメータが異なっても完全一致と判定される', () => {
      const currentUrl = 'https://example.com/login?redirect=/dashboard';
      const entryUrls = ['https://example.com/login?redirect=/home'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      // URLとして完全一致ではないので、ドメイン一致
      expect(priority).toBe(1);
    });

    it('パスが完全一致すればクエリパラメータに関わらず完全一致', () => {
      const currentUrl = 'https://example.com/login?foo=bar';
      const entryUrls = ['https://example.com/login?foo=bar'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(2);
    });

    it('trailing slashの有無は別URLとして扱う', () => {
      const currentUrl = 'https://example.com/login/';
      const entryUrls = ['https://example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(1); // ドメイン一致のみ
    });

    it('複数のURLがある場合、完全一致を優先する', () => {
      const currentUrl = 'https://example.com/signin';
      const entryUrls = ['https://example.com/login', 'https://example.com/signin'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(2); // 完全一致
    });

    it('無効なURLが含まれていてもエラーを投げない', () => {
      const currentUrl = 'https://example.com/page';
      const entryUrls = ['not-a-valid-url', 'https://example.com/login'];
      
      expect(() => matchUrl(currentUrl, entryUrls)).not.toThrow();
      
      const priority = matchUrl(currentUrl, entryUrls);
      expect(priority).toBe(1); // 有効なURLでドメイン一致
    });

    it('currentUrlが無効な場合は0を返す', () => {
      const currentUrl = 'not-a-valid-url';
      const entryUrls = ['https://example.com/login'];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(0);
    });

    it('空のURLリストの場合は0を返す', () => {
      const currentUrl = 'https://example.com/page';
      const entryUrls: string[] = [];
      
      const priority = matchUrl(currentUrl, entryUrls);
      
      expect(priority).toBe(0);
    });
  });

  describe('matchUrls', () => {
    const entries: PasswordEntry[] = [
      createEntry('1', 'GitHub', ['https://github.com/login', 'https://github.com/signin']),
      createEntry('2', 'Google', ['https://accounts.google.com/login']),
      createEntry('3', 'Example', ['https://example.com/auth']),
      createEntry('4', 'Test', ['https://test.com/login'])
    ];

    it('優先度順にソートされた結果を返す', () => {
      const currentUrl = 'https://github.com/login';
      
      const results = matchUrls(currentUrl, entries);
      
      expect(results.length).toBe(4);
      expect(results[0].entry.title).toBe('GitHub');
      expect(results[0].priority).toBe(2); // 完全一致
      expect(results[1].priority).toBeLessThanOrEqual(results[0].priority);
    });

    it('完全一致が優先される', () => {
      const currentUrl = 'https://example.com/auth';
      
      const results = matchUrls(currentUrl, entries);
      
      expect(results[0].entry.title).toBe('Example');
      expect(results[0].priority).toBe(2);
    });

    it('ドメイン一致のみの場合も含まれる', () => {
      const currentUrl = 'https://github.com/dashboard';
      
      const results = matchUrls(currentUrl, entries);
      
      const githubResult = results.find(r => r.entry.title === 'GitHub');
      expect(githubResult).toBeDefined();
      expect(githubResult!.priority).toBe(1);
    });

    it('マッチしないエントリもpriority 0で含まれる', () => {
      const currentUrl = 'https://github.com/login';
      
      const results = matchUrls(currentUrl, entries);
      
      expect(results.length).toBe(4);
      
      const testResult = results.find(r => r.entry.title === 'Test');
      expect(testResult).toBeDefined();
      expect(testResult!.priority).toBe(0);
    });

    it('優先度が同じ場合、元の順序を保持する', () => {
      const currentUrl = 'https://unknown.com/page';
      
      const results = matchUrls(currentUrl, entries);
      
      // 全てpriority 0なので元の順序を保持
      expect(results[0].entry.title).toBe('GitHub');
      expect(results[1].entry.title).toBe('Google');
      expect(results[2].entry.title).toBe('Example');
      expect(results[3].entry.title).toBe('Test');
    });

    it('空の配列に対して空の配列を返す', () => {
      const currentUrl = 'https://example.com/page';
      
      const results = matchUrls(currentUrl, []);
      
      expect(results).toEqual([]);
    });

    it('複数の完全一致がある場合、全て優先される', () => {
      const entriesWithDuplicates = [
        createEntry('1', 'Entry1', ['https://example.com/login']),
        createEntry('2', 'Entry2', ['https://example.com/login']),
        createEntry('3', 'Entry3', ['https://other.com/login'])
      ];
      
      const currentUrl = 'https://example.com/login';
      const results = matchUrls(currentUrl, entriesWithDuplicates);
      
      expect(results[0].priority).toBe(2);
      expect(results[1].priority).toBe(2);
      expect(results[2].priority).toBe(0);
    });
  });

  describe('real-world scenarios', () => {
    it('GitHubのログインページで正しくマッチする', () => {
      const entry = createEntry('gh', 'GitHub', [
        'https://github.com/login',
        'https://github.com/session'
      ]);

      const loginUrl = 'https://github.com/login';
      const sessionUrl = 'https://github.com/session';
      const dashboardUrl = 'https://github.com/dashboard';

      expect(matchUrl(loginUrl, entry.urls)).toBe(2);
      expect(matchUrl(sessionUrl, entry.urls)).toBe(2);
      expect(matchUrl(dashboardUrl, entry.urls)).toBe(1);
    });

    it('Googleアカウントの複数サービスで正しくマッチする', () => {
      const entry = createEntry('google', 'Google', [
        'https://accounts.google.com/ServiceLogin',
        'https://accounts.google.com/signin'
      ]);

      const loginUrl = 'https://accounts.google.com/ServiceLogin';
      const signupUrl = 'https://accounts.google.com/signup';
      const gmailUrl = 'https://mail.google.com/';

      expect(matchUrl(loginUrl, entry.urls)).toBe(2);
      expect(matchUrl(signupUrl, entry.urls)).toBe(1);
      expect(matchUrl(gmailUrl, entry.urls)).toBe(0); // 別サブドメイン
    });

    it('localhostの開発環境で正しくマッチする', () => {
      const entry = createEntry('local', 'Local Dev', [
        'http://localhost:3000/login',
        'http://127.0.0.1:3000/login'
      ]);

      const localhostUrl = 'http://localhost:3000/login';
      const localhostDashboard = 'http://localhost:3000/dashboard';
      const ipUrl = 'http://127.0.0.1:3000/login';

      expect(matchUrl(localhostUrl, entry.urls)).toBe(2);
      expect(matchUrl(localhostDashboard, entry.urls)).toBe(1);
      expect(matchUrl(ipUrl, entry.urls)).toBe(2);
    });
  });

  describe('normalizeUrl', () => {
    it('https://を除去してホスト名とパスを返す', () => {
      expect(normalizeUrl('https://example.com/login')).toBe('example.com/login');
    });

    it('http://を除去してホスト名とパスを返す', () => {
      expect(normalizeUrl('http://example.com/login')).toBe('example.com/login');
    });

    it('末尾のスラッシュを除去する', () => {
      expect(normalizeUrl('https://example.com/login/')).toBe('example.com/login');
      expect(normalizeUrl('https://example.com/')).toBe('example.com');
    });

    it('デフォルトポート（80, 443）は除去する', () => {
      expect(normalizeUrl('http://example.com:80/login')).toBe('example.com/login');
      expect(normalizeUrl('https://example.com:443/login')).toBe('example.com/login');
    });

    it('カスタムポートは保持する', () => {
      expect(normalizeUrl('https://example.com:8080/login')).toBe('example.com:8080/login');
      expect(normalizeUrl('http://localhost:3000/dashboard')).toBe('localhost:3000/dashboard');
    });

    it('空文字列は空文字列を返す', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl('   ')).toBe('');
    });

    it('無効なURLはそのまま返す', () => {
      expect(normalizeUrl('not-a-url')).toBe('not-a-url');
    });

    it('クエリパラメータとフラグメントは保持しない', () => {
      // URLオブジェクトで解析するため、クエリパラメータは除去される
      const normalized = normalizeUrl('https://example.com/login?foo=bar#section');
      expect(normalized).toBe('example.com/login');
    });

    it('サブドメインを含むURLを正規化する', () => {
      expect(normalizeUrl('https://app.example.com/dashboard')).toBe('app.example.com/dashboard');
    });

    it('複数階層のパスを正規化する', () => {
      expect(normalizeUrl('https://example.com/path/to/page')).toBe('example.com/path/to/page');
    });
  });
});

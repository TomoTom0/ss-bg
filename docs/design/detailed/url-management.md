# URL管理機能の詳細設計

## 概要

認証情報に関連付けられたURLの管理機能。URLの正規化、柔軟な保存、自動追加提案を提供します。

## 実装日

2026-01-19

## 機能要件

### 1. URL正規化

登録時にURLを正規化して、統一されたフォーマットで保存します。

#### 正規化ルール

1. **プロトコル除去**: `https://`と`http://`を除去
2. **末尾スラッシュ除去**: パスの末尾にある`/`を除去
3. **デフォルトポート除去**: ポート80（HTTP）と443（HTTPS）は除去
4. **カスタムポート保持**: デフォルト以外のポートは保持

#### 例

```
入力                              → 出力
https://example.com/             → example.com
https://example.com/login/       → example.com/login
http://localhost:3000/           → localhost:3000
https://example.com:443/login    → example.com/login
https://example.com:8080/login   → example.com:8080/login
```

### 2. 認証情報の柔軟な保存

#### 必須フィールド

- `username`: ユーザー名（必須）
- `password`: パスワード（必須）

#### 任意フィールド

- `title`: タイトル（省略可）
- `urls`: URLリスト（省略可、空配列も許容）

#### title自動生成ロジック

```typescript
if (!title) {
  if (urls.length > 0) {
    title = urls[0];  // 最初のURLを使用
  } else {
    title = new Date().toLocaleString('ja-JP');  // 現在時刻
  }
}
```

### 3. 登録外URLでの自動入力時にURL追加を提案

パスワード自動入力後、現在のURLが認証情報の登録URLリストに含まれているかチェックし、含まれていない場合はURL追加を提案します。

#### 動作フロー

```
1. ユーザーがパスワードを自動入力
2. handleFillPassword()が実行
3. suggestAddingCurrentUrl()が呼ばれる
4. 現在のURLをmatchUrl()で照合
   - priority > 0 (一致): 何もしない
   - priority = 0 (不一致): 確認ダイアログを表示
5. ユーザーが「はい」を選択
   - 正規化されたURLを追加
   - 認証情報を更新
```

## 実装詳細

### URL正規化関数

**ファイル**: `src/utils/url-matcher.ts`

```typescript
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
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
    return trimmed;  // 無効なURLはそのまま返す
  }
}
```

### 保存処理の修正

**ファイル**: `src/options/App.vue`

```typescript
async function saveEntry(): Promise<void> {
  // バリデーション: username, passwordのみ必須
  if (!formData.value.username || !formData.value.password) {
    formError.value = 'ユーザー名とパスワードは必須です';
    return;
  }

  // URLを正規化（空を許容）
  const urls = formData.value.urlsText
    .split('\n')
    .map(url => normalizeUrl(url))
    .filter(url => url.length > 0);

  // titleが空の場合の処理
  let title = formData.value.title.trim();
  if (!title) {
    if (urls.length > 0) {
      title = urls[0];  // 最初のURLをtitleにする
    } else {
      title = new Date().toLocaleString('ja-JP');  // 現在時刻
    }
  }

  const entry: PasswordEntry = {
    id: editingEntry.value?.id || Date.now().toString(),
    title,
    username: formData.value.username,
    password: formData.value.password,
    urls,  // 空配列も許容
    // ... 他のフィールド
  };

  // 保存処理
  await sendMessage({ type: 'SAVE_PASSWORD', payload: entry });
}
```

### URL追加提案機能

**ファイル**: `src/content/content.ts`

```typescript
async function suggestAddingCurrentUrl(entry: PasswordEntry): Promise<void> {
  const currentUrl = window.location.href;
  const normalizedCurrentUrl = normalizeUrl(currentUrl);

  // 現在のURLがすでに登録されているかチェック
  const matchPriority = matchUrl(currentUrl, entry.urls);
  if (matchPriority > 0) {
    return;  // すでに登録されている
  }

  // URLが登録されていない場合、追加するか確認
  const shouldAdd = confirm(
    `このサイト (${normalizedCurrentUrl}) は「${entry.title}」の登録URLに含まれていません。\n\nURLを追加しますか？`
  );

  if (shouldAdd) {
    // URLを追加
    const updatedEntry: PasswordEntry = {
      ...entry,
      urls: [...entry.urls, normalizedCurrentUrl],
      updatedAt: Date.now()
    };

    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD',
      payload: updatedEntry
    });

    if (response.success) {
      console.log('URL added successfully:', normalizedCurrentUrl);
    }
  }
}

async function handleFillPassword(entry: PasswordEntry): Promise<void> {
  // ... パスワード入力処理 ...

  // 現在のURLが登録されていない場合、URLを追加するか提案
  await suggestAddingCurrentUrl(entry);
}
```

## テスト

### URL正規化関数のテスト

**ファイル**: `src/utils/url-matcher.test.ts`

```typescript
describe('normalizeUrl', () => {
  it('https://を除去してホスト名とパスを返す', () => {
    expect(normalizeUrl('https://example.com/login')).toBe('example.com/login');
  });

  it('末尾のスラッシュを除去する', () => {
    expect(normalizeUrl('https://example.com/login/')).toBe('example.com/login');
  });

  it('デフォルトポート（80, 443）は除去する', () => {
    expect(normalizeUrl('http://example.com:80/login')).toBe('example.com/login');
    expect(normalizeUrl('https://example.com:443/login')).toBe('example.com/login');
  });

  it('カスタムポートは保持する', () => {
    expect(normalizeUrl('https://example.com:8080/login')).toBe('example.com:8080/login');
  });

  it('空文字列は空文字列を返す', () => {
    expect(normalizeUrl('')).toBe('');
  });

  it('無効なURLはそのまま返す', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});
```

テスト結果: 35 tests passed ✅

## ユーザー体験

### 登録時

1. **URL入力が柔軟**:
   - `https://example.com/` のように入力しても自動的に `example.com` に正規化
   - URLを1つも入力しなくても保存可能
   - titleを空にすると、URLまたは現在時刻が自動設定される

2. **一貫性のあるURL管理**:
   - プロトコルや末尾スラッシュの有無を気にせず入力可能
   - 内部的には統一されたフォーマットで保存

### 自動入力時

1. **URL追加の提案**:
   - 登録外のURLで自動入力すると、確認ダイアログが表示
   - ユーザーが承認すると、正規化されたURLが自動追加
   - 非侵入的: confirmダイアログで簡潔に確認

2. **URL一致の判定**:
   - 完全一致（priority 2）: URL全体が一致
   - ドメイン一致（priority 1）: ホスト名とポートが一致
   - 不一致（priority 0）: マッチなし → URL追加を提案

## 技術的な考慮事項

### セキュリティ

- URL正規化は暗号化前に実行されるため、セキュリティへの影響はありません
- confirm()ダイアログは同期的に動作し、ユーザーの明示的な承認を得ます

### パフォーマンス

- URL正規化は軽量な処理（URLオブジェクトの解析のみ）
- URL追加提案は自動入力後に非同期で実行されるため、UXへの影響は最小限

### 後方互換性

- 既存の認証情報（正規化されていないURL）も引き続き動作します
- 次回保存時に自動的に正規化されます

## 今後の改善案

1. **URL一括正規化ツール**: 既存の認証情報のURLを一括で正規化する機能
2. **URL重複検出**: 同じサイトに複数の認証情報がある場合に警告
3. **URLパターンマッチング**: ワイルドカード対応（例: `*.example.com`）
4. **URL履歴**: 過去に使用したURLの履歴を記録して、候補として表示

# 追加フィールド機能

## 概要

username/password以外のフィールドを記録・自動入力できる機能です。

## 機能

### 1. 自動検出（フォームから保存）

**使い方:**
1. ログインフォームで右クリック
2. 「SS-BG パスワード管理」→「現在のフォームを保存」を選択
3. フォーム内の全入力フィールドが自動検出される
4. オプションページが開き、検出されたフィールドが表示される

**自動検出される情報:**
- フィールド名（name属性、placeholder、または自動生成）
- 入力値
- CSSセレクタ（次回の自動入力用）

### 2. 手動追加・編集

#### オプションページでの編集

**新規追加時:**
1. 「新規追加」ボタンをクリック
2. タイトル、ユーザー名、パスワード、URLを入力
3. 「+ フィールドを追加」ボタンで追加フィールドを追加
   - フィールド名: 項目の名前（例：電話番号、メールアドレス）
   - 値: 入力する値
   - セレクタ: CSSセレクタ（省略可、自動入力の精度向上に使用）

**既存エントリの編集:**
1. パスワード一覧から「編集」ボタンをクリック
2. 追加フィールドの編集・削除・追加が可能
3. 「保存」で反映

#### ダイアログでの編集

**使い方:**
1. 入力フィールドで右クリック
2. 「SS-BG パスワード管理」→「パスワードを入力...」を選択
3. パスワードエントリを選択
4. 「✏️ フィールドを編集...」ボタンをクリック
5. 追加フィールドの編集・削除・追加が可能
6. 「保存」で即座に反映される

### 3. 自動入力

**すべて入力:**
- ユーザー名、パスワード、追加フィールドをまとめて入力

**個別入力:**
- フィールド選択画面で特定のフィールドのみを選択して入力可能

## データ構造

```typescript
interface PasswordEntry {
  id: string;
  title: string;
  urls: string[];
  username: string;
  password: string;
  
  // セレクタ情報（自動検出時に保存）
  usernameSelector?: string;
  passwordSelector?: string;
  
  // 追加フィールド
  additionalFields?: Array<{
    name: string;          // フィールド名
    value: string;         // 値
    selector?: string;     // CSSセレクタ
    sensitive?: boolean;   // 機密フィールド（マスク表示対象）
  }>;
  
  createdAt: number;
  updatedAt: number;
}
```

## UI実装箇所

### 1. オプションページ (`src/options/App.vue`)
- パスワード一覧での追加フィールド表示
- 編集フォームでの追加フィールド編集UI
  - 「+ フィールドを追加」ボタン
  - 各フィールドの名前・値・セレクタ入力欄
  - 削除ボタン

### 2. コンテンツスクリプト（ダイアログ） (`src/content/content.ts`)
- フィールド選択画面
  - 追加フィールドの個別入力ボタン
  - 「✏️ フィールドを編集...」ボタン
- フィールド編集ダイアログ
  - 追加フィールドの編集UI
  - リアルタイム保存

### 3. ポップアップ (`src/popup/App.vue`)
- フィールド選択画面での追加フィールド表示（既存機能）

## 自動検出の仕組み

### フィールドタイプ判定 (`src/utils/field-detector.ts`)

以下の優先順位で判定：

1. **`type`属性**（最優先）
   - `type="password"` → password
   - `type="email"` → email
   - `type="tel"` → tel

2. **`name`属性のパターンマッチ**
   - **username**: `user`, `login`, `account`, `id`, `userid`, `username`, `loginid`
   - **email**: `email`, `mail`
   - **tel**: `phone`, `tel`, `mobile`

3. **`id`属性のパターンマッチ**（同じパターン）

4. **`placeholder`属性のパターンマッチ**（同じパターン）

5. **`autocomplete`属性**
   - `autocomplete="username"` → username
   - `autocomplete="email"` → email
   - `autocomplete="tel"` → tel

### CSSセレクタ生成 (`generateSelector`)

以下の優先順位でCSSセレクタを生成：

1. **`id`属性** → `#elementId`
2. **`name`属性** → `input[name="fieldName"]`
3. **`type`属性 + nth-of-type** → `form input[type="password"]:nth-of-type(1)`
4. **フォールバック: nth-child** → `div > :nth-child(2)`

### フォームキャプチャ (`src/content/form-detector.ts`)

```typescript
export function captureFormData(form: HTMLFormElement): Partial<PasswordEntry> {
  const fields = detectFormFields(form);
  
  // username/passwordを優先的に抽出
  // 残りは additionalFields として保存
  
  return {
    title,
    urls: [url],
    username,
    password,
    usernameSelector,
    passwordSelector,
    additionalFields // その他のフィールド
  };
}
```

## セキュリティ

- 追加フィールドもパスワードと同様にAES-256-GCMで暗号化
- セレクタ情報も暗号化されて保存
- メモリ上でのみ復号化

## 今後の拡張案

- [ ] フィールドタイプの指定（text, email, tel, numberなど）
- [ ] フィールドの並び順制御
- [ ] セレクタの自動検証・修正
- [ ] 複数フォームページへの対応
- [x] フィールドのマスク表示オプション（`sensitive` フラグで実装済み）

## 機密フィールド（sensitive）

追加フィールドに `sensitive: true` を設定すると、機密値としてマスク表示されます。

### 表示仕様

- **オプションページ**: 機密フィールドは一覧で `••••••••` 表示。ピークボタンで一時表示可能。
- **ポップアップ**: 入力候補リストでも機密値は `••••••••` でマスク。クリック入力時は実値が渡される。
- **コンテンツダイアログ（右クリック編集UI）**: フィールド選択リストで機密値をマスク。編集ダイアログでは機密値入力を `type=password` + ピークボタンで扱う。
- **自動非表示**: ピーク表示した機密値（パスワード含む）は5分後に自動的にマスクへ戻る。

### 編集

- 各編集UI（オプションページ・コンテンツダイアログ）で追加フィールドに `機密` チェックボックスを設ける。
- 機密フィールドの値入力は `type=password` となり、ピークボタンで再表示可能。

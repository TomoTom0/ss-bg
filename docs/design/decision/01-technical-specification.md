# 技術仕様決定書

## 決定日
2026-01-13

## 概要

Windows限定のコンパクトなChrome拡張機能として、パスワード管理とスクリーンショット機能を実装する。

## 1. 認証・暗号化方式

### 決定事項
**Windows Hello + WebAuthn PRF拡張による暗号化**

### 詳細

#### 認証方式
- Windows Helloを必須とする（生体認証、PIN、セキュリティキー）
- WebAuthn APIを使用
- 対象OS: Windows 10 (1809以降) / Windows 11
- 要件: TPM 2.0

#### 暗号化鍵の導出
- WebAuthn PRF (Pseudo-Random Function) 拡張を使用
- credential + application-specific salt → 決定論的な32バイト出力
- HKDF-SHA256でAES-256-GCM鍵を導出
- 同じcredentialと同じsaltで常に同じ鍵が得られる

#### セッション管理
- 認証成功後、復号化した鍵をメモリ上に保持
- デフォルトタイムアウト: 30分（ユーザー設定可能）
- Service Worker終了時に自動的にメモリクリア

#### 実装場所
- オプションページ: 初回セットアップ（credential登録）
- ポップアップ: パスワード使用時の認証
- オプションページ: パスワード保存・編集時の認証

### 理由
- マスターパスワード不要でUX向上
- TPMによるハードウェアレベルのセキュリティ
- PRF拡張により鍵の永続化が可能
- Chrome 108以降で標準サポート

### リスクと対策

#### Credentialの喪失
- **リスク**: デバイス故障やWindows再インストールでデータ喪失
- **対策**: 
  - 暗号化データのエクスポート機能を提供
  - 将来的にGPG/pass同期機能で他デバイスと共有

#### PRF非対応環境
- **リスク**: 古いWindowsやTPM非対応PCでは動作不可
- **対策**:
  - 初回セットアップ時にPRF対応をチェック
  - 非対応の場合はエラーメッセージと要件を表示

## 2. データ保存

### 決定事項
**Chrome Storage API (local) + unlimitedStorageパーミッション**

### 詳細

#### ストレージタイプ
- `chrome.storage.local`を使用
- `chrome.storage.sync`は使用しない（容量制限とクラウド同期の必要性なし）

#### パーミッション
- `storage`: Chrome Storage APIへのアクセス
- `unlimitedStorage`: 容量制限の解除

#### データ構造

```typescript
interface PasswordEntry {
  id: string;              // UUID
  title: string;           // 表示名
  urls: string[];          // 複数URL対応
  username: string;        
  password: string;        // 暗号化される
  notes?: string;          // 暗号化される
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}

interface EncryptedData {
  iv: string;              // Base64エンコードされたIV
  data: string;            // Base64エンコードされた暗号化データ
  algorithm: 'AES-GCM';    // 暗号化アルゴリズム
  version: 1;              // データフォーマットバージョン
}

interface StorageSchema {
  // WebAuthn credential ID
  credentialId: string;    // Base64エンコード
  
  // 暗号化されたパスワードエントリ
  passwords: EncryptedData;
  
  // 設定
  settings: {
    sessionTimeout: number;  // 分単位（デフォルト30）
    autoLock: boolean;       // アイドル時自動ロック
  };
}
```

### 理由
- パスワードエントリ数が増加する可能性
- 暗号化によるデータサイズ増加（約1.3~1.5倍）
- 将来的な機能拡張の余地

## 3. パスワード自動入力

### 決定事項
**Content Scriptによるドロップダウン表示 + 明示的な選択**

### 詳細

#### トリガー
- ユーザーがフォーム入力フィールド（type="text", "email", "password"）にフォーカス
- Content ScriptがドロップダウンUIを表示

#### URLマッチング

優先順位：
1. **完全一致**: 登録URLと現在のURLが完全一致
2. **ドメイン一致**: ドメイン部分が一致
3. **手動選択**: 「他のパスワードを表示」で全エントリから選択可能

```typescript
function matchUrl(currentUrl: string, entryUrls: string[]): number {
  // 完全一致: priority 2
  if (entryUrls.includes(currentUrl)) return 2;
  
  const currentDomain = new URL(currentUrl).hostname;
  
  // ドメイン一致: priority 1
  for (const url of entryUrls) {
    try {
      const entryDomain = new URL(url).hostname;
      if (currentDomain === entryDomain) return 1;
    } catch {
      continue;
    }
  }
  
  // マッチなし: priority 0
  return 0;
}
```

#### UI実装
- Shadow DOMでページのスタイルから分離
- フィールド位置に応じて動的配置
- ビューポート外に出ないよう調整
- Vue.jsコンポーネントとして実装

#### データフロー
```
1. フィールドフォーカス
   ↓
2. Content Script: ドロップダウン表示
   ↓
3. ユーザー選択
   ↓
4. Content Script → Service Worker: パスワード要求
   ↓
5. Service Worker: セッション確認
   ├─ 有効 → 復号化してContent Scriptに返信
   └─ 無効 → ポップアップ開いてWindows Hello認証
   ↓
6. Content Script: フィールドに自動入力
```

### 理由
- キーボードショートカットより直感的
- URLマッチングにより関連エントリのみ表示
- 誤入力のリスクを最小化

## 4. UI構成

### 決定事項
**ポップアップ + オプションページ + Content Script UI**

### 詳細

#### ポップアップ（popup.html）
- パスワード一覧（簡易表示）
- 検索機能
- クリップボードコピー
- オプションページへのリンク
- 現在のページに対するマッチング結果表示
- ロック/アンロック状態表示

#### オプションページ（options.html）
- 初回セットアップ（Windows Hello登録）
- パスワードエントリの追加・編集・削除
- 複数URL登録
- 設定
  - セッションタイムアウト時間
  - 自動ロック設定
- データエクスポート機能

#### Content Script UI
- ドロップダウンメニュー（Shadow DOM）
- フォームフィールド横に表示
- マッチしたパスワード候補一覧
- 「他のパスワードを表示」オプション

### フレームワーク
- Vue.js 3 (Composition API)
- TypeScript
- CSS: スコープドスタイル + Shadow DOM内インライン

## 5. スクリーンショット機能

### 決定事項
**chrome.tabs.captureVisibleTab + キーボードショートカット**

### 詳細

#### 基本機能（Phase 2）
- キーボードショートカット: `Ctrl+Shift+S`
- 現在のタブの表示領域をキャプチャ
- ダウンロードフォルダに自動保存
- ファイル名: `screenshot_YYYYMMDD_HHmmss.png`

#### トリミング機能（Phase 3）
- キーボードショートカット: `Ctrl+Shift+C`
- キャプチャ後、Canvas overlayでトリミングUI表示
- ドラッグで範囲選択
- トリミング後に保存

### 理由
- シンプルで実装コストが低い
- 将来的な機能拡張の余地

## 6. ビルド・開発環境

### 決定事項
**Vite + CRXJS + Vue.js + TypeScript + pnpm**

### 詳細

#### パッケージマネージャ
- pnpm

#### ビルドツール
- Vite 5.x
- @crxjs/vite-plugin
- @vitejs/plugin-vue

#### 言語
- TypeScript（strict mode）

#### Manifestファイル
- `manifest.config.ts`で管理
- package.jsonから自動的にname, version, descriptionを取得

#### 開発フロー
- `pnpm dev`: HMR有効な開発モード
- `pnpm build`: プロダクションビルド
- chrome://extensions/ で dist/ フォルダをロード

### 理由
- HMRによる開発効率向上
- TypeScriptフルサポート
- Manifest V3のベストプラクティス
- Vue.jsとのシームレスな統合

## 7. パーミッション

### 必要なパーミッション

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "downloads",
    "contextMenus",
    "offscreen",
    "scripting"
  ]
}
```

#### 各パーミッションの理由
- `storage`: Chrome Storage APIへのアクセス（暗号化データ保存）
- `activeTab`: ユーザーがアクションを起こしたタブへのアクセス（スクリーンショット、自動入力）
- `downloads`: スクリーンショットのダウンロード
- `contextMenus`: 右クリックメニューの追加
- `offscreen`: オフスクリーン処理（クリップボードコピー等）
- `scripting`: Content Scriptのオンデマンド注入（ユーザーアクション時のみ実行）

### コンテンツスクリプトの注入方式
- **オンデマンド注入**: `content_scripts`の`matches`は使用せず、ユーザーアクション時に`chrome.scripting.executeScript`で動的に注入
- **メリット**: 全ページでの自動実行を回避し、プライバシーを向上

## 8. 実装フェーズ

### Phase 1: コア機能（MVP）
1. プロジェクトセットアップ
2. Windows Hello認証機能
   - オプションページでcredential登録
   - ポップアップで認証
   - セッション管理
3. 暗号化・復号化ユーティリティ
4. オプションページ（パスワードCRUD）
5. ポップアップ（一覧表示、コピー）
6. Content Script（ドロップダウンUI、自動入力）
7. URLマッチング実装

### Phase 2: スクリーンショット
8. 基本的なスクリーンショット機能
9. ダウンロード保存

### Phase 3: 高度な機能
10. トリミング機能
11. データエクスポート/インポート
12. 設定画面の充実
13. GPG/pass同期機能（将来的）

## 次のステップ

1. 詳細設計の作成
2. プロジェクトセットアップ
3. プロトタイプ実装（Windows Hello認証）

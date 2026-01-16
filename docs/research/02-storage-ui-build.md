# 調査結果: Chrome Storage API、Content Script UI、ビルド設定

## 調査日
2026-01-13

## 1. Chrome Storage APIの容量制限

### デフォルト制限
- **chrome.storage.local**: 約10MB（Chrome 113以降）
- **chrome.storage.sync**: 約100KB（クラウド同期のため制限が厳しい）
- 各アイテム: sync は 8KB まで

### unlimitedStorageパーミッション

#### 設定方法
manifest.jsonに追加：
```json
{
  "permissions": [
    "storage",
    "unlimitedStorage"
  ]
}
```

#### 効果
- chrome.storage.localの容量制限を解除
- ディスク空き容量まで使用可能
- IndexedDB、Cache Storageも無制限化
- **chrome.storage.syncは依然として制限あり**（クラウド同期のため）

#### ユーザー警告
- インストール時にユーザーに警告が表示される
- 「大量のデータを保存する可能性がある」旨の通知
- 説明文で使用理由を明記するべき

#### 推奨事項
- 本当に必要な場合のみ使用
- パスワードマネージャーのような用途では正当
- 大量のエントリ保存が想定される場合は必須

### 本プロジェクトでの判断

**unlimitedStorageを使用する**

理由：
- パスワードエントリ数が増える可能性
- 暗号化によりデータサイズが増加（元のサイズの1.3~1.5倍程度）
- 将来的にスクリーンショット一時保存等にも使用する可能性

## 2. Content ScriptでのUIインジェクション

### Shadow DOMを使用したスタイル分離

#### 必要性
- ページのCSSと競合しない独立したUI
- 拡張のスタイルがページに影響しない
- ページのスタイルが拡張UIに影響しない

#### 基本実装パターン

```typescript
// content-script.ts

// コンテナを作成
const container = document.createElement('div');
container.id = 'ss-bg-dropdown-container';
container.style.position = 'absolute';
container.style.zIndex = '2147483647'; // 最大値

// Shadow DOMをアタッチ
const shadowRoot = container.attachShadow({ mode: 'open' });

// スタイルを注入
const style = document.createElement('style');
style.textContent = `
  .dropdown {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
  }
  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
  }
  .dropdown-item:hover {
    background: #f5f5f5;
  }
`;
shadowRoot.appendChild(style);

// UIを構築
const dropdown = document.createElement('div');
dropdown.className = 'dropdown';
shadowRoot.appendChild(dropdown);

// ページに追加
document.body.appendChild(container);
```

#### Vue.jsとの統合

Vue.jsをShadow DOM内で使用する場合：

```typescript
import { createApp } from 'vue';
import DropdownUI from './DropdownUI.vue';

const container = document.createElement('div');
const shadowRoot = container.attachShadow({ mode: 'open' });

// スタイルを注入（ViteでCSSをインポート）
const style = document.createElement('style');
style.textContent = /* CSS文字列 */;
shadowRoot.appendChild(style);

// Vueアプリをマウント
const app = document.createElement('div');
shadowRoot.appendChild(app);

createApp(DropdownUI).mount(app);

document.body.appendChild(container);
```

#### 注意事項

1. **CSSのインポート**
   - 通常の`import './style.css'`はShadow DOM内では機能しない
   - CSS文字列としてインポートして`<style>`タグで注入
   - Viteの設定で`?inline`クエリを使用可能

2. **イベントリスナー**
   - Shadow DOM内のイベントは外部に漏れない
   - バブリングは機能するが、ターゲットがshadowRootになる

3. **フォーカス管理**
   - ページのフォーム要素とShadow DOM内のUIの間でフォーカス移動を考慮

4. **ポジショニング**
   - 入力フィールドの位置に応じて動的に配置
   - ビューポート外に出ないよう調整

### フレームワーク支援ツール

#### CRXJS
- Shadow DOMへのCSS注入を自動化
- HMRサポート

#### Plasmo
- Content Scripts UIの抽象化
- Shadow DOMのボイラープレート削減

### 本プロジェクトでの方針

**Shadow DOMを使用し、手動でスタイル注入**

理由：
- フレームワークの学習コスト
- シンプルなドロップダウンUIのため、手動実装で十分
- CRXJSは使用するが、Shadow DOM関連は明示的に制御

## 3. Vite + Vue.js でのChrome拡張ビルド

### CRXJSプラグインの使用

#### インストール

```bash
pnpm add -D @crxjs/vite-plugin @vitejs/plugin-vue
```

#### manifest設定

`manifest.config.ts`を作成：

```typescript
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  
  permissions: [
    'storage',
    'unlimitedStorage',
    'activeTab',
    'tabs',
    'scripting'
  ],
  
  host_permissions: ['<all_urls>'],
  
  background: {
    service_worker: 'src/background/main.ts',
    type: 'module'
  },
  
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/main.ts'],
      run_at: 'document_idle'
    }
  ],
  
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  
  options_page: 'src/options/index.html',
  
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  },
  
  commands: {
    'take-screenshot': {
      suggested_key: {
        default: 'Ctrl+Shift+S'
      },
      description: 'スクリーンショットを撮影'
    },
    'take-screenshot-crop': {
      suggested_key: {
        default: 'Ctrl+Shift+C'
      },
      description: 'スクリーンショット撮影後トリミング'
    }
  }
});
```

#### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // 明示的なエントリーポイント指定（必要に応じて）
      }
    }
  }
});
```

#### ディレクトリ構造

```
src/
  background/
    main.ts          # Service Worker
  content/
    main.ts          # Content Script
    DropdownUI.vue   # ドロップダウンUI
    styles.css       # Shadow DOM用スタイル
  popup/
    index.html
    main.ts
    App.vue
  options/
    index.html
    main.ts
    App.vue
  utils/
    crypto.ts        # 暗号化ユーティリティ
    storage.ts       # Storage API ラッパー
    webauthn.ts      # WebAuthn処理
icons/
  icon16.png
  icon48.png
  icon128.png
manifest.config.ts
vite.config.ts
package.json
tsconfig.json
```

#### 開発・ビルドコマンド

```bash
# 開発モード（HMR有効）
pnpm dev

# プロダクションビルド
pnpm build

# Chrome拡張としてロード
# chrome://extensions/ で「デベロッパーモード」を有効化
# 「パッケージ化されていない拡張機能を読み込む」で dist/ フォルダを選択
```

### HMR（Hot Module Replacement）

CRXJSの利点：
- ポップアップ、オプションページでHMRが動作
- Content ScriptもHMR対応（ページリロードなしで更新）
- Background Service Workerは自動再起動

### CSS処理

#### Shadow DOM用CSS

```typescript
// Viteで?inlineクエリを使用
import css from './styles.css?inline';

const style = document.createElement('style');
style.textContent = css;
shadowRoot.appendChild(style);
```

または、Viteプラグイン設定で自動化：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest }),
    {
      name: 'inline-css',
      transform(code, id) {
        if (id.includes('?inline')) {
          return {
            code: `export default ${JSON.stringify(code)}`,
            map: null
          };
        }
      }
    }
  ]
});
```

### TypeScript設定

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "types": ["@types/chrome", "vite/client"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "manifest.config.ts"]
}
```

### 本プロジェクトでの方針

**CRXJS + Vite + Vue.js + TypeScript + pnpm**

理由：
- HMRによる開発効率向上
- Manifest V3のベストプラクティス
- TypeScriptフルサポート
- Vue.jsとのシームレスな統合
- pnpmによる高速なパッケージ管理

## 次のステップ

1. プロジェクトセットアップ
2. WebAuthnプロトタイプ実装
3. 基本的なUI構築

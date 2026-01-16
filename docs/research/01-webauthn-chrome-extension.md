# 調査結果: Chrome拡張でのWebAuthn使用

## 調査日
2026-01-13

## 1. Chrome拡張（Manifest V3）でのWebAuthn API使用可否

### 結論
**可能だが、Service Workerから直接は使用不可**

### 詳細

#### Service Workerの制約
- Manifest V3ではバックグラウンド処理にService Workerを使用
- Service WorkerはDOM APIにアクセス不可
- **WebAuthn APIはDOM APIの一部であり、Service Workerから直接実行不可**

#### 実装パターン

WebAuthn APIを使用するには、以下のいずれかのコンテキストで実行する必要がある：

1. **ポップアップ（popup.html）**
   - ユーザーが拡張アイコンをクリックした際に表示
   - DOM APIフルアクセス可能
   - 最も一般的な実装パターン

2. **オプションページ（options.html）**
   - chrome://extensions/ から開く設定ページ
   - DOM APIフルアクセス可能
   - 初回セットアップに適している

3. **Offscreen Document**
   - Manifest V3で導入された新機能
   - バックグラウンドでDOM APIを使用したい場合に利用
   - `chrome.offscreen.createDocument()` で作成

4. **Content Script**
   - Webページに注入されるスクリプト
   - ページのDOM APIを使用可能
   - ただしWebAuthnはページのoriginに紐付くため注意が必要

#### 推奨実装フロー

```
1. ユーザーが拡張機能を操作（ポップアップを開く等）
   ↓
2. ポップアップまたはオプションページでWebAuthn APIを実行
   ↓
3. 認証結果をchrome.runtime.sendMessageでService Workerに送信
   ↓
4. Service Workerでデータを処理・保存
```

#### コード例

```typescript
// options.html (Vue.js内)
const registerCredential = async () => {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: "SS-BG",
          id: chrome.runtime.id // 拡張機能のID
        },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "user",
          displayName: "User"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }  // ES256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        extensions: {
          prf: {}  // PRF拡張を有効化
        }
      }
    });
    
    // Service Workerに送信
    await chrome.runtime.sendMessage({
      type: 'credential-registered',
      credentialId: Array.from(new Uint8Array(credential.rawId))
    });
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

## 2. 暗号化鍵の永続化と再利用

### 結論
**WebAuthn PRF拡張を使用することで可能**

### PRF (Pseudo-Random Function) 拡張

#### 概要
- WebAuthn Level 3で導入された拡張機能
- CTAP2のhmac-secret拡張に基づく
- credentialに紐付いた秘密情報から決定論的に鍵を導出

#### 動作原理

1. **Credential登録時**
   - PRF拡張を有効化
   - Authenticatorが内部で高エントロピーな秘密をcredentialに紐付ける

2. **認証時**
   - アプリケーションがsalt（任意のバイト列）を提供
   - Authenticatorが `HMAC(credential_secret, salt)` を計算
   - 決定論的な32バイトの出力を返す

3. **鍵の永続性**
   - **同じcredential + 同じsalt = 常に同じ出力**
   - この出力を暗号化鍵として使用可能

#### コード例

```typescript
// 登録時: PRF拡張を有効化
const credential = await navigator.credentials.create({
  publicKey: {
    // ... 基本設定 ...
    extensions: {
      prf: {}  // PRF拡張を有効化
    }
  }
});

// PRF対応状況を確認
const prfEnabled = credential.getClientExtensionResults().prf?.enabled;

// 認証時: saltを指定してPRF出力を取得
const assertion = await navigator.credentials.get({
  publicKey: {
    // ... 基本設定 ...
    extensions: {
      prf: {
        eval: {
          first: new Uint8Array(32) // アプリケーション固有のsalt
        }
      }
    }
  }
});

// PRF出力を取得（32バイト）
const prfOutput = assertion.getClientExtensionResults().prf?.results?.first;

// この出力を暗号化鍵として使用
const encryptionKey = await crypto.subtle.importKey(
  'raw',
  prfOutput,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

#### HKDFを使った鍵導出（推奨）

PRF出力をそのまま使うのではなく、HKDFで導出するのがベストプラクティス：

```typescript
const derivedKey = await crypto.subtle.deriveKey(
  {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(32), // アプリケーション固有
    info: new TextEncoder().encode('ss-bg-encryption-key')
  },
  await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']),
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

### 重要な注意事項

#### 鍵の喪失リスク
- Credentialが削除されると、PRF出力も永久に失われる
- **暗号化されたデータにアクセス不可能になる**
- バックアップ・リカバリー戦略が必須

#### ブラウザ・Authenticatorサポート
- Chrome 108以降でサポート（2022年12月リリース）
- Windows Hello: PRF対応（TPM 2.0必須）
- すべてのAuthenticatorが対応しているわけではない

#### デバイス固有性
- Credentialはデバイスに紐付く
- 他のデバイスでは同じ鍵を導出できない
- マルチデバイス対応にはデータ同期機構が必要

## 3. 実装方針の確定

### 推奨アーキテクチャ

```
[ユーザー操作]
    ↓
[オプションページ/ポップアップ（Vue.js）]
    ↓ WebAuthn API + PRF
[Windows Hello認証]
    ↓
[PRF出力から暗号化鍵を導出]
    ↓
[データの暗号化/復号化]
    ↓
[Chrome Storage APIに保存]
```

### 初回セットアップフロー

1. オプションページを開く
2. 「Windows Helloで保護」ボタンをクリック
3. WebAuthn credential作成（PRF有効）
4. Windows Helloで認証（指紋、顔、PIN）
5. credential IDをChrome Storageに保存
6. セットアップ完了

### パスワード保存フロー

1. オプションページでパスワード入力
2. Windows Helloで認証
3. PRF出力から暗号化鍵を導出
4. パスワードデータを暗号化
5. Chrome Storageに保存

### パスワード使用フロー

1. ユーザーがフォームにフォーカス
2. Content Scriptがドロップダウン表示
3. ユーザーが選択
4. Service WorkerにリクエストUNK5. Service Workerがポップアップを開いて認証要求
6. ポップアップでWindows Hello認証
7. PRF出力から暗号化鍵を導出
8. 暗号化データを復号化
9. Content Scriptに送信して自動入力

## 4. 懸念事項と対策

### 懸念1: 認証のたびにポップアップが開く

**問題**: パスワードを使うたびにポップアップが開くとUXが悪い

**対策**:
- セッション管理: 認証後30分間は復号化済みデータをメモリ保持
- Service Workerの永続化工夫（ただし完全な永続化は不可）
- ユーザーがタイムアウト時間を設定可能に

### 懸念2: PRF非対応Authenticatorへの対応

**問題**: 古いWindows 10やTPM非対応PCではPRFが使えない

**対策**:
- 初回セットアップ時にPRF対応をチェック
- 非対応の場合はエラーメッセージ表示
- システム要件を明記（Windows 10 1809以降、TPM 2.0）

### 懸念3: Credentialバックアップ

**問題**: デバイス故障やWindows再インストールでデータ喪失

**対策**:
- エクスポート機能: 暗号化データをファイルとして保存
- 別のマスターパスワード方式もオプションで提供
- 将来的にGPG/pass同期機能で解決

## 次のステップ

1. プロトタイプ実装
   - オプションページでWebAuthn + PRF動作確認
   - ./tmp/ に検証コードを作成
2. Chrome Storageの容量確認
3. Vite + Vue.jsビルド設定の調査

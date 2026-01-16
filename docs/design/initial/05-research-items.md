# 実装前の技術調査項目

## 調査が必要な項目

### 1. Chrome拡張でのWebAuthn API使用

**調査内容**
- [ ] Chrome拡張のService Worker、ポップアップ、オプションページの各コンテキストでWebAuthn APIが使用可能か
- [ ] rpId（Relying Party ID）として拡張機能IDが使用できるか
- [ ] Manifest V3での制約事項
- [ ] 既存の実装例やライブラリの有無

**参考ドキュメント**
- Chrome Extension WebAuthn API documentation
- W3C WebAuthn Specification

### 2. 暗号化鍵の永続化と再利用

**調査内容**
- [ ] WebAuthnの署名結果から一貫した暗号化鍵を導出できるか
- [ ] 同じcredentialIdで毎回同じ鍵が得られるか
- [ ] 鍵の導出方法（HKDF、署名のハッシュ等）
- [ ] セキュリティ上の推奨プラクティス

**懸念点**
- WebAuthnの署名にはチャレンジが含まれるため、毎回異なる結果になる可能性
- 別途、対称鍵を生成してWebAuthnで保護する方式が必要かもしれない

### 3. Chrome Storage APIでの大容量データ保存

**調査内容**
- [ ] chrome.storage.local の容量制限（Manifest V3）
- [ ] パスワードエントリ数の現実的な上限
- [ ] 暗号化データのサイズ増加率

**確認事項**
- デフォルト: 5MB（chrome.storage.sync）、10MB（chrome.storage.local）
- unlimitedStorageパーミッションで無制限化可能か

### 4. Content ScriptでのUIインジェクション

**調査内容**
- [ ] ページのスタイルと干渉しないドロップダウンUIの実装方法
- [ ] Shadow DOMの使用可否
- [ ] iframe を使用したスタイル分離
- [ ] CSP（Content Security Policy）の制約
- [ ] 既存のパスワードマネージャー拡張の実装パターン

### 5. スクリーンショットAPI

**調査内容**
- [ ] chrome.tabs.captureVisibleTab API の詳細
- [ ] キャプチャ可能な範囲（タブ全体 vs viewport）
- [ ] キャプチャ画質の設定
- [ ] 制約事項（chrome:// ページ、file:// ページ等）

### 6. Canvas でのトリミングUI

**調査内容**
- [ ] 画像上でのドラッグ選択実装パターン
- [ ] マウスイベントハンドリング
- [ ] レスポンシブなUI設計
- [ ] パフォーマンス考慮事項

### 7. Vite + Vue.js でのChrome拡張ビルド

**調査内容**
- [ ] Vite プラグイン（@crxjs/vite-plugin 等）の使用
- [ ] manifest.json の自動生成・管理
- [ ] HMR（Hot Module Replacement）の対応状況
- [ ] TypeScriptとの統合
- [ ] ビルド設定のベストプラクティス

### 8. 複数URLマッチングのアルゴリズム

**調査内容**
- [ ] URL正規化（http/https、www有無、trailing slash等）
- [ ] サブドメインマッチングの実装
- [ ] パフォーマンス最適化（大量エントリでの検索速度）
- [ ] 既存ライブラリの有無（psl: Public Suffix List等）

### 9. セキュリティ考慮事項

**調査内容**
- [ ] XSS対策（Content Script内でのDOM操作）
- [ ] CSP対策
- [ ] メモリ上の平文データのライフサイクル管理
- [ ] Service Workerの永続性（終了時の鍵破棄）
- [ ] OWASP Chrome Extension Security Cheat Sheet

### 10. Windows Hello の制約事項

**調査内容**
- [ ] 企業ポリシーによる制限の可能性
- [ ] 仮想マシン上での動作
- [ ] リモートデスクトップ接続時の挙動
- [ ] TPM 1.2 vs 2.0 の違い
- [ ] エラーケースの網羅的な調査

## 調査方法

1. **公式ドキュメント確認**
   - Chrome Extension API Reference
   - W3C WebAuthn Specification
   - MDN Web Docs

2. **既存実装の調査**
   - GitHub でのオープンソースパスワードマネージャー拡張
   - Chrome Web Store での類似拡張の調査

3. **プロトタイプ実装**
   - 最小限のコードで各技術要素を検証
   - ./tmp/ に検証用コードを作成

4. **技術記事・フォーラム**
   - Stack Overflow
   - Chrome Extensions Google Group
   - WebAuthn community

## 優先順位

### 高（実装の可否に関わる）
1. Chrome拡張でのWebAuthn API使用
2. 暗号化鍵の永続化と再利用

### 中（実装方式に影響）
3. Chrome Storage APIでの大容量データ保存
4. Content ScriptでのUIインジェクション
7. Vite + Vue.js でのChrome拡張ビルド

### 低（機能拡張時に必要）
5. スクリーンショットAPI
6. Canvas でのトリミングUI

## 次のステップ

優先度の高い項目から調査を開始し、結果を docs/research/ に記録する。

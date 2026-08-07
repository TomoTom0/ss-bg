# ボタン系クラスの popup/options 重複定義

## 現状

`.btn`, `.btn-primary`, `.btn-danger`, `.btn-secondary`, `.btn-warning`, `.btn-sm` などのボタン系クラスが `src/popup/App.vue` と `src/options/App.vue` で重複定義されている。

- `src/styles/theme.css` には `--color-btn-*` 変数のみ定義され、`.btn` 系クラス定義はない。
- `.btn-warning` に至っては popup 側がハードコード（`#ff9800`）、options 側が変数参照（`var(--color-btn-warning)`）と不統一。

TASK-57 で options 側に `.btn-warning` を追加した際、popup との重複が顕在化した。

## 問題点

- ボタン配色変更時に popup と options の両ファイルを更新する必要がある。
- popup と options で定義方式（ハードコード vs 変数）が混在し、保守性が低い。
- 新しいバリアント追加時に両ページへのコピペが発生する。

## 改善案

`.btn` 系クラス（レイアウト + 配色）を `src/styles/theme.css` にグローバル定義し、popup と options で共有する。各 `App.vue` からは該当定義を削除し、theme.css を参照するよう統一。配色は既存の `--color-btn-*` 変数で一元管理。

## 優先度

low

## 関連

- タスク: TASK-57
- 関連ファイル: `src/popup/App.vue`, `src/options/App.vue`, `src/styles/theme.css`

# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

- キーボードショートカットが動作しない問題を修正: manifest の commands に既定ショートカット（suggested_key）が未定義で、全コマンドが未割り当てだった。`Ctrl+Shift+S`（スクリーンショット、README 記載の従来案内どおり）、`Ctrl+Shift+F`（自動入力）、`Ctrl+Shift+1` / `Ctrl+Shift+2`（お気に入り 1 / 2）を既定として追加。Chrome の仕様で既定ショートカットは最大4つのため、お気に入り 3 は `chrome://extensions/shortcuts` での手動設定とする

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

（変更内容をここに記載）

## Internal Improvements

- テストスイートが正常終了しない問題の修正
  - content.test.ts: `done` コールバック形式のテスト（動的フォーム対応）を async/await 形式に移行。Vitest 4 では `done` コールバックが非推奨で Unhandled Error となり、全テスト合格でも終了コードが 1 になっていた

## Known Issues

（変更内容をここに記載）

# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

（変更内容をここに記載）

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

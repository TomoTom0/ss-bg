# usage 索引

bg-ss の利用者向け文書の索引。各トピックは「画面で実際にできること」だけを書いた利用者向けガイドで、開発者向けの仕様・設計は [docs/README.md](../README.md) 側の文書が正本。

## トピック

読む順に並べる。

| order | ファイル | 内容 |
|---|---|---|
| 1 | [usage_getting-started.md](usage_getting-started.md) | 概要、必要要件、インストール、初回設定（初期設定と認証）、Popup |
| 2 | [usage_options.md](usage_options.md) | 設定（Options）ページの4タブ（General / Auth / Screenshot / Others）、保存済み情報の追加・編集・削除 |
| 3 | [usage_autofill-screenshot.md](usage_autofill-screenshot.md) | 自動入力、フォームの保存、お気に入り、スクリーンショット、キーボードショートカット |

## 書き方

- 実装済みの機能だけを書く。今後の予定は書かない
- 操作名は画面の表記をそのまま引用する
- 手順は短く書き、開発側の仕組み（API・暗号化方式の詳細等）には触れない。仕組みの説明が必要な場合は開発者向け文書へリンクする

## スクリーンショットについて

画像は `docs/usage/images/<トピック名>/` に WebP で置き、本文から相対リンクで参照する。

撮影できなかった画面は捏造せず、各トピック末尾の「未撮影の画面」に理由を明記する。未撮影分の一覧は [store-listing.md](../chrome-store/store-listing.md) の「Usage 画像一覧」にも集約している。

# CHANGELOG

このプロジェクトの変更履歴を管理します。

## 構成

```
docs/changelog/
├── README.md           # このファイル
├── unreleased.md       # 未リリースの変更
├── 0.1.1.md           # バージョン 0.1.1 の変更
└── ...
```

## 更新タイミング

リリース時に以下を実行：
1. `unreleased.md` の内容を `<version>.md` に移動
2. `update-version` コマンドでバージョン更新
3. `unreleased.md` を空にする

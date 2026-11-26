# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

- 「すべて入力」が何も入力せず無言で失敗する不具合の修正
  - 原因: content script はピッカー起動時に都度注入されるため、注入前にフォーカスしたフィールドは focusin で追跡されず、`handleFillPassword` が対象フォームを特定できなかった。さらに、その際に出すエラーダイアログが、ボタン側の `closeDialog()` によって即座に閉じられ、失敗が見えなかった
  - content.ts (showPasswordDialog): フォーカス中のフィールドを `lastFocusedInput` へ保持するよう修正
  - content.ts (handleFillPassword): `lastFocusedInput` がない場合にフォーカス中のフィールドへフォールバック（`handleFillField` と同じ扱い）
  - content.ts (showFieldSelectionDialog): 入力処理がエラーダイアログへ切り替えた場合は、そのダイアログを閉じないよう修正
  - fill-password.test.ts: 注入前フォーカスの回帰テストを追加

- PRF が使える環境でも prfEnabled が false のままになる不具合の修正
  - 原因: 登録時の `getClientExtensionResults().prf.enabled` が Chrome + Windows Hello では得られないことがあり、実際には PRF 評価が可能な credential でも未対応と記録されていた（実機で、作成済み credential への get で `prf.results.first` が返ることを確認）
  - webauthn.ts (authenticate): ボールトがまだ存在しない場合に限り PRF 評価を試し、成功したら `prfEnabled: true` を保存して PRF を採用するよう修正。既存ボールトは署名ベースの鍵で暗号化されているため、従来どおり署名認証を維持し、鍵の切り替えによる復号不能を避ける
  - webauthn.test.ts: PRF 採用・既存ボールト時の署名維持・PRF 失敗時のフォールバックのテストを追加

- 既定設定でスクリーンショットが常に失敗する不具合の修正
  - 原因: offscreen ページ（クリップボードコピー用）が crxjs のビルド対象に含まれず、dist に含まれていなかったため、`chrome.offscreen.createDocument` が失敗し、ダウンロード処理まで到達しなかった
  - vite.config.ts: offscreen ページを rollup の入力へ明示的に追加し、dist/src/offscreen/index.html が生成されるよう修正
  - background.ts (handleTakeScreenshot): クリップボードコピーの失敗時もダウンロードを継続するよう例外処理を分離
  - extension.spec.ts: offscreen HTML の生成チェックを追加
  - background.test.ts: クリップボードコピー失敗時もダウンロードされるテストを追加
  - レビュー指摘への対応: ダウンロード無効時はクリップボードコピーの失敗を成功として扱わず、エラーを返すよう修正（コピーもダウンロードも行われなかったのに成功になる問題）。対応するテストも追加

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

（変更内容をここに記載）

## Internal Improvements

（変更内容をここに記載）

## Known Issues

（変更内容をここに記載）

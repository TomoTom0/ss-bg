/**
 * Content scriptのエントリーポイント
 * executeScriptで動的に実行するためのもの
 */

// content.tsのinitialize関数をインポート
import { initialize } from './content';

/**
 * Content scriptを初期化
 * この関数がexecuteScriptで呼ばれる
 */
export function main(): void {
  console.log('[bg-ss] Content script injected and initialized');
  try {
    initialize();
    console.log('[bg-ss] Content script initialization complete');
  } catch (error) {
    console.error('[bg-ss] Content script initialization failed:', error);
  }
}

// スクリプトが読み込まれたときに自動的に初期化を実行
console.log('[bg-ss] content-exports.js loaded');
main();

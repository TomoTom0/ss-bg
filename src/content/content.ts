import type { Message } from '@/types/message';
import type { PasswordEntry, FavoriteFieldMapping } from '@/types/storage';
import { getFocusedInput, generateSelector, detectFieldType } from '@/utils/field-detector';
import { captureFormData, detectForms } from './form-detector';
import { normalizeUrl, matchUrl } from '@/utils/url-matcher';
import { calculateUrlMatchScore, rankEntriesForDialog, isRecentlyUsed, URL_MATCH_HIGHLIGHT_THRESHOLD } from '@/utils/url-sorter';

// 機密値のマスク文字列と、ピーク表示の自動非表示時間（5分）
const SS_MASK_TEXT = '••••••••';
const SS_REVEAL_AUTO_HIDE_MS = 5 * 60 * 1000;

// ピークボタンの目アイコン（SVG。絵文字不使用のためインラインSVG）
const SS_EYE_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const SS_EYE_OFF_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// 右クリックされた入力フィールド
let lastFocusedInput: HTMLInputElement | null = null;

// ダイアログ要素
let dialogOverlay: HTMLDivElement | null = null;
let dialogContent: HTMLDivElement | null = null;
let dialogShadowHost: HTMLDivElement | null = null;
let dialogShadowRoot: ShadowRoot | null = null;

// ダイアログオープン前のフォーカス要素（復元用）
let activeElementBeforeDialog: HTMLElement | null = null;

// ハイライト要素
let highlightElements: HTMLDivElement[] = [];

// ハイライト用のCSSクラス名
const HIGHLIGHT_CLASS = 'ss-bg-highlight-target';

// お気に入り登録モード（null=通常モード、1~3=登録モード）
let favoriteRegisterSlot: 1 | 2 | 3 | null = null;

/**
 * テーマ設定を取得
 */
async function getThemeSetting(): Promise<'light' | 'dark' | 'auto'> {
  try {
    const result = await chrome.storage.local.get('settings') as { settings?: { theme?: 'light' | 'dark' | 'auto' } };
    return result.settings?.theme || 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * テーマ設定に基づいてダークモードかどうかを判定
 */
async function isDarkModeEnabled(): Promise<boolean> {
  const theme = await getThemeSetting();
  if (theme === 'light') return false;
  if (theme === 'dark') return true;
  // 'auto'の場合はシステム設定に従う
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Content Scriptの初期化
 */
export function initialize(): void {
  injectHighlightStyles();
  setupContextMenuListener();
  setupMessageListener();
  setupDialogListeners();
}

/**
 * ハイライト用のCSSスタイルを注入
 */
function injectHighlightStyles(): void {
  if (document.getElementById('ss-bg-highlight-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ss-bg-highlight-styles';
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * ダイアログのイベントリスナーを設定
 */
function setupDialogListeners(): void {
  // Escapeキーでダイアログを閉じる（明示的な閉じ操作のみ）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialogShadowHost) {
      closeDialog();
    }
  });
  
  // フォーカス追跡（記録のみ）
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      const isInDialog = dialogShadowRoot && dialogShadowRoot.contains(target);
      if (!isInDialog) {
        lastFocusedInput = target as HTMLInputElement;
      }
    }
  });
}

/**
 * ダイアログの最適な配置位置を計算
 */
function calculateDialogPosition(inputRect: DOMRect): { top: number; left: number } {
  const dialogWidth = 350;
  const dialogHeight = 300;
  const margin = 10;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 右側のスペースをチェック
  const spaceRight = viewportWidth - inputRect.right;
  if (spaceRight >= dialogWidth + margin) {
    return {
      left: inputRect.right + margin,
      top: Math.max(margin, Math.min(inputRect.top, viewportHeight - dialogHeight - margin))
    };
  }

  // 左側のスペースをチェック
  const spaceLeft = inputRect.left;
  if (spaceLeft >= dialogWidth + margin) {
    return {
      left: inputRect.left - dialogWidth - margin,
      top: Math.max(margin, Math.min(inputRect.top, viewportHeight - dialogHeight - margin))
    };
  }

  // 下側のスペースをチェック
  const spaceBelow = viewportHeight - inputRect.bottom;
  if (spaceBelow >= dialogHeight + margin) {
    return {
      left: Math.max(margin, Math.min(inputRect.left, viewportWidth - dialogWidth - margin)),
      top: inputRect.bottom + margin
    };
  }

  // 上側に配置
  return {
    left: Math.max(margin, Math.min(inputRect.left, viewportWidth - dialogWidth - margin)),
    top: Math.max(margin, inputRect.top - dialogHeight - margin)
  };
}

/**
 * ダイアログ共通CSS
 */
function getDialogStyles(): string {
  // ダークモード変数（明示的ダーク指定とauto/システムダークで共用）
  const darkVariables = `
      --color-bg-primary: #1e1e1e;
      --color-bg-secondary: #2d2d2d;
      --color-bg-tertiary: #252525;
      --color-bg-elevated: #333333;
      --color-bg-input: #2d2d2d;
      --color-text-primary: #e0e0e0;
      --color-text-secondary: #b0b0b0;
      --color-text-tertiary: #888888;
      --color-border-light: #333333;
      --color-border-medium: #444444;
      --color-btn-primary: #4CAF50;
      --color-btn-primary-hover: #66bb6a;
      --color-btn-danger: #f44336;
      --color-btn-danger-hover: #ef5350;
      --color-btn-default: #424242;
      --color-btn-default-hover: #616161;
      --color-dialog-bg: rgba(30, 30, 30, 0.95);
      --color-dialog-text: #e0e0e0;
      --color-dialog-border: #444444;
      --color-success-bg: #1b5e20;
      --color-success-text: #a5d6a7;
      --color-favorite-bg: #4e342e;
      --color-favorite-border: #FFB300;
      --color-favorite-text: #ffb74d;
      --color-favorite-hover-bg: #3e2723;
      --color-focus-ring: #4CAF50;
    `;

  return `
    :host {
      --color-bg-primary: #ffffff;
      --color-bg-secondary: #f9f9f9;
      --color-bg-tertiary: #f5f5f5;
      --color-bg-elevated: #ffffff;
      --color-bg-input: #ffffff;
      --color-text-primary: #333333;
      --color-text-secondary: #666666;
      --color-text-tertiary: #999999;
      --color-border-light: #eeeeee;
      --color-border-medium: #cccccc;
      --color-btn-primary: #4CAF50;
      --color-btn-primary-hover: #45a049;
      --color-btn-danger: #f44336;
      --color-btn-danger-hover: #d32f2f;
      --color-btn-default: #f5f5f5;
      --color-btn-default-hover: #e0e0e0;
      --color-dialog-bg: rgba(255, 255, 255, 0.95);
      --color-dialog-text: #333333;
      --color-dialog-border: #cccccc;
      --color-success-bg: #e8f5e9;
      --color-success-text: #2e7d32;
      --color-favorite-bg: #FFF8E1;
      --color-favorite-border: #FFB300;
      --color-favorite-text: #E65100;
      --color-favorite-hover-bg: #FFFDE7;
      --color-focus-ring: #4CAF50;
    }

    /* 明示的にダーク指定された場合 */
    :host[data-theme='dark'] {
      ${darkVariables.trim()}
    }

    /* auto（システム設定）の場合のみ、OS設定に従う */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme='light']):not([data-theme='dark']) {
        ${darkVariables.trim()}
      }
    }

    .ss-bg-dialog-content {
      background: var(--color-dialog-bg);
      color: var(--color-dialog-text);
      backdrop-filter: blur(2px);
      border: 1px solid var(--color-dialog-border);
      border-radius: 4px;
      padding: 8px;
      max-width: 350px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
    }
    .ss-bg-empty-message {
      color: var(--color-text-tertiary);
      text-align: center;
      padding: 12px;
      font-size: 13px;
    }
    .ss-bg-password-item {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
    }
    .ss-bg-password-item:hover {
      background: var(--color-bg-tertiary);
    }
    /* URL一致（このサイト）強調 */
    .ss-bg-password-item--url-match {
      background: var(--color-success-bg);
      box-shadow: inset 3px 0 0 var(--color-btn-primary);
    }
    /* 最近使用の控えめマーカー */
    .ss-bg-password-item--recent {
      box-shadow: inset 3px 0 0 var(--color-border-medium);
    }
    .ss-bg-item-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .ss-bg-item-title-text {
      flex: 1;
      min-width: 0;
      font-weight: 600;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-item-badge {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .ss-bg-item-badge--url {
      background: var(--color-btn-primary);
      color: #ffffff;
    }
    .ss-bg-item-badge--recent {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-medium);
    }
    .ss-bg-item-username {
      font-size: 12px;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-cancel-btn {
      width: 100%;
      padding: 6px;
      margin-top: 4px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .ss-bg-cancel-btn:hover {
      background: var(--color-btn-default-hover);
    }
    .ss-bg-field-button {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-field-button:hover {
      background: var(--color-bg-tertiary);
    }
    .ss-bg-instruction {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      font-size: 12px;
      color: var(--color-text-secondary);
      background: var(--color-bg-secondary);
      border-radius: 2px;
    }
    .ss-bg-fields-container {
      margin-bottom: 8px;
    }
    .ss-bg-field-row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
    }
    .ss-bg-name-input {
      flex: 1;
      padding: 4px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-value-input {
      flex: 2;
      padding: 4px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-selector-input {
      flex: 3;
      padding: 4px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-remove-btn {
      padding: 4px 8px;
      background: var(--color-btn-danger);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    .ss-bg-remove-btn:hover {
      background: var(--color-btn-danger-hover);
    }
    .ss-bg-value-wrap {
      display: flex;
      gap: 4px;
      align-items: center;
      flex: 2;
      min-width: 0;
    }
    .ss-bg-value-wrap .ss-bg-value-input {
      flex: 1;
      min-width: 0;
    }
    .ss-bg-peek-btn {
      padding: 4px 6px;
      border: 1px solid var(--color-border-medium);
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
    }
    .ss-bg-peek-btn:hover {
      background: var(--color-border-medium);
    }
    .ss-bg-sensitive-label {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      color: var(--color-text-secondary);
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }
    .ss-bg-save-btn {
      width: 100%;
      padding: 8px;
      background: var(--color-btn-primary);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }
    .ss-bg-save-btn:hover {
      background: var(--color-btn-primary-hover);
    }
    .ss-bg-back-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: var(--color-text-secondary);
    }
    .ss-bg-back-btn:hover {
      background: var(--color-btn-default-hover);
    }
    .ss-bg-title-bar {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      border-bottom: 1px solid var(--color-border-light);
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ss-bg-title-text {
      font-weight: 600;
      font-size: 13px;
      color: var(--color-text-primary);
    }
    .ss-bg-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--color-text-tertiary);
      padding: 0 4px;
      line-height: 1;
    }
    .ss-bg-close-btn:hover {
      color: var(--color-text-primary);
    }
    .ss-bg-favorite-bar {
      display: flex;
      gap: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--color-border-light);
    }
    .ss-bg-favorite-star {
      width: 28px;
      height: 28px;
      background: none;
      border: 1px solid var(--color-border-medium);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
      color: var(--color-text-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-favorite-star:hover {
      border-color: var(--color-favorite-border);
      color: var(--color-favorite-border);
      background: var(--color-favorite-hover-bg);
    }
    .ss-bg-favorite-star.active {
      border-color: var(--color-favorite-border);
      background: var(--color-favorite-bg);
      color: var(--color-favorite-text);
    }
    .ss-bg-favorite-star.registered {
      border-color: var(--color-favorite-border);
      color: var(--color-favorite-border);
    }
    .ss-bg-favorite-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
      align-self: center;
      margin-left: 4px;
    }
    .ss-bg-favorite-register-indicator {
      padding: 4px 8px;
      margin-bottom: 4px;
      background: var(--color-favorite-bg);
      border: 1px solid var(--color-favorite-border);
      border-radius: 2px;
      font-size: 11px;
      color: var(--color-favorite-text);
      text-align: center;
    }
    .ss-bg-form-group {
      margin-bottom: 8px;
    }
    .ss-bg-form-label {
      display: block;
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }
    .ss-bg-form-input {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 13px;
      box-sizing: border-box;
      background: var(--color-bg-input);
    }
    .ss-bg-form-input:focus {
      outline: none;
      border-color: var(--color-focus-ring);
    }
    .ss-bg-form-textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 13px;
      box-sizing: border-box;
      resize: vertical;
      min-height: 40px;
      background: var(--color-bg-input);
    }
    .ss-bg-form-textarea:focus {
      outline: none;
      border-color: var(--color-focus-ring);
    }
    .ss-bg-password-item-row {
      display: flex;
      gap: 2px;
      margin-bottom: 2px;
      align-items: stretch;
    }
    .ss-bg-password-item-row .ss-bg-password-item {
      flex: 1;
      margin-bottom: 0;
    }
    .ss-bg-edit-btn {
      width: 32px;
      min-width: 32px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-edit-btn:hover {
      background: var(--color-btn-default-hover);
      color: var(--color-text-primary);
    }
    .ss-bg-success-message {
      color: var(--color-success-text);
      background: var(--color-success-bg);
      padding: 8px;
      border-radius: 2px;
      margin-top: 4px;
      font-size: 12px;
      text-align: center;
    }
  `;
}

/**
 * パスワード選択ダイアログを表示
 */
async function showPasswordDialog(candidates: PasswordEntry[], tabId: number): Promise<void> {
  // 既存のダイアログがあれば、何もせず終了（消さない）
  if (dialogShadowHost) {
    return;
  }

  // 最後にフォーカスされた入力欄の位置を取得
  const targetInput = lastFocusedInput || document.activeElement as HTMLInputElement;
  if (!targetInput || (targetInput.tagName !== 'INPUT' && targetInput.tagName !== 'TEXTAREA')) {
    const firstInput = document.querySelector('input[type="password"], input[type="text"], input[type="email"]') as HTMLInputElement;
    if (!firstInput) return;
    lastFocusedInput = firstInput;
  }

  const rect = (lastFocusedInput || targetInput).getBoundingClientRect();
  const dialogPos = calculateDialogPosition(rect);
  
  // Shadow DOMホストを作成
  dialogShadowHost = document.createElement('div');
  dialogShadowHost.id = 'ss-bg-dialog-host';
  dialogShadowHost.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `;
  
  // Shadow DOMを作成してページのCSSから隔離
  dialogShadowRoot = dialogShadowHost.attachShadow({ mode: 'closed' });
  
  // CSSを注入
  const styleEl = document.createElement('style');
  styleEl.textContent = getDialogStyles();
  dialogShadowRoot.appendChild(styleEl);
  
  // ダイアログコンテンツを作成
  dialogContent = document.createElement('div');
  dialogContent.className = 'ss-bg-dialog-content';

  // テーマ設定に基づいてhostのdata-themeと外観色を決定
  const theme = await getThemeSetting();
  if (theme === 'light' || theme === 'dark') {
    dialogShadowHost.setAttribute('data-theme', theme);
  }
  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dialogBg = isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const dialogText = isDarkMode ? '#e0e0e0' : '#333333';
  const dialogBorder = isDarkMode ? '#444444' : '#cccccc';

  dialogContent.style.cssText = `
    position: absolute;
    top: ${dialogPos.top}px;
    left: ${dialogPos.left}px;
    background: ${dialogBg};
    color: ${dialogText};
    backdrop-filter: blur(2px);
    border: 1px solid ${dialogBorder};
    border-radius: 4px;
    padding: 8px;
    width: 250px;
    max-width: 350px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
  `;
  
  // タイトルバー
  const titleBar = createTitleBar('パスワードを選択', () => closeDialog());
  dialogContent.appendChild(titleBar);

  // お気に入り星バー
  const favoriteBar = await createFavoriteBar();
  dialogContent.appendChild(favoriteBar);

  // お気に入り登録モード表示
  if (favoriteRegisterSlot !== null) {
    const indicator = document.createElement('div');
    indicator.className = 'ss-bg-favorite-register-indicator';
    indicator.textContent = `お気に入り ${favoriteRegisterSlot} に登録します`;
    dialogContent.appendChild(indicator);
  }

  // 候補リスト
  if (candidates.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '候補が見つかりません';
    empty.className = 'ss-bg-empty-message';
    dialogContent.appendChild(empty);
  } else {
    // URL一致スコア → 最近使用 → タイトル でランキング
    const currentUrl = window.location.href;
    const ranked = rankEntriesForDialog(currentUrl, candidates);
    const now = Date.now();
    ranked.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'ss-bg-password-item-row';

      const item = document.createElement('button');
      item.className = 'ss-bg-password-item';

      // 強調: URL一致（このサイト）/ 最近使用
      const isUrlMatch = calculateUrlMatchScore(currentUrl, entry) >= URL_MATCH_HIGHLIGHT_THRESHOLD;
      const recent = isRecentlyUsed(entry, now);
      if (isUrlMatch) item.classList.add('ss-bg-password-item--url-match');
      else if (recent) item.classList.add('ss-bg-password-item--recent');

      const itemTitle = document.createElement('div');
      itemTitle.className = 'ss-bg-item-title';
      const titleText = document.createElement('span');
      titleText.className = 'ss-bg-item-title-text';
      titleText.textContent = entry.title;
      itemTitle.appendChild(titleText);
      if (isUrlMatch) {
        const badge = document.createElement('span');
        badge.className = 'ss-bg-item-badge ss-bg-item-badge--url';
        badge.textContent = 'このサイト';
        itemTitle.appendChild(badge);
      } else if (recent) {
        const badge = document.createElement('span');
        badge.className = 'ss-bg-item-badge ss-bg-item-badge--recent';
        badge.textContent = '最近';
        itemTitle.appendChild(badge);
      }

      const itemUsername = document.createElement('div');
      itemUsername.textContent = entry.username;
      itemUsername.className = 'ss-bg-item-username';

      item.appendChild(itemTitle);
      item.appendChild(itemUsername);

      item.addEventListener('click', async () => {
        showFieldSelectionDialog(entry, tabId);
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'ss-bg-edit-btn';
      editBtn.textContent = '\u270E'; // pencil
      editBtn.title = '編集';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEntryEditDialog(entry, tabId);
      });

      row.appendChild(item);
      row.appendChild(editBtn);
      dialogContent.appendChild(row);
    });
  }
  
  // キャンセルボタン
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.className = 'ss-bg-cancel-btn';
  
  cancelBtn.addEventListener('click', closeDialog);
  dialogContent.appendChild(cancelBtn);
  
  dialogShadowRoot.appendChild(dialogContent);
  document.body.appendChild(dialogShadowHost);
  document.body.classList.add('ss-bg-dialog-active');

  // MutationObserverで削除を監視
  const observer = new MutationObserver(() => {
    if (dialogShadowHost && !document.body.contains(dialogShadowHost)) {
      // Dialog was removed externally
    }
  });
  observer.observe(document.body, { childList: true });
  
  // 10秒後に監視停止
  setTimeout(() => observer.disconnect(), 10000);
}

/**
 * お気に入り星バーを作成
 */
async function createFavoriteBar(): Promise<HTMLDivElement> {
  const bar = document.createElement('div');
  bar.className = 'ss-bg-favorite-bar';

  const label = document.createElement('span');
  label.className = 'ss-bg-favorite-label';
  label.textContent = 'お気に入り:';
  bar.appendChild(label);

  // 現在のドメインのお気に入り状態を取得
  const domain = window.location.hostname;
  let registeredSlots: number[] = [];
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_FAVORITES',
      payload: { domain }
    });
    if (response.success && Array.isArray(response.data)) {
      registeredSlots = response.data.map((f: { slot: number }) => f.slot);
    }
  } catch {
    // ignore
  }

  for (let i = 1; i <= 3; i++) {
    const slot = i as 1 | 2 | 3;
    const star = document.createElement('button');
    star.className = 'ss-bg-favorite-star';
    if (registeredSlots.includes(slot)) {
      star.classList.add('registered');
    }
    if (favoriteRegisterSlot === slot) {
      star.classList.add('active');
    }
    star.textContent = `${slot}`;
    star.title = registeredSlots.includes(slot)
      ? `お気に入り ${slot} (登録済み) - クリックで登録モード切替`
      : `お気に入り ${slot} - クリックで登録モード`;

    star.addEventListener('click', (e) => {
      e.stopPropagation();
      if (favoriteRegisterSlot === slot) {
        favoriteRegisterSlot = null;
      } else {
        favoriteRegisterSlot = slot;
      }
      // バー内の星ボタンのactive状態を更新
      const stars = bar.querySelectorAll('.ss-bg-favorite-star');
      stars.forEach((s, idx) => {
        s.classList.toggle('active', idx + 1 === favoriteRegisterSlot);
      });
      // インジケーターを更新
      updateFavoriteIndicator();
    });

    bar.appendChild(star);
  }

  return bar;
}

/**
 * お気に入り登録モードのインジケーターを更新
 */
function updateFavoriteIndicator(): void {
  if (!dialogContent || !dialogShadowRoot) return;

  // 既存のインジケーターを削除
  const existing = dialogContent.querySelector('.ss-bg-favorite-register-indicator');
  if (existing) {
    existing.remove();
  }

  if (favoriteRegisterSlot !== null) {
    const indicator = document.createElement('div');
    indicator.className = 'ss-bg-favorite-register-indicator';
    indicator.textContent = `お気に入り ${favoriteRegisterSlot} に登録します`;
    // 星バーの後に挿入
    const favoriteBar = dialogContent.querySelector('.ss-bg-favorite-bar');
    if (favoriteBar && favoriteBar.nextSibling) {
      dialogContent.insertBefore(indicator, favoriteBar.nextSibling);
    } else {
      dialogContent.appendChild(indicator);
    }
  }
}

/**
 * お気に入り動作を保存
 */
async function saveFavoriteAction(
  slot: 1 | 2 | 3,
  entry: PasswordEntry,
  mappings: FavoriteFieldMapping[]
): Promise<boolean> {
  const domain = window.location.hostname;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_FAVORITE',
      payload: {
        slot,
        domain,
        entryId: entry.id,
        mappings,
        createdAt: Date.now()
      }
    });
    return response.success;
  } catch {
    return false;
  }
}

/**
 * セレクタを使ってお気に入り動作を実行（マッピングベース）
 */
function executeFavoriteMapping(entry: PasswordEntry, mappings: FavoriteFieldMapping[]): void {
  for (const mapping of mappings) {
    const element = document.querySelector(mapping.selector) as HTMLInputElement;
    if (!element) continue;

    let value: string | undefined;
    if (mapping.source === 'username') {
      value = entry.username;
    } else if (mapping.source === 'password') {
      value = entry.password;
    } else if (mapping.source.startsWith('additional:')) {
      const index = parseInt(mapping.source.split(':')[1], 10);
      value = entry.additionalFields?.[index]?.value;
    }

    if (value !== undefined) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // 最近使用として記録
  markEntryUsed(entry);
}

/**
 * フィールド編集ダイアログを表示
 */
function showFieldEditorDialog(entry: PasswordEntry, tabId: number): void {
  if (!dialogContent) return;
  
  // ダイアログの内容をクリア
  dialogContent.innerHTML = '';
  
  // タイトルバー
  const titleBar = createTitleBar(entry.title, () => closeDialog());
  dialogContent.appendChild(titleBar);
  
  const instruction = document.createElement('div');
  instruction.textContent = '追加フィールドを編集';
  instruction.className = 'ss-bg-instruction';
  dialogContent.appendChild(instruction);
  
  // 編集可能なフィールドリスト
  const fieldsContainer = document.createElement('div');
  fieldsContainer.className = 'ss-bg-fields-container';
  fieldsContainer.style.maxHeight = '250px';
  fieldsContainer.style.overflowY = 'auto';
  
  const additionalFields = entry.additionalFields || [];
  const fieldInputs: Array<{ nameInput: HTMLInputElement; valueInput: HTMLInputElement; selectorInput: HTMLInputElement; sensitiveInput: HTMLInputElement }> = [];

  additionalFields.forEach((field) => {
    const { row, inputs } = createAdditionalFieldRow(field.name, field.value, field.selector || '', field.sensitive === true, fieldInputs, fieldsContainer);
    fieldsContainer.appendChild(row);
    fieldInputs.push(inputs);
  });

  dialogContent.appendChild(fieldsContainer);

  // フィールド追加ボタン
  const addBtn = createFieldButton('+ フィールドを追加', () => {
    const { row, inputs } = createAdditionalFieldRow('', '', '', false, fieldInputs, fieldsContainer);
    fieldsContainer.appendChild(row);
    fieldInputs.push(inputs);
  });
  addBtn.style.background = '#e3f2fd';
  addBtn.style.color = '#1976d2';
  dialogContent.appendChild(addBtn);
  
  // 保存ボタン
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.className = 'ss-bg-save-btn';
  saveBtn.addEventListener('click', async () => {
    const updatedFields = fieldInputs
      .map(inputs => ({
        name: inputs.nameInput.value.trim(),
        value: inputs.valueInput.value.trim(),
        selector: inputs.selectorInput.value.trim(),
        sensitive: inputs.sensitiveInput.checked
      }))
      .filter(f => f.name && f.value);
    
    const updatedEntry = {
      ...entry,
      additionalFields: updatedFields.length > 0 ? updatedFields : undefined,
      updatedAt: Date.now()
    };
    
    // Backgroundに更新を依頼（既存エントリの上書き）
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_PASSWORD',
      payload: { id: entry.id, entry: updatedEntry }
    });
    
    if (response.success) {
      showFieldSelectionDialog(updatedEntry, tabId);
    } else {
      const errorMsg = document.createElement('div');
      errorMsg.textContent = '保存に失敗しました: ' + (response.error || '不明なエラー');
      errorMsg.style.cssText = `
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `;
      dialogContent.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.remove();
      }, 3000);
    }
  });
  dialogContent.appendChild(saveBtn);
  
  // 戻るボタン
  const backBtn = createFieldButton('戻る', () => {
    showFieldSelectionDialog(entry, tabId);
  });
  backBtn.className = 'ss-bg-back-btn';
  dialogContent.appendChild(backBtn);
}

/**
 * タイトルバーを作成（DRY原則）
 */
function createTitleBar(titleText: string, onClose: () => void): HTMLDivElement {
  const titleBar = document.createElement('div');
  titleBar.className = 'ss-bg-title-bar';
  
  const title = document.createElement('div');
  title.textContent = titleText;
  title.className = 'ss-bg-title-text';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'ss-bg-close-btn';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClose();
  });
  
  titleBar.appendChild(title);
  titleBar.appendChild(closeBtn);
  
  // ドラッグ機能
  setupDrag(titleBar, closeBtn);
  
  return titleBar;
}

/**
 * ダイアログのドラッグ機能をセットアップ
 */
function setupDrag(titleBar: HTMLElement, excludeElement: HTMLElement): void {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dialogStartX = 0;
  let dialogStartY = 0;
  
  titleBar.addEventListener('mousedown', (e) => {
    if (e.target === excludeElement) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = dialogContent!.getBoundingClientRect();
    dialogStartX = rect.left;
    dialogStartY = rect.top;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging && dialogContent) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      dialogContent.style.left = `${dialogStartX + deltaX}px`;
      dialogContent.style.top = `${dialogStartY + deltaY}px`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * フィールド選択ダイアログを表示
 */
function showFieldSelectionDialog(entry: PasswordEntry, tabId: number): void {
  if (!dialogContent) return;
  
  // ダイアログの内容をクリア
  dialogContent.innerHTML = '';
  
  // タイトルバー
  const titleBar = createTitleBar(entry.title, () => closeDialog());
  dialogContent.appendChild(titleBar);
  
  const instruction = document.createElement('div');
  instruction.textContent = '入力する項目を選択';
  instruction.className = 'ss-bg-instruction';
  dialogContent.appendChild(instruction);
  
  // 追加フィールド編集ボタン
  const editFieldsBtn = createFieldButton('✏️ フィールドを編集...', () => {
    showFieldEditorDialog(entry, tabId);
  });
  editFieldsBtn.style.background = '#fff3e0';
  editFieldsBtn.style.color = '#e65100';
  editFieldsBtn.style.marginBottom = '12px';
  dialogContent.appendChild(editFieldsBtn);
  
  // すべて入力ボタン
  const allBtn = createFieldButton('すべて入力 (ユーザー名 + パスワード)', async () => {
    await handleFillPassword(entry);
    closeDialog();
  });
  
  // ホバー時にフィールドをハイライト
  allBtn.addEventListener('mouseenter', () => {
    highlightTargetFields(entry);
  });
  allBtn.addEventListener('mouseleave', () => {
    removeAllHighlights();
  });
  
  dialogContent.appendChild(allBtn);
  
  // ユーザー名ボタン
  if (entry.username) {
    const usernameBtn = createFieldButton(`ユーザー名: ${entry.username}`, () => {
      handleFillField({ value: entry.username }, entry, 'username');
    });
    usernameBtn.addEventListener('mouseenter', () => {
      if (lastFocusedInput) {
        highlightElement(lastFocusedInput);
      }
    });
    usernameBtn.addEventListener('mouseleave', () => {
      removeAllHighlights();
    });
    dialogContent.appendChild(usernameBtn);
  }

  // パスワードボタン
  if (entry.password) {
    const passwordBtn = createFieldButton('パスワード: ••••••••', () => {
      handleFillField({ value: entry.password }, entry, 'password');
    });
    passwordBtn.addEventListener('mouseenter', () => {
      if (lastFocusedInput) {
        highlightElement(lastFocusedInput);
      }
    });
    passwordBtn.addEventListener('mouseleave', () => {
      removeAllHighlights();
    });
    dialogContent.appendChild(passwordBtn);
  }

  // 追加フィールド
  if (entry.additionalFields) {
    entry.additionalFields.forEach((field, index) => {
      const fieldBtn = createFieldButton(`${field.name}: ${field.sensitive ? SS_MASK_TEXT : field.value}`, () => {
        handleFillField({ value: field.value }, entry, `additional:${index}`);
      });
      fieldBtn.addEventListener('mouseenter', () => {
        if (lastFocusedInput) {
          highlightElement(lastFocusedInput);
        }
      });
      fieldBtn.addEventListener('mouseleave', () => {
        removeAllHighlights();
      });
      dialogContent.appendChild(fieldBtn);
    });
  }
  
  // 戻るボタン
  const backBtn = document.createElement('button');
  backBtn.textContent = '戻る';
  backBtn.className = 'ss-bg-back-btn';
  
  backBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PASSWORDS' });
    if (response.success && response.data) {
      const currentLastFocused = lastFocusedInput;
      closeDialog();
      lastFocusedInput = currentLastFocused;
      await showPasswordDialog(response.data, tabId);
    } else {
      console.error('[SS-BG] Failed to get passwords for back button:', response.error);
      closeDialog();
    }
  });
  
  dialogContent.appendChild(backBtn);
  
  // 初期状態で最後にフォーカスされた入力フィールドをハイライト
  if (lastFocusedInput) {
    highlightElement(lastFocusedInput);
  }
}

/**
 * フィールド選択ボタンを作成
 */
function createFieldButton(text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = 'ss-bg-field-button';
  
  btn.addEventListener('click', onClick);
  
  return btn;
}

/**
 * ダイアログを閉じる
 */
function closeDialog(): void {
  if (dialogShadowHost && dialogShadowHost.parentNode) {
    dialogShadowHost.parentNode.removeChild(dialogShadowHost);
  }
  document.body.classList.remove('ss-bg-dialog-active');
  removeAllHighlights();
  favoriteRegisterSlot = null;
  dialogOverlay = null;
  dialogContent = null;
  dialogShadowHost = null;
  dialogShadowRoot = null;

  // フォーカスを復元
  if (activeElementBeforeDialog && typeof activeElementBeforeDialog.focus === 'function') {
    activeElementBeforeDialog.focus();
    activeElementBeforeDialog = null;
  }
}

/**
 * 要素にハイライトクラスを追加
 */
function addHighlightClass(element: HTMLElement): void {
  element.classList.add(HIGHLIGHT_CLASS);
}

/**
 * 要素からハイライトクラスを削除
 */
function removeHighlightClass(element: HTMLElement): void {
  element.classList.remove(HIGHLIGHT_CLASS);
}

/**
 * 要素をハイライト表示（視覚的なオーバーレイ）
 */
function highlightElement(element: HTMLElement): void {
  addHighlightClass(element);
  
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
    background: rgba(76, 175, 80, 0.1);
  `;
  document.body.appendChild(highlight);
  highlightElements.push(highlight);
}

/**
 * すべて入力の対象フィールドをハイライト
 */
function highlightTargetFields(entry: PasswordEntry): void {
  removeAllHighlights();
  
  const form = lastFocusedInput?.closest('form') || document.querySelector('form');
  if (!form) return;
  
  const allInputs = Array.from(form.querySelectorAll('input')) as HTMLInputElement[];
  
  // パスワードフィールドを探す
  const passwordField = allInputs.find(input => input.type === 'password' && input.offsetParent !== null);
  if (passwordField) {
    highlightElement(passwordField);
    
    // ユーザー名フィールド（パスワードの前のテキスト系input）
    const passwordIndex = allInputs.indexOf(passwordField);
    for (let i = passwordIndex - 1; i >= 0; i--) {
      const input = allInputs[i];
      const fieldType = detectFieldType(input);
      
      if ((fieldType === 'username' || fieldType === 'email' || fieldType === 'text') && 
          input.offsetParent !== null) {
        highlightElement(input);
        break;
      }
    }
  }
}

/**
 * すべてのハイライトを削除
 */
function removeAllHighlights(): void {
  // ハイライトオーバーレイを削除
  highlightElements.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  highlightElements = [];

  // ハイライトクラスを削除
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

/**
 * 既存のダイアログがあれば閉じる
 */
function closeExistingDialogIfOpen(): void {
  if (dialogShadowHost) {
    closeDialog();
  }
}

/**
 * ダイアログ用のShadow DOMホストを作成
 */
async function createDialogHost(hostId: string): Promise<void> {
  dialogShadowHost = document.createElement('div');
  dialogShadowHost.id = hostId;
  // Shadow hostにテーマを反映。ダイアログのCSSはdata-theme属性で切り替える。
  // light/darkは明示、autoは属性なし（システム設定に従う）。
  const theme = await getThemeSetting();
  if (theme === 'light' || theme === 'dark') {
    dialogShadowHost.setAttribute('data-theme', theme);
  }
  dialogShadowHost.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `;
  dialogShadowRoot = dialogShadowHost.attachShadow({ mode: 'closed' });
}

/**
 * ダイアログのCSSとコンテンツをレンダリング
 */
function renderDialogContent(css: string, contentElement: HTMLElement): void {
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  dialogShadowRoot.appendChild(styleEl);
  dialogShadowRoot.appendChild(contentElement);
  document.body.appendChild(dialogShadowHost);

  // ダイアログオープン前のフォーカス要素を保存
  activeElementBeforeDialog = document.activeElement as HTMLElement;

  // ダイアログ内の最初のフォーカス可能な要素にフォーカスを移動
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const firstFocusable = contentElement.querySelector(focusableSelector) as HTMLElement;
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // フォーカストラップ（Tabキーでダイアログ内に留める）
  const focusableElements = contentElement.querySelectorAll(focusableSelector) as NodeListOf<HTMLElement>;
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const trapFocus = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift+Tab: 最初の要素から最後の要素へ
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: 最後の要素から最初の要素へ
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  // キーダウンイベントでフォーカストラップ
  contentElement.addEventListener('keydown', trapFocus);
}

/**
 * エラーダイアログを表示
 */
async function showErrorDialog(message: string): Promise<void> {
  closeExistingDialogIfOpen();
  await createDialogHost('ss-bg-error-dialog-host');

  const dialogContent = document.createElement('div');
  dialogContent.className = 'ss-bg-error-dialog-content';
  dialogContent.setAttribute('role', 'dialog');
  dialogContent.setAttribute('aria-modal', 'true');

  const title = document.createElement('div');
  title.className = 'ss-bg-error-title';
  title.id = 'ss-bg-error-dialog-title';
  title.textContent = 'エラー';
  dialogContent.setAttribute('aria-labelledby', 'ss-bg-error-dialog-title');

  const messageEl = document.createElement('div');
  messageEl.className = 'ss-bg-error-message';
  messageEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ss-bg-error-close-btn';
  closeBtn.textContent = '閉じる';
  closeBtn.onclick = closeDialog;

  dialogContent.appendChild(title);
  dialogContent.appendChild(messageEl);
  dialogContent.appendChild(closeBtn);

  const css = `
    :host {
      --color-bg-elevated: #ffffff;
      --color-text-primary: #333333;
      --color-border-error: #d32f2f;
      --color-btn-default: #f5f5f5;
      --color-btn-default-hover: #e0e0e0;
    }

    /* 明示的にダーク指定された場合 */
    :host[data-theme='dark'] {
      --color-bg-elevated: #333333;
      --color-text-primary: #e0e0e0;
      --color-border-error: #d32f2f;
      --color-btn-default: #424242;
      --color-btn-default-hover: #616161;
    }

    /* auto（システム設定）の場合のみ、OS設定に従う */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme='light']):not([data-theme='dark']) {
        --color-bg-elevated: #333333;
        --color-text-primary: #e0e0e0;
        --color-border-error: #d32f2f;
        --color-btn-default: #424242;
        --color-btn-default-hover: #616161;
      }
    }

    .ss-bg-error-dialog-content {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border-error);
      border-radius: 4px;
      padding: 16px;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    }
    .ss-bg-error-title {
      color: var(--color-border-error);
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .ss-bg-error-message {
      color: var(--color-text-primary);
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .ss-bg-error-close-btn {
      width: 100%;
      padding: 8px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: var(--color-text-primary);
    }
    .ss-bg-error-close-btn:hover {
      background: var(--color-btn-default-hover);
    }
  `;

  renderDialogContent(css, dialogContent);
}

/**
 * 確認ダイアログを表示
 */
async function showConfirmDialog(message: string): Promise<boolean> {
  closeExistingDialogIfOpen();
  await createDialogHost('ss-bg-confirm-dialog-host');

  return new Promise<boolean>((resolve) => {
    const dialogContent = document.createElement('div');
    dialogContent.className = 'ss-bg-confirm-dialog-content';
    dialogContent.setAttribute('role', 'dialog');
    dialogContent.setAttribute('aria-modal', 'true');

    const title = document.createElement('div');
    title.className = 'ss-bg-confirm-title';
    title.id = 'ss-bg-confirm-dialog-title';
    title.textContent = '確認';
    dialogContent.setAttribute('aria-labelledby', 'ss-bg-confirm-dialog-title');

    const messageEl = document.createElement('div');
    messageEl.className = 'ss-bg-confirm-message';
    messageEl.textContent = message;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'ss-bg-confirm-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'ss-bg-confirm-btn ss-bg-confirm-cancel';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.onclick = () => {
      closeDialog();
      resolve(false);
    };

    const okBtn = document.createElement('button');
    okBtn.className = 'ss-bg-confirm-btn ss-bg-confirm-ok';
    okBtn.textContent = 'OK';
    okBtn.onclick = () => {
      closeDialog();
      resolve(true);
    };

    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(okBtn);

    dialogContent.appendChild(title);
    dialogContent.appendChild(messageEl);
    dialogContent.appendChild(buttonsContainer);

    const css = `
      :host {
        --color-bg-elevated: #ffffff;
        --color-text-primary: #333333;
        --color-border-medium: #cccccc;
        --color-btn-default: #f5f5f5;
        --color-btn-default-hover: #e0e0e0;
        --color-btn-primary: #4CAF50;
        --color-btn-primary-hover: #45a049;
        --color-text-inverse: #ffffff;
      }

      /* 明示的にダーク指定された場合 */
      :host[data-theme='dark'] {
        --color-bg-elevated: #333333;
        --color-text-primary: #e0e0e0;
        --color-border-medium: #444444;
        --color-btn-default: #424242;
        --color-btn-default-hover: #616161;
        --color-btn-primary: #4CAF50;
        --color-btn-primary-hover: #66bb6a;
        --color-text-inverse: #ffffff;
      }

      /* auto（システム設定）の場合のみ、OS設定に従う */
      @media (prefers-color-scheme: dark) {
        :host:not([data-theme='light']):not([data-theme='dark']) {
          --color-bg-elevated: #333333;
          --color-text-primary: #e0e0e0;
          --color-border-medium: #444444;
          --color-btn-default: #424242;
          --color-btn-default-hover: #616161;
          --color-btn-primary: #4CAF50;
          --color-btn-primary-hover: #66bb6a;
          --color-text-inverse: #ffffff;
        }
      }

      .ss-bg-confirm-dialog-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border-medium);
        border-radius: 4px;
        padding: 16px;
        min-width: 300px;
        max-width: 450px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        pointer-events: auto;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      }
      .ss-bg-confirm-title {
        font-weight: 600;
        margin-bottom: 12px;
        font-size: 16px;
        color: var(--color-text-primary);
      }
      .ss-bg-confirm-message {
        color: var(--color-text-primary);
        line-height: 1.6;
        margin-bottom: 16px;
        white-space: pre-wrap;
      }
      .ss-bg-confirm-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .ss-bg-confirm-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 13px;
      }
      .ss-bg-confirm-cancel {
        background: var(--color-btn-default);
        color: var(--color-text-primary);
      }
      .ss-bg-confirm-cancel:hover {
        background: var(--color-btn-default-hover);
      }
      .ss-bg-confirm-ok {
        background: var(--color-btn-primary);
        color: var(--color-text-inverse);
      }
      .ss-bg-confirm-ok:hover {
        background: var(--color-btn-primary-hover);
      }
    `;

    renderDialogContent(css, dialogContent);
  });
}

/**
 * コンテキストメニューのリスナーを設定
 */
function setupContextMenuListener(): void {
  // 入力フィールドで右クリック時に記録
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT') {
      lastFocusedInput = target as HTMLInputElement;
    }
  });
}

/**
 * backgroundからのメッセージリスナー
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {

    if (message.type === 'PING') {
      // Content scriptが注入されているか確認
      sendResponse({ pong: true });
      return true;
    } else if (message.type === 'FILL_PASSWORD') {
      handleFillPassword(message.payload);
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'FILL_FIELD') {
      handleFillField(message.payload);
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'SAVE_CURRENT_FORM') {
      handleSaveCurrentForm();
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'SHOW_PASSWORD_DIALOG') {
      // コンテキストメニューから呼ばれる
      showPasswordDialog(message.payload.candidates, message.payload.tabId)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // 非同期レスポンスを返すことを示す
    } else if (message.type === 'EXECUTE_FAVORITE') {
      // お気に入り動作を実行
      executeFavoriteMapping(message.payload.entry, message.payload.mappings);
      sendResponse({ success: true });
      return true;
    }
    return false;
  });
}

/**
 * パスワードエントリ全体を自動入力
 */
/**
 * エントリを使用した日時を記録（最近使用のランキング/強調用）。
 * lastUsedAt のみ更新し updatedAt は更新しない。fire-and-forget。
 */
export function markEntryUsed(entry: PasswordEntry): void {
  void chrome.runtime.sendMessage({
    type: 'UPDATE_PASSWORD',
    payload: { id: entry.id, entry: { ...entry, lastUsedAt: Date.now() } }
  });
}

async function handleFillPassword(entry: PasswordEntry): Promise<void> {
  const form = lastFocusedInput?.closest('form');
  if (!form) {
    await showErrorDialog('対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。');
    return;
  }

  // お気に入り登録用のマッピングを収集
  const favoriteMappings: FavoriteFieldMapping[] = [];

  // セレクタ情報がある場合はそれを使用
  if (entry.usernameSelector && entry.username) {
    const usernameField = document.querySelector(entry.usernameSelector) as HTMLInputElement;
    if (usernameField) {
      usernameField.value = entry.username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
      favoriteMappings.push({ selector: entry.usernameSelector, source: 'username' });
    }
  }

  if (entry.passwordSelector && entry.password) {
    const passwordField = document.querySelector(entry.passwordSelector) as HTMLInputElement;
    if (passwordField) {
      passwordField.value = entry.password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
      favoriteMappings.push({ selector: entry.passwordSelector, source: 'password' });
    }
  }

  // 追加フィールド
  if (entry.additionalFields) {
    entry.additionalFields.forEach((field, index) => {
      if (field.selector) {
        const element = document.querySelector(field.selector) as HTMLInputElement;
        if (element) {
          element.value = field.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          favoriteMappings.push({ selector: field.selector, source: `additional:${index}` });
        }
      }
    });
  }

  // セレクタ情報がない場合はヒューリスティック判定
  if (!entry.usernameSelector || !entry.passwordSelector) {
    const heuristicMappings = await handleFillPasswordHeuristic(entry);
    favoriteMappings.push(...heuristicMappings);
  }

  // お気に入り登録モードの場合、保存する
  if (favoriteRegisterSlot !== null && favoriteMappings.length > 0) {
    await saveFavoriteAction(favoriteRegisterSlot, entry, favoriteMappings);
    favoriteRegisterSlot = null;
  }

  // 現在のURLが登録されていない場合、URLを追加するか提案
  const updatedEntry = await suggestAddingCurrentUrl(entry);

  // 最近使用として記録（URL追加があった場合は更新後のエントリを使い、追加URLを保持する）
  markEntryUsed(updatedEntry ?? entry);
}

/**
 * ヒューリスティック判定でパスワード入力
 * マッピング情報を返す（お気に入り登録用）
 */
async function handleFillPasswordHeuristic(entry: PasswordEntry): Promise<FavoriteFieldMapping[]> {
  const mappings: FavoriteFieldMapping[] = [];
  const form = lastFocusedInput?.closest('form') || document.querySelector('form');
  if (!form) return mappings;

  const allInputs = Array.from(form.querySelectorAll('input')) as HTMLInputElement[];

  // パスワードフィールドを探す
  const passwordField = allInputs.find(input => input.type === 'password' && input.offsetParent !== null);
  if (passwordField && entry.password) {
    passwordField.value = entry.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    const pwSelector = generateSelector(passwordField);
    if (pwSelector) {
      mappings.push({ selector: pwSelector, source: 'password' });
    }

    // パスワードフィールドの直前のテキスト系inputをユーザー名フィールドと判定
    const passwordIndex = allInputs.indexOf(passwordField);
    for (let i = passwordIndex - 1; i >= 0; i--) {
      const input = allInputs[i];
      const fieldType = detectFieldType(input);

      if ((fieldType === 'username' || fieldType === 'email' || fieldType === 'text') &&
          input.offsetParent !== null && entry.username) {
        input.value = entry.username;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const unSelector = generateSelector(input);
        if (unSelector) {
          mappings.push({ selector: unSelector, source: 'username' });
        }
        break;
      }
    }
  }
  return mappings;
}

/**
 * 個別フィールドに入力
 * entryとsourceを指定すると、お気に入り登録モード時にマッピングを保存する
 */
async function handleFillField(
  payload: { value: string },
  entry?: PasswordEntry,
  source?: FavoriteFieldMapping['source']
): Promise<void> {
  const focused = getFocusedInput() || lastFocusedInput;
  if (!focused) {
    return;
  }

  focused.value = payload.value;
  focused.dispatchEvent(new Event('input', { bubbles: true }));
  focused.dispatchEvent(new Event('change', { bubbles: true }));

  // お気に入り登録モードの場合
  if (favoriteRegisterSlot !== null && entry && source) {
    const selector = generateSelector(focused);
    if (selector) {
      await saveFavoriteAction(favoriteRegisterSlot, entry, [{ selector, source }]);
      favoriteRegisterSlot = null;
    }
  }

  // 最近使用として記録（entry がある場合）
  if (entry) {
    markEntryUsed(entry);
  }
}

/**
 * 現在のフォームを保存
 */
async function handleSaveCurrentForm(): Promise<void> {
  const forms = detectForms();
  if (forms.length === 0) {
    await showErrorDialog('フォームが見つかりません');
    return;
  }

  // 最初のフォームを対象にする
  const formData = captureFormData(forms[0]);

  if (!formData.password) {
    await showErrorDialog('パスワードフィールドが見つかりませんでした');
    return;
  }

  await showSaveFormDialog(formData);
}

/**
 * フォーム保存ダイアログを表示
 */
async function showSaveFormDialog(formData: Partial<PasswordEntry>): Promise<void> {
  closeExistingDialogIfOpen();
  await createDialogHost('ss-bg-save-form-dialog-host');

  const content = document.createElement('div');
  content.className = 'ss-bg-dialog-content';

  // テーマ設定に基づいて色を決定
  const isDarkMode = await isDarkModeEnabled();
  const dialogBg = isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const dialogText = isDarkMode ? '#e0e0e0' : '#333333';

  content.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-height: 80vh;
    background: ${dialogBg};
    color: ${dialogText};
    overflow-y: auto;
    pointer-events: auto;
  `;

  // タイトルバー
  const titleBar = createTitleBar('フォーム情報を保存', () => closeDialog());
  content.appendChild(titleBar);

  // タイトル
  const titleGroup = createFormGroup('タイトル', formData.title || '');
  content.appendChild(titleGroup.group);

  // URL
  const urlGroup = document.createElement('div');
  urlGroup.className = 'ss-bg-form-group';
  const urlLabel = document.createElement('label');
  urlLabel.className = 'ss-bg-form-label';
  urlLabel.textContent = 'URL';
  const urlTextarea = document.createElement('textarea');
  urlTextarea.className = 'ss-bg-form-textarea';
  urlTextarea.value = formData.urls ? formData.urls.join('\n') : '';
  urlTextarea.rows = 2;
  urlGroup.appendChild(urlLabel);
  urlGroup.appendChild(urlTextarea);
  content.appendChild(urlGroup);

  // ユーザー名
  const usernameGroup = createFormGroup('ユーザー名', formData.username || '');
  content.appendChild(usernameGroup.group);

  // パスワード
  const passwordGroup = createFormGroup('パスワード', formData.password || '', 'password');
  content.appendChild(passwordGroup.group);

  // 追加フィールド
  const additionalInputs: Array<{ nameInput: HTMLInputElement; valueInput: HTMLInputElement }> = [];
  if (formData.additionalFields && formData.additionalFields.length > 0) {
    const addLabel = document.createElement('div');
    addLabel.className = 'ss-bg-form-label';
    addLabel.textContent = '追加フィールド';
    addLabel.style.marginBottom = '4px';
    content.appendChild(addLabel);

    for (const field of formData.additionalFields) {
      const row = document.createElement('div');
      row.className = 'ss-bg-field-row';
      const nameInput = document.createElement('input');
      nameInput.className = 'ss-bg-name-input';
      nameInput.value = field.name;
      nameInput.placeholder = '名前';
      const valueInput = document.createElement('input');
      valueInput.className = 'ss-bg-value-input';
      valueInput.value = field.value;
      valueInput.placeholder = '値';
      row.appendChild(nameInput);
      row.appendChild(valueInput);
      content.appendChild(row);
      additionalInputs.push({ nameInput, valueInput });
    }
  }

  // 保存ボタン
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.className = 'ss-bg-save-btn';
  saveBtn.style.marginTop = '8px';
  saveBtn.addEventListener('click', async () => {
    const entry: PasswordEntry = {
      id: crypto.randomUUID(),
      title: titleGroup.input.value.trim() || formData.title || '',
      urls: urlTextarea.value.trim().split('\n').map(u => u.trim()).filter(Boolean),
      username: usernameGroup.input.value,
      password: passwordGroup.input.value,
      usernameSelector: formData.usernameSelector,
      passwordSelector: formData.passwordSelector,
      additionalFields: additionalInputs
        .map((inputs, i) => ({
          name: inputs.nameInput.value.trim(),
          value: inputs.valueInput.value.trim(),
          selector: formData.additionalFields?.[i]?.selector || ''
        }))
        .filter(f => f.name && f.value),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (entry.additionalFields && entry.additionalFields.length === 0) {
      entry.additionalFields = undefined;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD',
      payload: entry
    });

    if (response.success) {
      const msg = document.createElement('div');
      msg.className = 'ss-bg-success-message';
      msg.textContent = '保存しました';
      content.appendChild(msg);
      setTimeout(() => closeDialog(), 1000);
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;';
      errorMsg.textContent = '保存に失敗しました: ' + (response.error || '不明なエラー');
      content.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    }
  });
  content.appendChild(saveBtn);

  // キャンセルボタン
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.className = 'ss-bg-cancel-btn';
  cancelBtn.addEventListener('click', () => closeDialog());
  content.appendChild(cancelBtn);

  dialogContent = content;

  const css = getDialogStyles();
  renderDialogContent(css, content);
}

/**
 * 既存パスワードエントリの編集ダイアログを表示
 */
function showEntryEditDialog(entry: PasswordEntry, tabId: number): void {
  if (!dialogContent) return;

  // ダイアログの内容をクリア
  dialogContent.innerHTML = '';
  dialogContent.style.maxHeight = '80vh';

  // タイトルバー
  const titleBar = createTitleBar('エントリを編集', () => closeDialog());
  dialogContent.appendChild(titleBar);

  // タイトル
  const titleGroup = createFormGroup('タイトル', entry.title);
  dialogContent.appendChild(titleGroup.group);

  // URL
  const urlGroup = document.createElement('div');
  urlGroup.className = 'ss-bg-form-group';
  const urlLabel = document.createElement('label');
  urlLabel.className = 'ss-bg-form-label';
  urlLabel.textContent = 'URL (1行に1つ)';
  const urlTextarea = document.createElement('textarea');
  urlTextarea.className = 'ss-bg-form-textarea';
  urlTextarea.value = entry.urls.join('\n');
  urlTextarea.rows = 2;
  urlGroup.appendChild(urlLabel);
  urlGroup.appendChild(urlTextarea);
  dialogContent.appendChild(urlGroup);

  // ユーザー名
  const usernameGroup = createFormGroup('ユーザー名', entry.username);
  dialogContent.appendChild(usernameGroup.group);

  // パスワード
  const passwordGroup = createFormGroup('パスワード', entry.password, 'password');
  dialogContent.appendChild(passwordGroup.group);

  // メモ
  const notesGroup = createFormGroup('メモ', entry.notes || '');
  dialogContent.appendChild(notesGroup.group);

  // 追加フィールド
  const additionalInputs: Array<{ nameInput: HTMLInputElement; valueInput: HTMLInputElement; selectorInput: HTMLInputElement; sensitiveInput: HTMLInputElement }> = [];
  const fieldsContainer = document.createElement('div');
  fieldsContainer.className = 'ss-bg-fields-container';

  if (entry.additionalFields && entry.additionalFields.length > 0) {
    const addLabel = document.createElement('div');
    addLabel.className = 'ss-bg-form-label';
    addLabel.textContent = '追加フィールド';
    addLabel.style.marginBottom = '4px';
    dialogContent.appendChild(addLabel);

    for (const field of entry.additionalFields) {
      const { row, inputs } = createAdditionalFieldRow(field.name, field.value, field.selector || '', field.sensitive === true, additionalInputs, fieldsContainer);
      fieldsContainer.appendChild(row);
      additionalInputs.push(inputs);
    }
  }
  dialogContent.appendChild(fieldsContainer);

  // フィールド追加ボタン
  const addFieldBtn = createFieldButton('+ フィールドを追加', () => {
    const { row, inputs } = createAdditionalFieldRow('', '', '', false, additionalInputs, fieldsContainer);
    fieldsContainer.appendChild(row);
    additionalInputs.push(inputs);
  });
  addFieldBtn.style.background = '#e3f2fd';
  addFieldBtn.style.color = '#1976d2';
  dialogContent.appendChild(addFieldBtn);

  // 保存ボタン
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.className = 'ss-bg-save-btn';
  saveBtn.style.marginTop = '8px';
  saveBtn.addEventListener('click', async () => {
    const updatedAdditionalFields = additionalInputs
      .map(inputs => ({
        name: inputs.nameInput.value.trim(),
        value: inputs.valueInput.value.trim(),
        selector: inputs.selectorInput.value.trim(),
        sensitive: inputs.sensitiveInput.checked
      }))
      .filter(f => f.name && f.value);

    const updatedEntry: PasswordEntry = {
      ...entry,
      title: titleGroup.input.value.trim() || entry.title,
      urls: urlTextarea.value.trim().split('\n').map(u => u.trim()).filter(Boolean),
      username: usernameGroup.input.value,
      password: passwordGroup.input.value,
      notes: notesGroup.input.value.trim() || undefined,
      additionalFields: updatedAdditionalFields.length > 0 ? updatedAdditionalFields : undefined,
      updatedAt: Date.now()
    };

    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_PASSWORD',
      payload: { id: entry.id, entry: updatedEntry }
    });

    if (response.success) {
      const msg = document.createElement('div');
      msg.className = 'ss-bg-success-message';
      msg.textContent = '保存しました';
      dialogContent!.appendChild(msg);
      setTimeout(() => {
        // 更新後のエントリでフィールド選択に戻る
        showFieldSelectionDialog(updatedEntry, tabId);
      }, 800);
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;';
      errorMsg.textContent = '保存に失敗: ' + (response.error || '不明なエラー');
      dialogContent!.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    }
  });
  dialogContent.appendChild(saveBtn);

  // 戻るボタン
  const backBtn = document.createElement('button');
  backBtn.textContent = '戻る';
  backBtn.className = 'ss-bg-back-btn';
  backBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PASSWORDS' });
    if (response.success && response.data) {
      const currentLastFocused = lastFocusedInput;
      closeDialog();
      lastFocusedInput = currentLastFocused;
      await showPasswordDialog(response.data, tabId);
    } else {
      closeDialog();
    }
  });
  dialogContent.appendChild(backBtn);
}

/**
 * 追加フィールド行を作成
 */
type AdditionalFieldInputs = {
  nameInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  selectorInput: HTMLInputElement;
  sensitiveInput: HTMLInputElement;
};

function createAdditionalFieldRow(
  name: string,
  value: string,
  selector: string,
  sensitive: boolean,
  inputsArray: AdditionalFieldInputs[],
  _container: HTMLElement
): {
  row: HTMLDivElement;
  inputs: AdditionalFieldInputs;
} {
  const row = document.createElement('div');
  row.className = 'ss-bg-field-row';
  row.style.padding = '4px';
  row.style.marginBottom = '4px';
  row.style.background = '#f9f9f9';
  row.style.borderRadius = '4px';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = name;
  nameInput.placeholder = '名前';
  nameInput.className = 'ss-bg-name-input';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.value = value;
  valueInput.placeholder = '値';
  valueInput.className = 'ss-bg-value-input';

  // 機密チェック
  const sensitiveInput = document.createElement('input');
  sensitiveInput.type = 'checkbox';
  sensitiveInput.checked = sensitive;
  const sensitiveLabel = document.createElement('label');
  sensitiveLabel.className = 'ss-bg-sensitive-label';
  sensitiveLabel.appendChild(sensitiveInput);
  sensitiveLabel.appendChild(document.createTextNode('secret'));

  // ピークボタン（機密時のみ表示）
  const peekBtn = document.createElement('button');
  peekBtn.type = 'button';
  peekBtn.className = 'ss-bg-peek-btn';

  // 値入力 + ピーク を1つの行にまとめる
  const valueWrap = document.createElement('div');
  valueWrap.className = 'ss-bg-value-wrap';
  valueWrap.appendChild(valueInput);
  valueWrap.appendChild(peekBtn);

  let revealed = false;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function setPeekIcon(isRevealed: boolean): void {
    peekBtn.innerHTML = isRevealed ? SS_EYE_OFF_SVG : SS_EYE_SVG;
    peekBtn.setAttribute('aria-label', isRevealed ? '隠す' : '表示');
    peekBtn.title = isRevealed ? '隠す' : '表示';
  }

  function applyValueType(): void {
    const isSensitive = sensitiveInput.checked;
    peekBtn.style.display = isSensitive ? '' : 'none';
    valueInput.type = isSensitive && !revealed ? 'password' : 'text';
  }

  function hideReveal(): void {
    revealed = false;
    setPeekIcon(false);
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    applyValueType();
  }

  peekBtn.addEventListener('click', () => {
    if (revealed) {
      hideReveal();
      return;
    }
    revealed = true;
    setPeekIcon(true);
    applyValueType();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (revealed) hideReveal();
    }, SS_REVEAL_AUTO_HIDE_MS);
  });

  setPeekIcon(false);

  sensitiveInput.addEventListener('change', () => {
    if (!sensitiveInput.checked) {
      hideReveal();
    } else {
      applyValueType();
    }
  });

  applyValueType();

  const selectorInput = document.createElement('input');
  selectorInput.type = 'text';
  selectorInput.value = selector;
  selectorInput.placeholder = 'セレクタ';
  selectorInput.className = 'ss-bg-selector-input';

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '削除';
  removeBtn.className = 'ss-bg-remove-btn';
  removeBtn.addEventListener('click', () => {
    if (hideTimer) clearTimeout(hideTimer);
    row.remove();
    const idx = inputsArray.findIndex(f => f.nameInput === nameInput);
    if (idx !== -1) inputsArray.splice(idx, 1);
  });

  row.appendChild(nameInput);
  row.appendChild(valueWrap);
  row.appendChild(sensitiveLabel);
  row.appendChild(selectorInput);
  row.appendChild(removeBtn);

  const inputs: AdditionalFieldInputs = { nameInput, valueInput, selectorInput, sensitiveInput };
  return { row, inputs };
}

/**
 * フォームグループ（ラベル+input）を作成
 */
function createFormGroup(
  labelText: string,
  value: string,
  type: string = 'text'
): { group: HTMLDivElement; input: HTMLInputElement } {
  const group = document.createElement('div');
  group.className = 'ss-bg-form-group';
  const label = document.createElement('label');
  label.className = 'ss-bg-form-label';
  label.textContent = labelText;
  const input = document.createElement('input');
  input.className = 'ss-bg-form-input';
  input.type = type;
  input.value = value;
  group.appendChild(label);
  group.appendChild(input);
  return { group, input };
}

/**
 * 現在のURLを登録するか提案
 */
/**
 * 現在のURLが未登録の場合、追加するか提案する。
 * URLを追加した場合は更新後のエントリを返し、追加しなかった場合は null を返す。
 * （返されたエントリを markEntryUsed に渡すことで、追加したURLが上書きされないようにする）
 */
export async function suggestAddingCurrentUrl(entry: PasswordEntry): Promise<PasswordEntry | null> {
  const currentUrl = window.location.href;
  const normalizedCurrentUrl = normalizeUrl(currentUrl);

  // 現在のURLがすでに登録されているかチェック
  const matchPriority = matchUrl(currentUrl, entry.urls);
  if (matchPriority > 0) {
    // すでに登録されている（完全一致またはドメイン一致）
    return null;
  }

  // URLが登録されていない場合、追加するか確認
  const shouldAdd = await showConfirmDialog(
    `このサイト (${normalizedCurrentUrl}) は「${entry.title}」の登録URLに含まれていません。\n\nURLを追加しますか？`
  );

  if (!shouldAdd) {
    return null;
  }

  // URLを追加
  const updatedEntry: PasswordEntry = {
    ...entry,
    urls: [...entry.urls, normalizedCurrentUrl],
    updatedAt: Date.now()
  };

  try {
    // 既存エントリのURL更新なのでUPDATE_PASSWORD（上書き）
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_PASSWORD',
      payload: { id: entry.id, entry: updatedEntry }
    });

    if (response.success) {
      return updatedEntry;
    }
  } catch (error) {
    console.error('[SS-BG] Error adding URL:', error);
  }
  return null;
}

/**
 * 最後にフォーカスされた入力フィールドを取得（テスト用）
 */
export function getLastFocusedInput(): HTMLInputElement | null {
  return lastFocusedInput;
}

/**
 * 確認ダイアログのボタンを取得（テスト用）。
 * closed Shadow DOM内のため document.querySelector では参照できない。
 */
export function getConfirmDialogButtonsForTest(): { ok: HTMLButtonElement | null; cancel: HTMLButtonElement | null } {
  const okEl = dialogShadowRoot?.querySelector('.ss-bg-confirm-ok') ?? null;
  const cancelEl = dialogShadowRoot?.querySelector('.ss-bg-confirm-cancel') ?? null;
  return {
    ok: okEl instanceof HTMLButtonElement ? okEl : null,
    cancel: cancelEl instanceof HTMLButtonElement ? cancelEl : null
  };
}

/**
 * ダイアログ共通CSSを取得（テスト用）
 */
export function getDialogStylesForTest(): string {
  return getDialogStyles();
}

/**
 * 追加フィールド行を作成（テスト用エクスポート）
 */
export function createAdditionalFieldRowForTest(
  name: string,
  value: string,
  selector: string,
  sensitive: boolean
): { row: HTMLDivElement; inputs: AdditionalFieldInputs } {
  return createAdditionalFieldRow(name, value, selector, sensitive, [], document.createElement('div'));
}

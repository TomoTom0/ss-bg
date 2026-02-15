import type { Message } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import { getFocusedInput, generateSelector, detectFieldType } from '@/utils/field-detector';
import { captureFormData, detectForms } from './form-detector';
import { normalizeUrl, matchUrl } from '@/utils/url-matcher';

// 右クリックされた入力フィールド
let lastFocusedInput: HTMLInputElement | null = null;

// ダイアログ要素
let dialogOverlay: HTMLDivElement | null = null;
let dialogContent: HTMLDivElement | null = null;
let dialogShadowHost: HTMLDivElement | null = null;
let dialogShadowRoot: ShadowRoot | null = null;

// ハイライト要素
let highlightElements: HTMLDivElement[] = [];

// ハイライト用のCSSクラス名
const HIGHLIGHT_CLASS = 'ss-bg-highlight-target';

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
  styleEl.textContent = `
    .ss-bg-dialog-content {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(2px);
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      max-width: 350px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
    }
    .ss-bg-empty-message {
      color: #999;
      text-align: center;
      padding: 12px;
      font-size: 13px;
    }
    .ss-bg-password-item {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
    }
    .ss-bg-password-item:hover {
      background: #f0f0f0;
    }
    .ss-bg-item-title {
      font-weight: 600;
      margin-bottom: 2px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-item-username {
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-cancel-btn {
      width: 100%;
      padding: 6px;
      margin-top: 4px;
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
    }
    .ss-bg-cancel-btn:hover {
      background: #e0e0e0;
    }
    .ss-bg-field-button {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: white;
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
      background: #f0f0f0;
    }
    .ss-bg-instruction {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      font-size: 12px;
      color: #666;
      background: #f9f9f9;
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
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-value-input {
      flex: 2;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-selector-input {
      flex: 3;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-remove-btn {
      padding: 4px 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    .ss-bg-remove-btn:hover {
      background: #d32f2f;
    }
    .ss-bg-save-btn {
      width: 100%;
      padding: 8px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }
    .ss-bg-save-btn:hover {
      background: #45a049;
    }
    .ss-bg-back-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: #666;
    }
    .ss-bg-back-btn:hover {
      background: #e0e0e0;
    }
    .ss-bg-title-bar {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ss-bg-title-text {
      font-weight: 600;
      font-size: 13px;
      color: #333;
    }
    .ss-bg-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #999;
      padding: 0 4px;
      line-height: 1;
    }
    .ss-bg-close-btn:hover {
      color: #333;
    }
  `;
  dialogShadowRoot.appendChild(styleEl);
  
  // ダイアログコンテンツを作成
  dialogContent = document.createElement('div');
  dialogContent.className = 'ss-bg-dialog-content';
  dialogContent.style.cssText = `
    position: absolute;
    top: ${dialogPos.top}px;
    left: ${dialogPos.left}px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(2px);
    border: 1px solid #ccc;
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
  
  // 候補リスト
  if (candidates.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '候補が見つかりません';
    empty.className = 'ss-bg-empty-message';
    dialogContent.appendChild(empty);
  } else {
    candidates.forEach(entry => {
      const item = document.createElement('button');
      item.className = 'ss-bg-password-item';
      
      const itemTitle = document.createElement('div');
      itemTitle.textContent = entry.title;
      itemTitle.className = 'ss-bg-item-title';
      
      const itemUsername = document.createElement('div');
      itemUsername.textContent = entry.username;
      itemUsername.className = 'ss-bg-item-username';
      
      item.appendChild(itemTitle);
      item.appendChild(itemUsername);
      
      item.addEventListener('click', async () => {
        showFieldSelectionDialog(entry, tabId);
      });
      
      dialogContent.appendChild(item);
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
  const fieldInputs: Array<{ nameInput: HTMLInputElement; valueInput: HTMLInputElement; selectorInput: HTMLInputElement }> = [];
  
  additionalFields.forEach((field, index) => {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'ss-bg-field-row';
    fieldRow.style.padding = '8px';
    fieldRow.style.marginBottom = '8px';
    fieldRow.style.background = '#f9f9f9';
    fieldRow.style.borderRadius = '4px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = field.name;
    nameInput.placeholder = 'フィールド名';
    nameInput.className = 'ss-bg-name-input';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = field.value;
    valueInput.placeholder = '値';
    valueInput.className = 'ss-bg-value-input';
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.value = field.selector || '';
    selectorInput.placeholder = 'セレクタ（省略可）';
    selectorInput.className = 'ss-bg-selector-input';
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.className = 'ss-bg-remove-btn';
    removeBtn.style.alignSelf = 'flex-start';
    removeBtn.addEventListener('click', () => {
      fieldRow.remove();
      const idx = fieldInputs.findIndex(f => f.nameInput === nameInput);
      if (idx !== -1) fieldInputs.splice(idx, 1);
    });
    
    fieldRow.appendChild(nameInput);
    fieldRow.appendChild(valueInput);
    fieldRow.appendChild(selectorInput);
    fieldRow.appendChild(removeBtn);
    fieldsContainer.appendChild(fieldRow);
    
    fieldInputs.push({ nameInput, valueInput, selectorInput });
  });
  
  dialogContent.appendChild(fieldsContainer);
  
  // フィールド追加ボタン
  const addBtn = createFieldButton('+ フィールドを追加', () => {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'ss-bg-field-row';
    fieldRow.style.padding = '8px';
    fieldRow.style.marginBottom = '8px';
    fieldRow.style.background = '#f9f9f9';
    fieldRow.style.borderRadius = '4px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'フィールド名';
    nameInput.className = 'ss-bg-name-input';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = '値';
    valueInput.className = 'ss-bg-value-input';
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.placeholder = 'セレクタ（省略可）';
    selectorInput.className = 'ss-bg-selector-input';
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.className = 'ss-bg-remove-btn';
    removeBtn.style.alignSelf = 'flex-start';
    removeBtn.addEventListener('click', () => {
      fieldRow.remove();
      const idx = fieldInputs.findIndex(f => f.nameInput === nameInput);
      if (idx !== -1) fieldInputs.splice(idx, 1);
    });
    
    fieldRow.appendChild(nameInput);
    fieldRow.appendChild(valueInput);
    fieldRow.appendChild(selectorInput);
    fieldRow.appendChild(removeBtn);
    fieldsContainer.appendChild(fieldRow);
    
    fieldInputs.push({ nameInput, valueInput, selectorInput });
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
        selector: inputs.selectorInput.value.trim()
      }))
      .filter(f => f.name && f.value);
    
    const updatedEntry = {
      ...entry,
      additionalFields: updatedFields.length > 0 ? updatedFields : undefined,
      updatedAt: Date.now()
    };
    
    // Backgroundに保存を依頼
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD',
      payload: updatedEntry
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
  const allBtn = createFieldButton('すべて入力 (ユーザー名 + パスワード)', () => {
    handleFillPassword(entry);
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
      handleFillField({ value: entry.username });
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
      handleFillField({ value: entry.password });
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
    entry.additionalFields.forEach(field => {
      const fieldBtn = createFieldButton(`${field.name}: ${field.value}`, () => {
        handleFillField({ value: field.value });
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
  dialogOverlay = null;
  dialogContent = null;
  dialogShadowHost = null;
  dialogShadowRoot = null;
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
    
    if (message.type === 'FILL_PASSWORD') {
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
    }
    return false;
  });
}

/**
 * パスワードエントリ全体を自動入力
 */
async function handleFillPassword(entry: PasswordEntry): Promise<void> {
  const form = lastFocusedInput?.closest('form') || document.querySelector('form');
  if (!form) {
    return;
  }

  // セレクタ情報がある場合はそれを使用
  if (entry.usernameSelector && entry.username) {
    const usernameField = document.querySelector(entry.usernameSelector) as HTMLInputElement;
    if (usernameField) {
      usernameField.value = entry.username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      usernameField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (entry.passwordSelector && entry.password) {
    const passwordField = document.querySelector(entry.passwordSelector) as HTMLInputElement;
    if (passwordField) {
      passwordField.value = entry.password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // 追加フィールド
  if (entry.additionalFields) {
    for (const field of entry.additionalFields) {
      if (field.selector) {
        const element = document.querySelector(field.selector) as HTMLInputElement;
        if (element) {
          element.value = field.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }

  // セレクタ情報がない場合はヒューリスティック判定
  if (!entry.usernameSelector || !entry.passwordSelector) {
    await handleFillPasswordHeuristic(entry);
  }

  // 現在のURLが登録されていない場合、URLを追加するか提案
  await suggestAddingCurrentUrl(entry);
}

/**
 * ヒューリスティック判定でパスワード入力
 */
async function handleFillPasswordHeuristic(entry: PasswordEntry): Promise<void> {
  const form = lastFocusedInput?.closest('form') || document.querySelector('form');
  if (!form) return;
  
  const allInputs = Array.from(form.querySelectorAll('input')) as HTMLInputElement[];
  
  // パスワードフィールドを探す
  const passwordField = allInputs.find(input => input.type === 'password' && input.offsetParent !== null);
  if (passwordField && entry.password) {
    passwordField.value = entry.password;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    
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
        break;
      }
    }
  }
}

/**
 * 個別フィールドに入力
 */
async function handleFillField(payload: { value: string }): Promise<void> {
  const focused = getFocusedInput() || lastFocusedInput;
  if (!focused) {
    return;
  }

  focused.value = payload.value;
  focused.dispatchEvent(new Event('input', { bubbles: true }));
  focused.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 現在のフォームを保存
 */
async function handleSaveCurrentForm(): Promise<void> {
  const forms = detectForms();
  if (forms.length === 0) {
    return;
  }

  // 最初のフォームを対象にする（複数ある場合は後で選択できるようにする）
  const formData = captureFormData(forms[0]);

  if (!formData.password) {
    return;
  }
  
  // Optionsページを開いて保存UIを表示
  await chrome.storage.session.set({ capturedFormData: formData });
  chrome.runtime.sendMessage({
    type: 'OPEN_OPTIONS_WITH_FORM_DATA'
  });
}

/**
 * 現在のURLを登録するか提案
 */
async function suggestAddingCurrentUrl(entry: PasswordEntry): Promise<void> {
  const currentUrl = window.location.href;
  const normalizedCurrentUrl = normalizeUrl(currentUrl);

  // 現在のURLがすでに登録されているかチェック
  const matchPriority = matchUrl(currentUrl, entry.urls);
  if (matchPriority > 0) {
    // すでに登録されている（完全一致またはドメイン一致）
    return;
  }

  // URLが登録されていない場合、追加するか確認
  const shouldAdd = confirm(
    `このサイト (${normalizedCurrentUrl}) は「${entry.title}」の登録URLに含まれていません。\n\nURLを追加しますか？`
  );

  if (shouldAdd) {
    // URLを追加
    const updatedEntry: PasswordEntry = {
      ...entry,
      urls: [...entry.urls, normalizedCurrentUrl],
      updatedAt: Date.now()
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PASSWORD',
        payload: updatedEntry
      });

      if (response.success) {
        // URL added successfully
      }
    } catch (error) {
      console.error('[SS-BG] Error adding URL:', error);
    }
  }
}

/**
 * 最後にフォーカスされた入力フィールドを取得（テスト用）
 */
export function getLastFocusedInput(): HTMLInputElement | null {
  return lastFocusedInput;
}

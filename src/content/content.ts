import type { Message } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import { getFocusedInput, generateSelector, detectFieldType } from '@/utils/field-detector';
import { captureFormData, detectForms } from './form-detector';

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
  console.log('[SS-BG Content] Initializing content script');
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
  
  // ダイアログコンテンツを作成（入力欄の下に配置）
  dialogContent = document.createElement('div');
  dialogContent.style.cssText = `
    position: absolute;
    top: ${rect.bottom + 5}px;
    left: ${rect.left}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    width: ${Math.max(rect.width, 250)}px;
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
    empty.style.cssText = `
      color: #999;
      text-align: center;
      padding: 12px;
      font-size: 13px;
    `;
    dialogContent.appendChild(empty);
  } else {
    candidates.forEach(entry => {
      const item = document.createElement('button');
      item.style.cssText = `
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
      `;
      
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f0f0f0';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.background = 'white';
      });
      
      const itemTitle = document.createElement('div');
      itemTitle.textContent = entry.title;
      itemTitle.style.cssText = `
        font-weight: 600;
        margin-bottom: 2px;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      
      const itemUsername = document.createElement('div');
      itemUsername.textContent = entry.username;
      itemUsername.style.cssText = `
        font-size: 12px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      
      item.appendChild(itemTitle);
      item.appendChild(itemUsername);
      
      item.addEventListener('click', async () => {
        // 2段階目：フィールド選択ダイアログを表示
        showFieldSelectionDialog(entry, tabId);
      });
      
      dialogContent.appendChild(item);
    });
  }
  
  // キャンセルボタン
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.style.cssText = `
    width: 100%;
    padding: 6px;
    margin-top: 4px;
    background: #f5f5f5;
    border: none;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  `;
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#e0e0e0';
  });
  
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#f5f5f5';
  });
  
  cancelBtn.addEventListener('click', closeDialog);
  dialogContent.appendChild(cancelBtn);
  
  dialogShadowRoot.appendChild(dialogContent);
  document.body.appendChild(dialogShadowHost);
  document.body.classList.add('ss-bg-dialog-active');
  console.log('[SS-BG] Dialog added to DOM, host element:', dialogShadowHost);
  
  // MutationObserverで削除を監視
  const observer = new MutationObserver(() => {
    if (dialogShadowHost && !document.body.contains(dialogShadowHost)) {
      console.error('[SS-BG] Dialog was removed from DOM externally!');
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
  instruction.style.cssText = `
    margin: 0 0 12px 0;
    font-size: 12px;
    color: #666;
    padding: 0 8px;
  `;
  dialogContent.appendChild(instruction);
  
  // 編集可能なフィールドリスト
  const fieldsContainer = document.createElement('div');
  fieldsContainer.style.cssText = `
    max-height: 250px;
    overflow-y: auto;
    margin-bottom: 8px;
  `;
  
  const additionalFields = entry.additionalFields || [];
  const fieldInputs: Array<{ nameInput: HTMLInputElement; valueInput: HTMLInputElement; selectorInput: HTMLInputElement }> = [];
  
  additionalFields.forEach((field, index) => {
    const fieldRow = document.createElement('div');
    fieldRow.style.cssText = `
      padding: 8px;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = field.name;
    nameInput.placeholder = 'フィールド名';
    nameInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
      box-sizing: border-box;
    `;
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = field.value;
    valueInput.placeholder = '値';
    valueInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 12px;
      box-sizing: border-box;
    `;
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.value = field.selector || '';
    selectorInput.placeholder = 'セレクタ（省略可）';
    selectorInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 11px;
      font-family: monospace;
      color: #666;
      box-sizing: border-box;
    `;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.style.cssText = `
      padding: 4px 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      align-self: flex-start;
    `;
    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.background = '#da190b';
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.background = '#f44336';
    });
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
    fieldRow.style.cssText = `
      padding: 8px;
      margin-bottom: 8px;
      background: #f9f9f9;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'フィールド名';
    nameInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
      box-sizing: border-box;
    `;
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = '値';
    valueInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 12px;
      box-sizing: border-box;
    `;
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.placeholder = 'セレクタ（省略可）';
    selectorInput.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 11px;
      font-family: monospace;
      color: #666;
      box-sizing: border-box;
    `;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '削除';
    removeBtn.style.cssText = `
      padding: 4px 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      align-self: flex-start;
    `;
    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.background = '#da190b';
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.background = '#f44336';
    });
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
  const saveBtn = createFieldButton('保存', async () => {
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
      // 保存成功：フィールド選択画面に戻る
      showFieldSelectionDialog(updatedEntry, tabId);
    } else {
      alert('保存に失敗しました: ' + (response.error || '不明なエラー'));
    }
  });
  saveBtn.style.background = '#4CAF50';
  saveBtn.style.color = 'white';
  dialogContent.appendChild(saveBtn);
  
  // 戻るボタン
  const backBtn = createFieldButton('戻る', () => {
    showFieldSelectionDialog(entry, tabId);
  });
  backBtn.style.background = '#f5f5f5';
  backBtn.style.color = '#666';
  dialogContent.appendChild(backBtn);
}

/**
 * タイトルバーを作成（DRY原則）
 */
function createTitleBar(titleText: string, onClose: () => void): HTMLDivElement {
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    margin: 0 0 8px 0;
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #333;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = '#000';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = '#666';
  });
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
  instruction.style.cssText = `
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #666;
    padding: 0 8px;
  `;
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
  backBtn.style.cssText = `
    width: 100%;
    padding: 6px;
    margin-top: 4px;
    background: #f5f5f5;
    border: none;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  `;
  
  backBtn.addEventListener('mouseenter', () => {
    backBtn.style.background = '#e0e0e0';
  });
  
  backBtn.addEventListener('mouseleave', () => {
    backBtn.style.background = '#f5f5f5';
  });
  
  backBtn.addEventListener('click', async () => {
    // 候補リストに戻る
    const sessionData = await chrome.storage.session.get(['autofillCandidates', 'autofillTabId']);
    if (sessionData.autofillCandidates) {
      showPasswordDialog(sessionData.autofillCandidates, tabId);
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
  btn.style.cssText = `
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
  `;
  
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#f0f0f0';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'white';
  });
  
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
  console.log('[SS-BG Content] Setting up message listener');
  
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    console.log('[SS-BG Content] Received message:', message.type);
    
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
      console.log('[SS-BG Content] Showing password dialog with candidates:', message.payload.candidates.length);
      // コンテキストメニューから呼ばれる
      showPasswordDialog(message.payload.candidates, message.payload.tabId)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('[SS-BG Content] Error showing dialog:', error);
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
    console.log('No form found');
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
  
  console.log('Password filled successfully');
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
    console.log('No input field focused');
    return;
  }
  
  focused.value = payload.value;
  focused.dispatchEvent(new Event('input', { bubbles: true }));
  focused.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('Field filled successfully');
}

/**
 * 現在のフォームを保存
 */
async function handleSaveCurrentForm(): Promise<void> {
  const forms = detectForms();
  if (forms.length === 0) {
    alert('フォームが見つかりません');
    return;
  }
  
  // 最初のフォームを対象にする（複数ある場合は後で選択できるようにする）
  const formData = captureFormData(forms[0]);
  
  if (!formData.password) {
    alert('パスワードフィールドが見つかりませんでした');
    return;
  }
  
  // Optionsページを開いて保存UIを表示
  await chrome.storage.session.set({ capturedFormData: formData });
  chrome.runtime.sendMessage({
    type: 'OPEN_OPTIONS_WITH_FORM_DATA'
  });
}

/**
 * 最後にフォーカスされた入力フィールドを取得（テスト用）
 */
export function getLastFocusedInput(): HTMLInputElement | null {
  return lastFocusedInput;
}

import type { Message } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import { getFocusedInput, generateSelector, detectFieldType } from '@/utils/field-detector';
import { captureFormData, detectForms } from './form-detector';

// 右クリックされた入力フィールド
let lastFocusedInput: HTMLInputElement | null = null;

/**
 * Content Scriptの初期化
 */
export function initialize(): void {
  setupContextMenuListener();
  setupMessageListener();
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
    } else if (message.type === 'FILL_FIELD') {
      handleFillField(message.payload);
      sendResponse({ success: true });
    } else if (message.type === 'SAVE_CURRENT_FORM') {
      handleSaveCurrentForm();
      sendResponse({ success: true });
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

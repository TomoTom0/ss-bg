import { detectFormFields, generateSelector, type FieldInfo } from '@/utils/field-detector';
import type { PasswordEntry } from '@/types/storage';

/**
 * フォームから現在の入力内容を収集してPasswordEntryを生成
 */
export function captureFormData(form: HTMLFormElement): Partial<PasswordEntry> {
  const fields = detectFormFields(form);
  const url = window.location.href;
  
  let username = '';
  let password = '';
  let usernameSelector = '';
  let passwordSelector = '';
  const additionalFields: Array<{ name: string; value: string; selector: string }> = [];
  
  for (const field of fields) {
    const value = field.element.value;
    if (!value) continue; // 空欄はスキップ
    
    if (field.type === 'password' && !password) {
      password = value;
      passwordSelector = field.selector;
    } else if (field.type === 'username' && !username) {
      username = value;
      usernameSelector = field.selector;
    } else if (field.type === 'email' && !username) {
      username = value;
      usernameSelector = field.selector;
    } else {
      // その他のフィールドは追加フィールドとして保存
      const name = field.element.name || field.element.placeholder || `フィールド${additionalFields.length + 1}`;
      additionalFields.push({
        name,
        value,
        selector: field.selector
      });
    }
  }
  
  // タイトルを生成（URLのホスト名を使用）
  const urlObj = new URL(url);
  const title = urlObj.hostname;
  
  return {
    title,
    urls: [url],
    username,
    password,
    usernameSelector,
    passwordSelector,
    additionalFields: additionalFields.length > 0 ? additionalFields : undefined
  };
}

/**
 * ページ内の全フォームを検出
 */
export function detectForms(): HTMLFormElement[] {
  return Array.from(document.querySelectorAll('form'));
}

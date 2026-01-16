/**
 * 入力フィールドの種類を判定
 */

export type FieldType = 'username' | 'password' | 'email' | 'tel' | 'text' | 'unknown';

export interface FieldInfo {
  element: HTMLInputElement;
  type: FieldType;
  confidence: number; // 0-100の信頼度
  selector: string;
}

/**
 * CSSセレクタを生成
 */
export function generateSelector(element: HTMLElement): string {
  // id属性がある場合
  if (element.id) {
    return `#${element.id}`;
  }
  
  // name属性がある場合
  const input = element as HTMLInputElement;
  if (input.name) {
    return `input[name="${input.name}"]`;
  }
  
  // type属性がある場合
  if (input.type) {
    const form = element.closest('form');
    if (form) {
      const inputs = Array.from(form.querySelectorAll(`input[type="${input.type}"]`));
      const index = inputs.indexOf(element);
      if (index >= 0) {
        return `form input[type="${input.type}"]:nth-of-type(${index + 1})`;
      }
    }
  }
  
  // フォールバック: nth-child
  const parent = element.parentElement;
  if (parent) {
    const children = Array.from(parent.children);
    const index = children.indexOf(element);
    return `${parent.tagName.toLowerCase()} > :nth-child(${index + 1})`;
  }
  
  return 'input';
}

/**
 * 入力フィールドの種類を判定
 */
export function detectFieldType(input: HTMLInputElement): FieldType {
  const type = input.type.toLowerCase();
  
  // type属性で判定
  if (type === 'password') return 'password';
  if (type === 'email') return 'email';
  if (type === 'tel') return 'tel';
  
  // name属性で判定
  const name = input.name.toLowerCase();
  const usernamePatterns = ['user', 'login', 'account', 'id', 'userid', 'username', 'loginid'];
  const emailPatterns = ['email', 'mail'];
  const telPatterns = ['phone', 'tel', 'mobile'];
  
  if (usernamePatterns.some(p => name.includes(p))) return 'username';
  if (emailPatterns.some(p => name.includes(p))) return 'email';
  if (telPatterns.some(p => name.includes(p))) return 'tel';
  
  // id属性で判定
  const id = input.id.toLowerCase();
  if (usernamePatterns.some(p => id.includes(p))) return 'username';
  if (emailPatterns.some(p => id.includes(p))) return 'email';
  if (telPatterns.some(p => id.includes(p))) return 'tel';
  
  // placeholder属性で判定
  const placeholder = input.placeholder.toLowerCase();
  if (usernamePatterns.some(p => placeholder.includes(p))) return 'username';
  if (emailPatterns.some(p => placeholder.includes(p))) return 'email';
  if (telPatterns.some(p => placeholder.includes(p))) return 'tel';
  
  // autocomplete属性で判定
  const autocomplete = input.autocomplete.toLowerCase();
  if (autocomplete === 'username') return 'username';
  if (autocomplete === 'email') return 'email';
  if (autocomplete === 'tel') return 'tel';
  
  return type === 'text' || type === '' ? 'text' : 'unknown';
}

/**
 * フォーム内の全入力フィールドを検出
 */
export function detectFormFields(form: HTMLFormElement): FieldInfo[] {
  const inputs = Array.from(form.querySelectorAll('input'));
  const fields: FieldInfo[] = [];
  
  for (const input of inputs) {
    // 非表示フィールドはスキップ
    if (input.offsetParent === null) continue;
    if (input.type === 'hidden') continue;
    if (input.type === 'submit') continue;
    if (input.type === 'button') continue;
    
    const fieldType = detectFieldType(input);
    const selector = generateSelector(input);
    
    // 信頼度を計算
    let confidence = 50;
    if (input.type === 'password') confidence = 100;
    if (input.type === 'email') confidence = 90;
    if (input.name) confidence += 20;
    if (input.id) confidence += 10;
    
    fields.push({
      element: input,
      type: fieldType,
      confidence: Math.min(confidence, 100),
      selector
    });
  }
  
  return fields;
}

/**
 * 現在フォーカス中の入力要素を取得
 */
export function getFocusedInput(): HTMLInputElement | null {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT') {
    return active as HTMLInputElement;
  }
  return null;
}

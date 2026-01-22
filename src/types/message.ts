/**
 * メッセージ型
 */
export type MessageType =
  | 'GET_PASSWORDS'
  | 'SAVE_PASSWORD'
  | 'UPDATE_PASSWORD'
  | 'DELETE_PASSWORD'
  | 'AUTHENTICATE'
  | 'SETUP'
  | 'CREATE_SESSION'
  | 'LOCK_SESSION'
  | 'GET_SESSION_STATUS'
  | 'AUTOFILL_REQUEST'
  | 'FILL_PASSWORD'
  | 'FILL_FIELD'
  | 'SAVE_CURRENT_FORM'
  | 'SHOW_PASSWORD_DIALOG'
  | 'SHOW_PASSWORD_DIALOG_FOR_TAB'
  | 'OPEN_OPTIONS_WITH_FORM_DATA'
  | 'TAKE_SCREENSHOT'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS';

/**
 * メッセージ
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * レスポンス
 */
export interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * セッション状態
 */
export interface SessionStatus {
  authenticated: boolean;
}

/**
 * 型ガード
 */
export function isSessionStatus(data: unknown): data is SessionStatus {
  return (
    typeof data === 'object' &&
    data !== null &&
    'authenticated' in data &&
    typeof (data as SessionStatus).authenticated === 'boolean'
  );
}

export function isPasswordEntry(data: unknown): data is { id: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as { id: string }).id === 'string'
  );
}

export function isPasswordEntryArray(data: unknown): data is { id: string }[] {
  return (
    Array.isArray(data) &&
    data.every((item) => isPasswordEntry(item))
  );
}

export function isAppSettings(data: unknown): data is Partial<Record<string, unknown>> {
  return typeof data === 'object' && data !== null;
}

export function isStringRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null;
}




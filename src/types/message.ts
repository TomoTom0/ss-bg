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

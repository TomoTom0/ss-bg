/**
 * パスワードエントリ
 */
export interface PasswordEntry {
  id: string;              // UUID v4
  title: string;           // 表示名
  urls: string[];          // 複数URL対応
  username: string;        
  password: string;        
  notes?: string;          // メモ（オプション）
  createdAt: number;       // Unix timestamp (ms)
  updatedAt: number;       // Unix timestamp (ms)
  
  // フィールドセレクタ情報
  usernameSelector?: string;
  passwordSelector?: string;
  
  // 追加フィールド（ユーザー名・パスワード以外）
  additionalFields?: Array<{
    name: string;          // フィールド名（例: "メールアドレス", "電話番号"）
    value: string;         // 値
    selector?: string;     // CSSセレクタ
  }>;
}

/**
 * アプリケーション設定
 */
export interface AppSettings {
  sessionTimeout: number;  // 分単位（デフォルト: 30）
  prfEnabled?: boolean;    // PRF対応状態
  screenshotCopyToClipboard: boolean;  // スクリーンショットをクリップボードにコピー（デフォルト: true）
  screenshotDownloadImage: boolean;     // スクリーンショットをダウンロード（デフォルト: true）
  theme: 'light' | 'dark' | 'auto';   // テーマ設定（デフォルト: 'auto'）
}

/**
 * お気に入り動作のフィールドマッピング
 */
export interface FavoriteFieldMapping {
  selector: string;            // CSSセレクタ
  source: 'username' | 'password' | `additional:${number}`;  // エントリ内のどのフィールドか
}

/**
 * お気に入り動作
 */
export interface FavoriteAction {
  slot: 1 | 2 | 3;            // スロット番号
  domain: string;              // ドメイン名
  entryId: string;             // PasswordEntry ID
  mappings: FavoriteFieldMapping[];  // フィールドマッピング
  createdAt: number;           // Unix timestamp (ms)
}

/**
 * Storageスキーマ
 */
export interface StorageSchema {
  // WebAuthn credential ID (Base64)
  credentialId?: string;
  
  // 暗号化されたパスワードエントリ配列
  encryptedPasswords?: string; // EncryptedData を JSON.stringify したもの
  
  // アプリケーション設定
  settings?: AppSettings;
  
  // セットアップ完了フラグ
  isSetupComplete?: boolean;

  // お気に入り動作（ドメインごとに最大3つ）
  favorites?: FavoriteAction[];
}

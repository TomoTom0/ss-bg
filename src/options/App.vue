<template>
  <div class="options">
    <h1>bg-ss 設定</h1>
    
    <div v-if="error" class="error">
      エラー: {{ error }}
    </div>
    
    <div v-else-if="loading" class="loading">
      読み込み中...
    </div>
    
    <div v-else>
      <!-- 認証状態 -->
      <section class="section auth-section">
        <h2>認証状態</h2>
        <div v-if="isAuthenticated" class="authenticated">
          <p class="status-ok">認証済み</p>
          <button @click="lockSession" class="btn btn-warning">セッションをロック</button>
        </div>
        <div v-else class="not-authenticated">
          <p class="status-warning">未認証（情報の管理には認証が必要です）</p>
          <button @click="authenticate" class="btn btn-primary">認証する</button>
          <div v-if="authError" class="error">{{ authError }}</div>
        </div>
      </section>

      <!-- テーマ設定 -->
      <section class="section">
        <h2>テーマ設定</h2>
        <div class="theme-options">
          <label class="theme-option">
            <input type="radio" name="theme" value="auto" v-model="themeSetting" @change="saveThemeSetting">
            <span>自動（システム設定に従う）</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="light" v-model="themeSetting" @change="saveThemeSetting">
            <span>ライト</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="dark" v-model="themeSetting" @change="saveThemeSetting">
            <span>ダーク</span>
          </label>
        </div>
      </section>

      <!-- 保存済み情報一覧 -->
      <section class="section">
        <h2>保存済み情報</h2>

        <div v-if="!isAuthenticated" class="auth-required">
          <p>情報管理機能を使用するには認証が必要です</p>
        </div>
        
        <template v-else>
          <button @click="showAddForm = true" class="btn btn-primary">
            新規追加
          </button>
          
          <div v-if="passwords.length === 0" class="empty">
            保存済み情報がありません
          </div>
          
          <div v-else class="password-list">
            <div v-for="entry in passwords" :key="entry.id" class="password-item">
              <div class="password-info">
                <h3>{{ entry.title }}</h3>
                <p class="username">ユーザー名: {{ entry.username }}</p>
                <div class="password-field">
                  <span class="password-label">パスワード: </span>
                  <span class="password-value">{{ getPasswordDisplay(entry.id) }}</span>
                  <button @click="togglePasswordVisibility(entry.id)" class="btn-icon" :title="isPasswordVisible(entry.id) ? 'パスワードを隠す' : 'パスワードを表示'">
                    {{ isPasswordVisible(entry.id) ? '●' : '○' }}
                  </button>
                </div>
                <p class="urls">URL: {{ entry.urls.join(', ') }}</p>
                <div v-if="entry.additionalFields && entry.additionalFields.length > 0" class="additional-fields-info">
                  <p class="additional-fields-label">追加フィールド:</p>
                  <ul class="additional-fields-items">
                    <li v-for="(field, index) in entry.additionalFields" :key="index">
                      {{ field.name }}: {{ field.value }}
                    </li>
                  </ul>
                </div>
              </div>
              <div class="password-actions">
                <button @click="editEntry(entry)" class="btn btn-sm">編集</button>
                <button @click="confirmDelete(entry)" class="btn btn-sm btn-danger">削除</button>
              </div>
            </div>
          </div>
        </template>
      </section>
      
      <!-- 情報追加/編集フォーム -->
      <div v-if="showAddForm || editingEntry" class="modal">
        <div class="modal-content">
          <h3>{{ editingEntry ? '情報編集' : '情報追加' }}</h3>
          
          <div class="form-group">
            <label>タイトル</label>
            <input v-model="formData.title" type="text" />
          </div>
          
          <div class="form-group">
            <label>ユーザー名</label>
            <input v-model="formData.username" type="text" />
          </div>
          
          <div class="form-group">
            <label>パスワード</label>
            <input v-model="formData.password" type="password" />
          </div>
          
          <div class="form-group">
            <label>URL（複数の場合は改行区切り）</label>
            <textarea v-model="formData.urlsText" rows="3"></textarea>
          </div>
          
          <!-- 追加フィールド -->
          <div class="form-group">
            <label>追加フィールド</label>
            <div v-if="formData.additionalFields.length === 0" class="empty-fields">
              追加フィールドはありません
            </div>
            <div v-else class="additional-fields-list">
              <div v-for="(field, index) in formData.additionalFields" :key="index" class="field-row">
                <div class="field-inputs">
                  <input 
                    v-model="field.name" 
                    type="text" 
                    placeholder="フィールド名（例：電話番号）"
                    class="field-name-input"
                  />
                  <input 
                    v-model="field.value" 
                    type="text" 
                    placeholder="値"
                    class="field-value-input"
                  />
                  <input 
                    v-model="field.selector" 
                    type="text" 
                    placeholder="セレクタ（省略可）"
                    class="field-selector-input"
                  />
                </div>
                <button @click="removeAdditionalField(index)" class="btn-remove" title="削除">×</button>
              </div>
            </div>
            <button @click="addAdditionalField" class="btn btn-sm btn-add-field">+ フィールドを追加</button>
          </div>
          
          <div class="form-actions">
            <button @click="saveEntry" class="btn btn-primary">保存</button>
            <button @click="cancelEdit" class="btn">キャンセル</button>
          </div>
          
          <div v-if="formError" class="error">{{ formError }}</div>
        </div>
      </div>
      
      <!-- 削除確認 -->
      <div v-if="deletingEntry" class="modal">
        <div class="modal-content">
          <h3>削除確認</h3>
          <p>「{{ deletingEntry.title }}」を削除しますか？</p>
          <div class="form-actions">
            <button @click="deleteEntry" class="btn btn-danger">削除</button>
            <button @click="deletingEntry = null" class="btn">キャンセル</button>
          </div>
        </div>
      </div>
      
      <!-- 設定 -->
      <section class="section">
        <h2>設定</h2>

        <div class="form-group">
          <label>セッションタイムアウト</label>
          <select v-model.number="settings.sessionTimeout" class="select-input">
            <option v-for="option in sessionTimeoutOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <h3>スクリーンショット</h3>
        <div class="form-group">
          <label>
            <input v-model="settings.screenshotCopyToClipboard" type="checkbox" />
            クリップボードにコピー
          </label>
        </div>
        <div class="form-group">
          <label>
            <input v-model="settings.screenshotDownloadImage" type="checkbox" />
            画像をダウンロード
          </label>
        </div>

        <button @click="saveSettings" class="btn btn-primary">設定を保存</button>

        <div v-if="settingsSaved" class="success">設定を保存しました</div>

        <div class="form-group" style="margin-top: 20px;">
          <label>キーボードショートカット</label>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">
            パスワード自動入力のキーボードショートカットを設定できます
          </p>
          <button @click="openKeyboardShortcuts" class="btn btn-secondary">キーボードショートカットを設定</button>
        </div>
      </section>
      
      <!-- 開発用：データクリア -->
      <section class="section danger-section">
        <h2>開発用機能</h2>
        <p class="warning-text">警告: 以下の操作は全てのデータを削除します</p>
        <button @click="confirmClearData" class="btn btn-danger">全データをクリア（再セットアップ）</button>
        <div v-if="clearDataConfirm" class="confirm-dialog">
          <p>本当に全てのデータを削除しますか？この操作は取り消せません。</p>
          <button @click="clearAllData" class="btn btn-danger">はい、削除します</button>
          <button @click="clearDataConfirm = false" class="btn">キャンセル</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Message, Response } from '@/types/message';
import type { PasswordEntry, AppSettings } from '@/types/storage';
import { registerCredential, authenticate as webauthnAuthenticate } from '@/utils/webauthn';
import { storage } from '@/utils/storage';
import { normalizeUrl } from '@/utils/url-matcher';

const passwords = ref<PasswordEntry[]>([]);
const settings = ref<AppSettings>({
  sessionTimeout: 30,
  screenshotCopyToClipboard: true,
  screenshotDownloadImage: true,
  theme: 'auto'
});

const themeSetting = ref<'light' | 'dark' | 'auto'>('auto');

const sessionTimeoutOptions = [
  { value: 5, label: '5分' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '60分' },
  { value: 120, label: '120分' }
];

const loading = ref(true);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);
const settingsSaved = ref(false);
const authError = ref<string | null>(null);
const isAuthenticated = ref(false);
const clearDataConfirm = ref(false);

const showAddForm = ref(false);
const editingEntry = ref<PasswordEntry | null>(null);
const deletingEntry = ref<PasswordEntry | null>(null);

const formData = ref<{
  title: string;
  username: string;
  password: string;
  urlsText: string;
  additionalFields: Array<{ name: string; value: string; selector: string }>;
}>({
  title: '',
  username: '',
  password: '',
  urlsText: '',
  additionalFields: []
});

// テーマ設定
/**
 * テーマを適用
 */
function applyTheme(theme: 'light' | 'dark' | 'auto'): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme');

  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  }
  // 'auto'の場合はdata-theme属性を設定せず、システム設定に従う
}

/**
 * テーマ設定を保存
 */
async function saveThemeSetting(): Promise<void> {
  try {
    await storage.saveSettings({ theme: themeSetting.value });
    applyTheme(themeSetting.value);
  } catch (e) {
    console.error('Failed to save theme setting:', e);
  }
}

// パスワード表示状態を管理
const visiblePasswordIds = ref<Set<string>>(new Set());

function togglePasswordVisibility(id: string): void {
  if (visiblePasswordIds.value.has(id)) {
    visiblePasswordIds.value.delete(id);
  } else {
    visiblePasswordIds.value.add(id);
  }
}

function isPasswordVisible(id: string): boolean {
  return visiblePasswordIds.value.has(id);
}

function getPasswordDisplay(id: string): string {
  const entry = passwords.value.find(p => p.id === id);
  if (!entry) return '';
  
  return isPasswordVisible(id) ? entry.password : '••••••••';
}

async function sendMessage(message: Message): Promise<Response> {
  return chrome.runtime.sendMessage(message);
}

async function checkSessionStatus(): Promise<void> {
  try {
    const response = await sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success && response.data) {
      isAuthenticated.value = response.data.authenticated;
    }

    // テーマ設定を読み込んで適用
    const currentSettings = await storage.getSettings();
    themeSetting.value = currentSettings.theme || 'auto';
    applyTheme(themeSetting.value);
  } catch (e) {
    console.error('Failed to check session status:', e);
  }
}

async function authenticate(): Promise<void> {
  authError.value = null;
  try {
    // セットアップ状態を確認
    const isSetup = await storage.getSetupStatus();

    if (!isSetup) {
      // 初回セットアップ
      authError.value = '初回セットアップを実行中...';
      await registerCredential();
      await storage.markSetupComplete();
      authError.value = 'セットアップ完了。認証中...';
    }

    // WebAuthn認証を実行（オプションページから直接）
    const { key, credentialId } = await webauthnAuthenticate();
    
    // 認証成功をbackgroundに通知してセッションを作成
    const settings = await storage.getSettings();
    const response = await sendMessage({
      type: 'CREATE_SESSION',
      payload: {
        encryptionKey: await exportKey(key),
        credentialId: arrayBufferToBase64(credentialId),
        timeoutMinutes: settings.sessionTimeout || 30
      }
    });
    
    if (response.success) {
      isAuthenticated.value = true;
      authError.value = null;
      await loadPasswords();
    } else {
      authError.value = response.error || '認証に失敗しました';
    }
  } catch (e) {
    authError.value = e instanceof Error ? e.message : '認証エラー';
  }
}

// CryptoKeyをJWK形式にエクスポート
async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key);
}

// ArrayBufferをBase64に変換
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function lockSession(): Promise<void> {
  try {
    await sendMessage({ type: 'LOCK_SESSION' });
    isAuthenticated.value = false;
    passwords.value = [];
  } catch (e) {
    console.error('Failed to lock session:', e);
  }
}

function confirmClearData(): void {
  clearDataConfirm.value = true;
}

async function clearAllData(): Promise<void> {
  try {
    await storage.clearAll();
    clearDataConfirm.value = false;
    error.value = '全てのデータをクリアしました。ページを再読み込みしてください。';
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'データクリアに失敗しました';
  }
}

async function loadPasswords(): Promise<void> {
  // 未認証の場合はパスワード読み込みをスキップ
  if (!isAuthenticated.value) {
    passwords.value = [];
    return;
  }
  
  try {
    const response = await sendMessage({ type: 'GET_PASSWORDS' });
    if (response.success) {
      passwords.value = response.data || [];
    } else {
      // 認証エラーまたは復号化エラーの場合は空配列を設定
      passwords.value = [];
      console.error('Failed to load passwords:', response.error);
      // エラーを表示せず、ログに記録するのみ
    }
  } catch (e) {
    passwords.value = [];
    console.error('Error loading passwords:', e);
  }
}

async function loadSettings(): Promise<void> {
  try {
    const response = await sendMessage({ type: 'GET_SETTINGS' });
    if (response.success && response.data) {
      settings.value = response.data;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function editEntry(entry: PasswordEntry): void {
  editingEntry.value = entry;
  formData.value = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    urlsText: entry.urls.join('\n'),
    additionalFields: entry.additionalFields ? [...entry.additionalFields] : []
  };
}

function cancelEdit(): void {
  showAddForm.value = false;
  editingEntry.value = null;
  formError.value = null;
  formData.value = {
    title: '',
    username: '',
    password: '',
    urlsText: '',
    additionalFields: []
  };
}

function addAdditionalField(): void {
  formData.value.additionalFields.push({
    name: '',
    value: '',
    selector: ''
  });
}

function removeAdditionalField(index: number): void {
  formData.value.additionalFields.splice(index, 1);
}

async function saveEntry(): Promise<void> {
  formError.value = null;

  if (!formData.value.username || !formData.value.password) {
    formError.value = 'ユーザー名とパスワードは必須です';
    return;
  }

  // URLを正規化（空を許容）
  const urls = formData.value.urlsText
    .split('\n')
    .map(url => normalizeUrl(url))
    .filter(url => url.length > 0);

  // titleが空の場合の処理
  let title = formData.value.title.trim();
  if (!title) {
    if (urls.length > 0) {
      // 最初のURLをtitleにする
      title = urls[0];
    } else {
      // URLも空の場合は現在時刻をtitleにする
      title = new Date().toLocaleString('ja-JP');
    }
  }

  const entry: PasswordEntry = {
    id: editingEntry.value?.id || Date.now().toString(),
    title,
    username: formData.value.username,
    password: formData.value.password,
    urls,
    createdAt: editingEntry.value?.createdAt || Date.now(),
    updatedAt: Date.now(),
    usernameSelector: editingEntry.value?.usernameSelector,
    passwordSelector: editingEntry.value?.passwordSelector,
    additionalFields: formData.value.additionalFields.length > 0
      ? formData.value.additionalFields.filter(f => f.name && f.value)
      : undefined
  };

  try {
    // 編集時はUPDATE_PASSWORD（既存レコード上書き）、新規時はSAVE_PASSWORD（追加）
    const isEditing = !!editingEntry.value;
    const response = await sendMessage(
      isEditing
        ? { type: 'UPDATE_PASSWORD', payload: { id: editingEntry.value!.id, entry } }
        : { type: 'SAVE_PASSWORD', payload: entry }
    );

    if (response.success) {
      await loadPasswords();
      cancelEdit();
    } else {
      formError.value = response.error || '保存に失敗しました';
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '保存エラー';
  }
}

function confirmDelete(entry: PasswordEntry): void {
  deletingEntry.value = entry;
}

async function deleteEntry(): Promise<void> {
  if (!deletingEntry.value) return;
  
  try {
    const response = await sendMessage({
      type: 'DELETE_PASSWORD',
      payload: { id: deletingEntry.value.id }
    });
    
    if (response.success) {
      await loadPasswords();
      deletingEntry.value = null;
    } else {
      error.value = response.error || '削除に失敗しました';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '削除エラー';
  }
}

async function saveSettings(): Promise<void> {
  settingsSaved.value = false;

  try {
    const response = await sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: settings.value
    });

    if (response.success) {
      settingsSaved.value = true;
      setTimeout(() => {
        settingsSaved.value = false;
      }, 3000);
    } else {
      error.value = response.error || '設定保存に失敗しました';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '設定保存エラー';
  }
}

function openKeyboardShortcuts(): void {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

onMounted(async () => {
  await checkSessionStatus();
  await loadSettings();
  // パスワード読み込みは認証済みの場合のみ
  if (isAuthenticated.value) {
    await loadPasswords();
  }
  
  // フォームデータが保存されている場合は自動的にフォームを開く
  const sessionData = await chrome.storage.session.get(['capturedFormData']);
  if (sessionData.capturedFormData) {
    const capturedData = sessionData.capturedFormData;
    // セッションストレージからクリア
    await chrome.storage.session.remove(['capturedFormData']);
    
    // フォームに反映
    showAddForm.value = true;
    formData.value = {
      title: capturedData.title || '',
      username: capturedData.username || '',
      password: capturedData.password || '',
      urlsText: capturedData.urls ? capturedData.urls.join('\n') : '',
      additionalFields: capturedData.additionalFields || []
    };
  }
  
  loading.value = false;
});
</script>

<style>
@import "../styles/theme.css";
</style>

<style scoped>
.options {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--color-text-primary);
}

h1 {
  margin: 0 0 24px 0;
}

h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.section {
  margin-bottom: 32px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.auth-section {
  background: var(--color-auth-bg);
}

.danger-section {
  background: var(--color-danger-bg);
  border: 2px solid var(--color-danger-border);
}

.warning-text {
  color: var(--color-error-text);
  font-weight: 600;
  margin-bottom: 12px;
}

.confirm-dialog {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  border: 1px solid var(--color-danger-border);
}

.confirm-dialog p {
  margin: 0 0 12px 0;
  color: var(--color-error-text);
  font-weight: 600;
}

.confirm-dialog button {
  margin-right: 8px;
}

.authenticated,
.not-authenticated {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-ok {
  color: var(--color-success-text);
  font-weight: 600;
  margin: 0;
}

.status-warning {
  color: var(--color-warning-text);
  font-weight: 600;
  margin: 0;
}

.loading, .error, .success {
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
}

.loading {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-tertiary);
}

.auth-required {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-warning-bg);
  border-radius: 4px;
}

.auth-required p {
  margin: 0;
  font-size: 14px;
}

.password-list {
  margin-top: 16px;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.password-label {
  color: var(--color-text-secondary);
}

.password-value {
  font-family: monospace;
  color: var(--color-text-primary);
  flex: 1;
}

.btn-icon {
  border: none;
  background: var(--color-bg-tertiary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--color-text-primary);
}

.btn-icon:hover {
  background: var(--color-border-medium);
}

.password-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  margin-bottom: 8px;
}

.password-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.password-info .username {
  margin: 4px 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.password-info .urls {
  margin: 4px 0;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.password-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-btn-default);
  color: var(--color-text-primary);
}

.btn:hover {
  background: var(--color-btn-default-hover);
}

.btn-primary {
  background: var(--color-btn-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover {
  background: var(--color-btn-primary-hover);
}

.btn-danger {
  background: var(--color-btn-danger);
  color: var(--color-text-inverse);
}

.btn-danger:hover {
  background: var(--color-btn-danger-hover);
}

.btn-secondary {
  background: var(--color-btn-secondary);
  color: var(--color-text-inverse);
}

.btn-secondary:hover {
  background: var(--color-btn-secondary-hover);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-bg-elevated);
  padding: 24px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.form-group input[type="checkbox"] {
  margin-right: 8px;
}

.select-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-bg-primary);
  cursor: pointer;
  color: var(--color-text-primary);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.additional-fields-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.field-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.field-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-name-input,
.field-value-input,
.field-selector-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  font-size: 13px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.field-name-input {
  font-weight: 600;
}

.field-selector-input {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: monospace;
}

.btn-remove {
  padding: 6px 10px;
  background: var(--color-btn-danger);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  height: fit-content;
}

.btn-remove:hover {
  background: var(--color-btn-danger-hover);
}

.btn-add-field {
  width: 100%;
  margin-top: 4px;
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.btn-add-field:hover {
  background: #bbdefb;
}

.empty-fields {
  padding: 12px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  margin-bottom: 8px;
}

.additional-fields-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.additional-fields-label {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.additional-fields-items {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.additional-fields-items li {
  margin: 2px 0;
}
</style>

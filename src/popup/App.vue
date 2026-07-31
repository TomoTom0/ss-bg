<template>
  <div class="popup">
    <h1>bg-ss</h1>
    
    <div v-if="error" class="error">
      エラー: {{ error }}
    </div>
    
    <div v-else-if="loading" class="loading">
      読み込み中...
    </div>
    
    <!-- 自動入力候補選択（2段階選択） -->
    <div v-else-if="autofillMode === 'select-entry'" class="autofill-selection">
      <h2>保存済み情報を選択</h2>
      <div class="candidate-list">
        <button 
          v-for="entry in autofillCandidates" 
          :key="entry.id" 
          @click="selectEntry(entry)"
          class="candidate-item"
        >
          <div class="candidate-title">{{ entry.title }}</div>
          <div class="candidate-username">{{ entry.username }}</div>
          <div class="candidate-urls">{{ entry.urls[0] }}</div>
        </button>
      </div>
      <button @click="cancelAutofill" class="btn btn-secondary">キャンセル</button>
    </div>
    
    <!-- フィールド選択（個別入力） -->
    <div v-else-if="autofillMode === 'select-field' && selectedEntry" class="field-selection">
      <h2>{{ selectedEntry.title }}</h2>
      <p class="field-instruction">入力する項目を選択してください</p>
      <div class="field-list">
        <button @click="fillEntireEntry" class="field-item field-all">
          すべて入力
        </button>
        <button v-if="selectedEntry.username" @click="fillSingleField(selectedEntry.username)" class="field-item">
          ユーザー名: {{ selectedEntry.username }}
        </button>
        <button v-if="selectedEntry.password" @click="fillSingleField('********')" class="field-item">
          パスワード: ••••••••
        </button>
        <button 
          v-for="(field, index) in selectedEntry.additionalFields" 
          :key="index"
          @click="fillSingleField(field.value)" 
          class="field-item"
        >
          {{ field.name }}: {{ field.value }}
        </button>
      </div>
      <button @click="backToEntrySelection" class="btn btn-secondary">戻る</button>
    </div>
    
    <div v-else-if="sessionStatus">
      <div v-if="sessionStatus.authenticated" class="authenticated">
        <p class="status">認証済み</p>
        <p v-if="remainingTime" class="time">
          残り時間: {{ remainingTime }}秒
        </p>
        <button @click="lockSession" class="btn btn-warning">
          ロック
        </button>
      </div>
      
      <div v-else class="not-authenticated">
        <p class="status">未認証</p>
        <button v-if="needsSetup" @click="setupAndAuthenticate" class="btn btn-primary">
          初期設定
        </button>
        <button v-else @click="authenticate" class="btn btn-primary">
          認証
        </button>
      </div>
      
      <div v-if="actionError" class="error">
        {{ actionError }}
      </div>
    </div>
    
    <div class="footer">
      <a href="#" @click.prevent="openOptions">設定</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import type { Message, Response } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import { registerCredential, authenticate as webauthnAuthenticate } from '@/utils/webauthn';
import { storage } from '@/utils/storage';

const sessionStatus = ref<{ authenticated: boolean; expiresAt?: number } | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const currentTime = ref(Date.now());
const needsSetup = ref(false);
const autofillCandidates = ref<PasswordEntry[]>([]);
const autofillTabId = ref<number | null>(null);
const autofillMode = ref<'select-entry' | 'select-field' | null>(null);
const selectedEntry = ref<PasswordEntry | null>(null);

let updateInterval: number | null = null;
let timeInterval: number | null = null;

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
 * テーマ設定を読み込んで適用
 */
async function loadAndApplyTheme(): Promise<void> {
  try {
    const settings = await storage.getSettings();
    applyTheme(settings.theme || 'auto');
  } catch (e) {
    console.error('Failed to load theme setting:', e);
  }
}

const remainingTime = computed(() => {
  if (!sessionStatus.value?.authenticated || !sessionStatus.value.expiresAt) {
    return null;
  }
  const remaining = Math.floor((sessionStatus.value.expiresAt - currentTime.value) / 1000);
  return remaining > 0 ? remaining : 0;
});

async function sendMessage(message: Message): Promise<Response> {
  return chrome.runtime.sendMessage(message);
}

async function loadSessionStatus(): Promise<void> {
  try {
    const response = await sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success) {
      sessionStatus.value = response.data;
    } else {
      error.value = response.error || '状態取得に失敗しました';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました';
  } finally {
    loading.value = false;
  }
}

async function setupAndAuthenticate(): Promise<void> {
  actionError.value = null;
  try {
    await registerCredential();
    await storage.markSetupComplete();
    needsSetup.value = false;
    await authenticate();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'セットアップエラー';
  }
}

async function authenticate(): Promise<void> {
  actionError.value = null;
  try {
    // WebAuthn認証を実行（Popupから直接）
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
      await loadSessionStatus();
      actionError.value = null;
      
      // 認証完了後、保留中のタスクがあれば実行
      const sessionData = await chrome.storage.session.get(['pendingAutofillTabId', 'pendingSaveFormTabId', 'pendingFavorite']);

      if (sessionData.pendingFavorite) {
        const { tabId, slot } = sessionData.pendingFavorite;
        await chrome.storage.session.remove(['pendingFavorite']);
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab?.url) {
            const result = await chrome.runtime.sendMessage({
              type: 'EXECUTE_FAVORITE',
              payload: { domain: new URL(tab.url).hostname, slot, tabId }
            });
            if (result.success) {
              setTimeout(() => window.close(), 100);
            } else {
              actionError.value = 'お気に入りの実行に失敗しました: ' + result.error;
            }
          }
        } catch (e) {
          console.error('[bg-ss Popup] Error executing pending favorite:', e);
          actionError.value = 'お気に入りの実行中にエラーが発生しました。';
        }
      } else if (sessionData.pendingSaveFormTabId) {
        const tabId = sessionData.pendingSaveFormTabId;
        await chrome.storage.session.remove(['pendingSaveFormTabId']);

        // Backgroundにフォーム保存を依頼
        try {
          const result = await chrome.runtime.sendMessage({
            type: 'SAVE_CURRENT_FORM_FOR_TAB',
            payload: { tabId }
          });
          if (result.success) {
            setTimeout(() => window.close(), 100);
          } else {
            actionError.value = 'フォーム保存に失敗しました: ' + result.error;
          }
        } catch (error) {
          console.error('[bg-ss Popup] Error sending save form message:', error);
          actionError.value = 'フォーム保存に失敗しました';
        }
      } else if (sessionData.pendingAutofillTabId) {
        const tabId = sessionData.pendingAutofillTabId;
        await chrome.storage.session.remove(['pendingAutofillTabId']);

        // Backgroundにダイアログ表示を依頼
        try {
          const result = await chrome.runtime.sendMessage({
            type: 'SHOW_PASSWORD_DIALOG_FOR_TAB',
            payload: { tabId }
          });

          if (result.success) {
            // 成功したらPopupを閉じる
            setTimeout(() => window.close(), 100);
          } else {
            console.error('[bg-ss Popup] Failed to show dialog:', result.error);
            actionError.value = 'ダイアログ表示に失敗しました: ' + result.error;
          }
        } catch (error) {
          console.error('[bg-ss Popup] Error sending message:', error);
          actionError.value = 'メッセージ送信エラー: ' + (error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } else {
      actionError.value = response.error || '認証に失敗しました';
    }
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : '認証エラー';
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
  actionError.value = null;
  try {
    const response = await sendMessage({ type: 'LOCK_SESSION' });
    if (response.success) {
      await loadSessionStatus();
    } else {
      actionError.value = response.error || 'ロックに失敗しました';
    }
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'ロックエラー';
  }
}

async function selectEntry(entry: PasswordEntry): Promise<void> {
  selectedEntry.value = entry;
  autofillMode.value = 'select-field';
}

async function fillEntireEntry(): Promise<void> {
  if (!selectedEntry.value || autofillTabId.value === null) {
    error.value = 'エントリまたはタブIDが不正です';
    return;
  }
  
  try {
    await chrome.tabs.sendMessage(autofillTabId.value, {
      type: 'FILL_PASSWORD',
      payload: selectedEntry.value
    });
    
    // 候補をクリア
    resetAutofillState();
    
    // Popupを閉じる
    window.close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '自動入力エラー';
  }
}

async function fillSingleField(value: string): Promise<void> {
  if (autofillTabId.value === null) {
    error.value = 'タブIDが不正です';
    return;
  }
  
  // パスワードの場合は実際の値を使用
  let actualValue = value;
  if (value === '********' && selectedEntry.value) {
    actualValue = selectedEntry.value.password;
  }
  
  try {
    await chrome.tabs.sendMessage(autofillTabId.value, {
      type: 'FILL_FIELD',
      payload: { value: actualValue }
    });
    
    // Popupを閉じる
    window.close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'フィールド入力エラー';
  }
}

function backToEntrySelection(): void {
  selectedEntry.value = null;
  autofillMode.value = 'select-entry';
}

function resetAutofillState(): void {
  autofillCandidates.value = [];
  autofillTabId.value = null;
  autofillMode.value = null;
  selectedEntry.value = null;
  chrome.storage.session.remove(['autofillCandidates', 'autofillTabId', 'autofillMode']);
}


function cancelAutofill(): void {
  resetAutofillState();
}

function openOptions(): void {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('src/options/index.html'));
  }
}

onMounted(async () => {
  // テーマ設定を読み込んで適用
  await loadAndApplyTheme();

  await loadSessionStatus();

  // 保留中のタスクを確認（認証完了後のダイアログ表示用）
  const sessionData = await chrome.storage.session.get(['pendingAutofillTabId', 'pendingSaveFormTabId', 'pendingFavorite']);

  // 未認証の場合は自動認証（セットアップ未完了の場合はボタンを表示）
  if (sessionStatus.value && !sessionStatus.value.authenticated) {
    const isSetup = await storage.getSetupStatus();
    if (!isSetup) {
      needsSetup.value = true;
      return;
    }
    await authenticate();
    return;
  }

  // 既に認証済みで、pendingFavoriteがある場合
  if (sessionData.pendingFavorite) {
    const { tabId, slot } = sessionData.pendingFavorite;
    await chrome.storage.session.remove(['pendingFavorite']);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.url) {
        const result = await chrome.runtime.sendMessage({
          type: 'EXECUTE_FAVORITE',
          payload: { domain: new URL(tab.url).hostname, slot, tabId }
        });
        if (result.success) {
          setTimeout(() => window.close(), 100);
        } else {
          actionError.value = 'お気に入りの実行に失敗しました: ' + result.error;
        }
      }
    } catch (e) {
      console.error('[bg-ss Popup onMounted] Error executing pending favorite:', e);
      actionError.value = 'お気に入りの実行中にエラーが発生しました。';
    }
    return;
  }

  // 既に認証済みで、pendingSaveFormTabIdがある場合
  if (sessionData.pendingSaveFormTabId) {
    const tabId = sessionData.pendingSaveFormTabId;
    await chrome.storage.session.remove(['pendingSaveFormTabId']);

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SAVE_CURRENT_FORM_FOR_TAB',
        payload: { tabId }
      });
      if (result.success) {
        setTimeout(() => window.close(), 100);
      } else {
        actionError.value = 'フォーム保存に失敗しました: ' + result.error;
      }
    } catch (error) {
      console.error('[bg-ss Popup onMounted] Error sending save form message:', error);
      actionError.value = 'フォーム保存に失敗しました';
    }
    return;
  }

  // 既に認証済みで、pendingAutofillTabIdがある場合
  if (sessionData.pendingAutofillTabId) {
    const tabId = sessionData.pendingAutofillTabId;
    await chrome.storage.session.remove(['pendingAutofillTabId']);

    // Backgroundにダイアログ表示を依頼
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SHOW_PASSWORD_DIALOG_FOR_TAB',
        payload: { tabId }
      });

      if (result.success) {
        // 成功したらPopupを閉じる
        setTimeout(() => window.close(), 100);
      } else {
        console.error('[bg-ss Popup onMounted] Failed to show dialog:', result.error);
        actionError.value = 'ダイアログ表示に失敗しました: ' + result.error;
      }
    } catch (error) {
      console.error('[bg-ss Popup onMounted] Error sending message:', error);
      actionError.value = 'メッセージ送信エラー: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
    return;
  }
  
  // 5秒ごとにセッション状態を更新
  updateInterval = window.setInterval(() => {
    loadSessionStatus();
  }, 5000);
  
  // 1秒ごとに現在時刻を更新（残り時間表示用）
  timeInterval = window.setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (updateInterval !== null) {
    clearInterval(updateInterval);
  }
  if (timeInterval !== null) {
    clearInterval(timeInterval);
  }
});
</script>

<style>
@import "../styles/theme.css";

/* ポップアップの外側キャンバスにもテーマ背景を適用。
   設定しないとダークモードでテキストのみ明色になり、
   Chromeの既定の白背景に明文字が乗ってしまう。 */
html,
body {
  margin: 0;
  background: var(--color-bg-primary);
}
</style>

<style scoped>
.popup {
  width: 300px;
  padding: 16px;
  background: var(--color-bg-primary);
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--color-text-primary);
}

h1 {
  margin: 0 0 16px 0;
  font-size: 20px;
}

.loading, .error {
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
}

.loading {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.status {
  font-weight: 600;
  margin: 0 0 8px 0;
}

.time {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin: 4px 0;
}

.btn-primary {
  background: var(--color-btn-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover {
  background: var(--color-btn-primary-hover);
}

.btn-warning {
  background: #ff9800;
  color: var(--color-text-inverse);
}

.btn-warning:hover {
  background: #e68900;
}

.footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
  text-align: center;
}

.footer a {
  color: var(--color-info-text);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

.autofill-selection {
  padding: 16px;
}

.autofill-selection h2 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.candidate-item {
  display: block;
  width: 100%;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  color: var(--color-text-primary);
}

.candidate-item:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-btn-primary);
}

.candidate-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text-primary);
}

.candidate-username {
  font-size: 14px;
  color: var(--color-text-secondary);
}
</style>

<template>
  <div class="popup">
    <h1>SS-BG</h1>
    
    <div v-if="error" class="error">
      エラー: {{ error }}
    </div>
    
    <div v-else-if="loading" class="loading">
      読み込み中...
    </div>
    
    <!-- 自動入力候補選択（2段階選択） -->
    <div v-else-if="autofillMode === 'select-entry'" class="autofill-selection">
      <h2>パスワードを選択</h2>
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
        <button @click="authenticate" class="btn btn-primary">
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
const autofillCandidates = ref<PasswordEntry[]>([]);
const autofillTabId = ref<number | null>(null);
const autofillMode = ref<'select-entry' | 'select-field' | null>(null);
const selectedEntry = ref<PasswordEntry | null>(null);

let updateInterval: number | null = null;
let timeInterval: number | null = null;

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

async function authenticate(): Promise<void> {
  actionError.value = null;
  try {
    // セットアップ状態を確認
    const isSetup = await storage.getSetupStatus();
    
    if (!isSetup) {
      // 初回セットアップ
      actionError.value = '初回セットアップを実行中...';
      await registerCredential();
      await storage.markSetupComplete();
      actionError.value = 'セットアップ完了。認証中...';
    }
    
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
      
      // 認証完了後、保留中のタブIDがあればダイアログを表示
      const sessionData = await chrome.storage.session.get(['pendingAutofillTabId']);
      
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
            console.error('[SS-BG Popup] Failed to show dialog:', result.error);
            actionError.value = 'ダイアログ表示に失敗しました: ' + result.error;
          }
        } catch (error) {
          console.error('[SS-BG Popup] Error sending message:', error);
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
  await loadSessionStatus();
  
  // 保留中のタブIDを確認（認証完了後のダイアログ表示用）
  const sessionData = await chrome.storage.session.get(['pendingAutofillTabId']);

  // 未認証の場合は自動認証
  if (sessionStatus.value && !sessionStatus.value.authenticated) {
    await authenticate();
    // authenticate()内でpendingAutofillTabIdをチェックするので、ここでreturn
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
        console.error('[SS-BG Popup onMounted] Failed to show dialog:', result.error);
        actionError.value = 'ダイアログ表示に失敗しました: ' + result.error;
      }
    } catch (error) {
      console.error('[SS-BG Popup onMounted] Error sending message:', error);
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

<style scoped>
.popup {
  width: 300px;
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
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
  background: #e3f2fd;
  color: #1976d2;
}

.error {
  background: #ffebee;
  color: #c62828;
}

.status {
  font-weight: 600;
  margin: 0 0 8px 0;
}

.time {
  font-size: 14px;
  color: #666;
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
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover {
  background: #e68900;
}

.footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.footer a {
  color: #1976d2;
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
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.candidate-item:hover {
  background: #f5f5f5;
  border-color: #4CAF50;
}

.candidate-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.candidate-username {
  font-size: 14px;
  color: #666;
}
</style>

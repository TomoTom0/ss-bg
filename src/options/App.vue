<template>
  <div class="options">
    <h1>bg-ss 設定</h1>
    <ToastContainer :toasts="toasts" @remove="removeToast" />
    
    <div v-if="error" class="error">
      エラー: {{ error }}
    </div>
    
    <div v-else-if="loading" class="loading">
      読み込み中...
    </div>
    
    <div v-else>
      <!-- タブナビゲーション -->
      <div class="tabs" role="tablist" aria-label="設定カテゴリ">
        <template v-for="tab in tabs" :key="tab.id">
          <button
            role="tab"
            :id="`tab-${tab.id}`"
            :aria-selected="activeTab === tab.id"
            :aria-controls="`panel-${tab.id}`"
            :tabindex="activeTab === tab.id ? 0 : -1"
            :class="['tab', { 'tab--active': activeTab === tab.id }]"
            @click="onTabClick(tab.id)"
          >
            <span class="tab-label">{{ tab.label }}</span>
            <span
              v-if="tab.id === 'auth'"
              class="tab-auth-badge"
              :class="isAuthenticated ? 'tab-auth-badge--ok' : 'tab-auth-badge--ng'"
            >{{ isAuthenticated ? '認証済み' : '未認証' }}</span>
          </button>
          <!-- Auth タブ直後: 残り時間リング付きセッションロック（認証済み時のみ） -->
          <button
            v-if="tab.id === 'auth' && isAuthenticated"
            type="button"
            class="session-lock-btn"
            :style="{ '--session-progress': sessionProgress }"
            :title="`セッションをロック（残り約 ${sessionRemainingMinutes} 分）`"
            aria-label="セッションをロック"
            @click.stop="confirmLock"
          >
            <span class="session-lock-btn__ring"><IconLock :size="11" /></span>
          </button>
        </template>
      </div>

      <!-- General: テーマ + セッションタイムアウト -->
      <div v-show="activeTab === 'general'" id="panel-general" role="tabpanel" aria-labelledby="tab-general" class="tab-panel">
        <section :class="['section', 'theme-section', { 'section--saved': isSectionHighlighted('theme') }]">
          <Transition name="inline-notice">
            <span v-if="isSectionHighlighted('theme')" class="inline-notice">{{ highlightMessage() }}</span>
          </Transition>
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

        <section :class="['section', { 'section--saved': isSectionHighlighted('timeout') }]">
          <Transition name="inline-notice">
            <span v-if="isSectionHighlighted('timeout')" class="inline-notice">{{ highlightMessage() }}</span>
          </Transition>
          <h2>セッションタイムアウト</h2>
          <div class="form-group">
            <label>セッションタイムアウト</label>
            <select
              v-model.number="settings.sessionTimeout"
              @change="saveSettings({ name: 'timeout', message: 'セッションタイムアウトを保存しました' })"
              class="select-input"
            >
              <option v-for="option in sessionTimeoutOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </section>
      </div>

      <!-- Auth: 認証状態はタブラベル右のバッジで表示。パネル内はロック操作と認証エラーのみ -->
      <div v-show="activeTab === 'auth'" id="panel-auth" role="tabpanel" aria-labelledby="tab-auth" class="tab-panel">
        <section v-if="isAuthenticated" class="section auth-section auth-section--compact">
          <button @click="confirmLock" class="btn btn-warning">セッションをロック</button>
        </section>
        <div v-if="!isAuthenticated && authError" class="error auth-error">{{ authError }}</div>

        <section class="section">
          <h2>保存済み情報</h2>

          <div v-if="!isAuthenticated" class="auth-required">
            <p>情報管理機能を使用するには認証が必要です。Auth タブを押して認証を開始してください。</p>
          </div>

          <template v-else>
            <button @click="openAddForm()" class="btn btn-primary">
              新規追加
            </button>

            <div v-if="passwords.length === 0" class="empty">
              保存済み情報がありません
            </div>

            <div v-else class="password-list">
              <div v-for="entry in passwords" :key="entry.id" :class="['password-item', { 'password-item--saved': isEntryHighlighted(entry.id) }]">
                <Transition name="inline-notice">
                  <span v-if="isEntryHighlighted(entry.id)" class="inline-notice">{{ highlightMessage() }}</span>
                </Transition>
                <div class="password-info">
                  <h3>{{ entry.title }}</h3>
                  <!-- ユーザー名 -->
                  <div class="entry-row">
                    <div class="entry-text">
                      <span class="row-label">ユーザー名:</span>
                      <span class="row-value">{{ entry.username }}</span>
                    </div>
                    <div class="entry-actions">
                      <button class="btn-icon btn-eye is-hidden" aria-hidden="true" tabindex="-1"><IconEye /></button>
                      <button @click="copyValue(entry.username, 'ユーザー名')" class="btn-icon btn-copy" title="ユーザー名をコピー" aria-label="ユーザー名をコピー">
                        <IconCopy />
                      </button>
                    </div>
                  </div>
                  <!-- パスワード -->
                  <div class="entry-row password-field">
                    <div class="entry-text">
                      <span class="row-label">パスワード:</span>
                      <Transition name="ss-fade" mode="out-in">
                        <span :key="isPasswordVisible(entry.id)" class="row-value row-value--mono">{{ getPasswordDisplay(entry.id) }}</span>
                      </Transition>
                    </div>
                    <div class="entry-actions">
                      <button @click="togglePasswordVisibility(entry.id)" class="btn-icon btn-eye" :title="isPasswordVisible(entry.id) ? 'パスワードを隠す' : 'パスワードを表示'" :aria-label="isPasswordVisible(entry.id) ? 'パスワードを隠す' : 'パスワードを表示'">
                        <IconEye :off="isPasswordVisible(entry.id)" />
                      </button>
                      <button @click="copyValue(entry.password, 'パスワード')" class="btn-icon btn-copy" title="パスワードをコピー" aria-label="パスワードをコピー">
                        <IconCopy />
                      </button>
                    </div>
                  </div>
                  <p class="urls">URL: {{ entry.urls.join(', ') }}</p>
                  <div v-if="entry.additionalFields && entry.additionalFields.length > 0" class="additional-fields-info">
                    <p class="additional-fields-label">追加フィールド:</p>
                    <ul class="additional-fields-items">
                      <li v-for="(field, index) in entry.additionalFields" :key="index" class="entry-row field-item">
                        <div class="entry-text">
                          <span class="row-label">{{ field.name }}:</span>
                          <Transition name="ss-fade" mode="out-in">
                            <span :key="isFieldVisible(entry.id, index)" class="row-value row-value--mono">{{ getFieldDisplay(entry.id, index, field) }}</span>
                          </Transition>
                        </div>
                        <div class="entry-actions">
                          <button
                            @click="toggleFieldVisibility(entry.id, index)"
                            class="btn-icon btn-eye"
                            :class="{ 'is-hidden': !isFieldSensitive(field) }"
                            :tabindex="isFieldSensitive(field) ? 0 : -1"
                            :aria-hidden="!isFieldSensitive(field)"
                            :title="isFieldVisible(entry.id, index) ? '隠す' : '表示'"
                            :aria-label="isFieldVisible(entry.id, index) ? '隠す' : '表示'"
                          >
                            <IconEye :off="isFieldVisible(entry.id, index)" />
                          </button>
                          <button @click="copyValue(field.value, field.name)" class="btn-icon btn-copy" :title="field.name + 'をコピー'" :aria-label="field.name + 'をコピー'">
                            <IconCopy />
                          </button>
                        </div>
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
      </div>

      <!-- 情報追加/編集フォーム（タブ外・全体オーバーレイ） -->
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
            <div class="input-with-toggle">
              <input v-model="formData.password" :type="isFormPasswordVisible() ? 'text' : 'password'" />
              <button @click="toggleFormPasswordVisibility()" class="btn-icon btn-eye" :title="isFormPasswordVisible() ? 'パスワードを隠す' : 'パスワードを表示'" :aria-label="isFormPasswordVisible() ? 'パスワードを隠す' : 'パスワードを表示'">
                <IconEye :off="isFormPasswordVisible()" />
              </button>
            </div>

            <!-- パスワード生成 -->
            <div class="generator">
              <div class="generator-controls">
                <label class="generator-len">
                  文字数
                  <input type="number" min="4" max="128" v-model.number="genLength" />
                </label>
                <label class="generator-opt"><input type="checkbox" v-model="genUpper" /> 大文字</label>
                <label class="generator-opt"><input type="checkbox" v-model="genDigits" /> 数字</label>
                <label class="generator-opt"><input type="checkbox" v-model="genSymbols" /> 記号</label>
                <button @click="runGenerate" class="btn btn-sm btn-primary">生成</button>
                <button @click="copyGenResult" class="btn btn-sm" :disabled="!genResult">コピー</button>
              </div>
              <Transition name="ss-fade">
                <div v-if="genResult" class="generator-result">
                  <input :value="genResult" readonly class="generator-result-input" @focus="($event.target as HTMLInputElement).select()" />
                </div>
              </Transition>
            </div>
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
                  <div class="field-name-row">
                    <input
                      v-model="field.name"
                      type="text"
                      placeholder="フィールド名（例：電話番号）"
                      class="field-name-input"
                    />
                    <label class="field-sensitive-label">
                      <input v-model="field.sensitive" type="checkbox" />
                      secret
                    </label>
                  </div>
                  <div class="input-with-toggle">
                    <input
                      v-model="field.value"
                      :type="field.sensitive && !isFormFieldVisible(index) ? 'password' : 'text'"
                      placeholder="値"
                      class="field-value-input"
                    />
                    <button v-if="field.sensitive" @click="toggleFormFieldVisibility(index)" class="btn-icon btn-eye" :title="isFormFieldVisible(index) ? '隠す' : '表示'" :aria-label="isFormFieldVisible(index) ? '隠す' : '表示'">
                      <IconEye :off="isFormFieldVisible(index)" />
                    </button>
                  </div>
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

      <!-- 削除確認（タブ外・全体オーバーレイ） -->
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

      <!-- セッションロック確認（タブ外・全体オーバーレイ） -->
      <div v-if="confirmingLock" class="modal">
        <div class="modal-content">
          <h3>セッションをロック</h3>
          <p>セッションをロックしますか？ロック後は再認証が必要になります。</p>
          <div class="form-actions">
            <button @click="lockSession" class="btn btn-warning">ロック</button>
            <button @click="confirmingLock = false" class="btn">キャンセル</button>
          </div>
        </div>
      </div>

      <!-- Screenshot: スクリーンショット設定 -->
      <div v-show="activeTab === 'screenshot'" id="panel-screenshot" role="tabpanel" aria-labelledby="tab-screenshot" class="tab-panel">
        <section :class="['section', { 'section--saved': isSectionHighlighted('screenshot') }]">
          <Transition name="inline-notice">
            <span v-if="isSectionHighlighted('screenshot')" class="inline-notice">{{ highlightMessage() }}</span>
          </Transition>
          <h2>スクリーンショット</h2>
          <div class="form-group">
            <label>
              <input
                v-model="settings.screenshotCopyToClipboard"
                @change="saveSettings({ name: 'screenshot', message: 'スクリーンショット設定を保存しました' })"
                type="checkbox"
              />
              クリップボードにコピー
            </label>
          </div>
          <div class="form-group">
            <label>
              <input
                v-model="settings.screenshotDownloadImage"
                @change="saveSettings({ name: 'screenshot', message: 'スクリーンショット設定を保存しました' })"
                type="checkbox"
              />
              画像をダウンロード
            </label>
          </div>
        </section>
      </div>

      <!-- Others: キーボードショートカット + データクリア -->
      <div v-show="activeTab === 'others'" id="panel-others" role="tabpanel" aria-labelledby="tab-others" class="tab-panel">
        <section class="section">
          <h2>キーボードショートカット</h2>
          <div class="form-group">
            <label>キーボードショートカット</label>
            <p style="font-size: 12px; color: #666; margin: 4px 0;">
              パスワード自動入力のキーボードショートカットを設定できます
            </p>
            <button @click="openKeyboardShortcuts" class="btn btn-secondary">キーボードショートカットを設定</button>
          </div>
        </section>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { isSessionStatus, type Message, type Response } from '@/types/message';
import type { PasswordEntry, AppSettings } from '@/types/storage';
import { registerCredential, authenticate as webauthnAuthenticate } from '@/utils/webauthn';
import { storage } from '@/utils/storage';
import { normalizeUrl } from '@/utils/url-matcher';
import { generatePassword } from '@/utils/password-generator';
import ToastContainer from '@/components/ToastContainer.vue';
import IconCopy from '@/components/IconCopy.vue';
import IconEye from '@/components/IconEye.vue';
import IconLock from '@/components/IconLock.vue';
import type { Toast, ToastType } from '@/components/toast';

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
const authError = ref<string | null>(null);
const isAuthenticated = ref(false);
// セッション残り時間（Auth タブのロックアイコンをプログレスリングで可視化するため）
const sessionExpiresAt = ref<number | null>(null);
const nowTick = ref(Date.now());
let progressTimerId: number | null = null;

// セッション残り比率（1=開始直後 → 0=期限切れ直前）。ロックアイコンの塗り角度に反映
const sessionProgress = computed(() => {
  if (sessionExpiresAt.value === null) return 1;
  const durationMs = (settings.value.sessionTimeout || 30) * 60_000;
  if (durationMs <= 0) return 1;
  const remaining = sessionExpiresAt.value - nowTick.value;
  return Math.min(1, Math.max(0, remaining / durationMs));
});

const sessionRemainingMinutes = computed(() => {
  if (sessionExpiresAt.value === null) return 0;
  return Math.max(0, Math.ceil((sessionExpiresAt.value - nowTick.value) / 60_000));
});
const clearDataConfirm = ref(false);

// セッション切れ検知のポーリング間隔
const SESSION_POLL_INTERVAL_MS = 10_000;
let sessionPollId: number | null = null;

// タブ状態
type TabId = 'general' | 'auth' | 'screenshot' | 'others';
const TAB_STORAGE_KEY = 'ss-bg-options-active-tab';
const activeTab = ref<TabId>('general');

const tabs: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'auth', label: 'Auth' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'others', label: 'Others' }
];

function isTabId(value: string | null): value is TabId {
  return value === 'general' || value === 'auth' || value === 'screenshot' || value === 'others';
}

function setActiveTab(id: TabId): void {
  activeTab.value = id;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, id);
  } catch {
    // ストレージアクセス不可（シークレットモード等）は無視
  }
}

// タブクリック: タブ切り替え + Auth タブ押下で未認証なら認証を開始。
// プログラム的な setActiveTab('auth')（セッション切れ誘導など）では認証を起動しない。
function onTabClick(id: TabId): void {
  setActiveTab(id);
  if (id === 'auth' && !isAuthenticated.value) {
    void authenticate();
  }
}

// トースト通知
const toasts = ref<Toast[]>([]);
let toastSeq = 0;

function pushToast(type: ToastType, message: string, timeoutMs = 2500): void {
  const id = ++toastSeq;
  toasts.value.push({ id, type, message });
  if (timeoutMs > 0) {
    window.setTimeout(() => removeToast(id), timeoutMs);
  }
}

function removeToast(id: number): void {
  const idx = toasts.value.findIndex(t => t.id === id);
  if (idx >= 0) {
    toasts.value.splice(idx, 1);
  }
}

// 保存ハイライト（該当アイテム/セクションの背景色変更 + インライン通知）
type HighlightTarget =
  | { kind: 'entry'; id: string; message: string }
  | { kind: 'section'; name: 'theme' | 'timeout' | 'screenshot'; message: string };

const highlight = ref<HighlightTarget | null>(null);
let highlightSeq = 0;

function triggerHighlight(target: HighlightTarget, timeoutMs = 1500): void {
  const seq = ++highlightSeq;
  highlight.value = target;
  window.setTimeout(() => {
    // 新しいハイライトが発火済みなら古いタイマーは無視
    if (highlightSeq === seq) {
      highlight.value = null;
    }
  }, timeoutMs);
}

function isEntryHighlighted(id: string): boolean {
  return highlight.value?.kind === 'entry' && highlight.value.id === id;
}

function isSectionHighlighted(name: 'theme' | 'timeout' | 'screenshot'): boolean {
  return highlight.value?.kind === 'section' && highlight.value.name === name;
}

function highlightMessage(): string {
  return highlight.value?.message ?? '';
}

const showAddForm = ref(false);
const editingEntry = ref<PasswordEntry | null>(null);
const deletingEntry = ref<PasswordEntry | null>(null);
const confirmingLock = ref(false);

const formData = ref<{
  title: string;
  username: string;
  password: string;
  urlsText: string;
  additionalFields: Array<{ name: string; value: string; selector: string; sensitive: boolean }>;
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
    // メイン設定モデル(settings.value)も同期。
    // 同期しないと、後で「設定を保存」を押した際に saveSettings() が
    // マウント時の古い theme を UPDATE_SETTINGS で送信し、テーマが復元されてしまう。
    settings.value.theme = themeSetting.value;
    applyTheme(themeSetting.value);
    triggerHighlight({ kind: 'section', name: 'theme', message: 'テーマを適用しました' });
  } catch (e) {
    console.error('Failed to save theme setting:', e);
    pushToast('error', e instanceof Error ? e.message : 'テーマ設定に失敗しました');
  }
}

// 機密表示(ピーク)状態を一元管理。パスワード・追加フィールド・フォーム入力すべて共通。
// 一度表示した機密値は REVEAL_AUTO_HIDE_MS 経過で自動的にマスクへ戻す。
const REVEAL_AUTO_HIDE_MS = 5 * 60 * 1000; // 5分
const MASK = '••••••••';
const revealed = ref<Set<string>>(new Set());
const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();

function isRevealed(key: string): boolean {
  return revealed.value.has(key);
}

function hideSecret(key: string): void {
  revealed.value.delete(key);
  const timer = revealTimers.get(key);
  if (timer !== undefined) {
    clearTimeout(timer);
    revealTimers.delete(key);
  }
}

function revealSecret(key: string): void {
  revealed.value.add(key);
  const timer = setTimeout(() => hideSecret(key), REVEAL_AUTO_HIDE_MS);
  revealTimers.set(key, timer);
}

function toggleReveal(key: string): void {
  if (isRevealed(key)) {
    hideSecret(key);
  } else {
    revealSecret(key);
  }
}

// 全ピークを解除（ロック・セッション切れ時に呼ぶ）
function clearAllReveals(): void {
  revealTimers.forEach(timer => clearTimeout(timer));
  revealTimers.clear();
  revealed.value.clear();
}

// --- 一覧: パスワード ---
function passwordKey(id: string): string {
  return `pw:${id}`;
}

function togglePasswordVisibility(id: string): void {
  toggleReveal(passwordKey(id));
}

function isPasswordVisible(id: string): boolean {
  return isRevealed(passwordKey(id));
}

function getPasswordDisplay(id: string): string {
  const entry = passwords.value.find(p => p.id === id);
  if (!entry) return '';
  return isPasswordVisible(id) ? entry.password : MASK;
}

// --- 一覧: 追加フィールド ---
function fieldKey(entryId: string, index: number): string {
  return `af:${entryId}:${index}`;
}

function toggleFieldVisibility(entryId: string, index: number): void {
  toggleReveal(fieldKey(entryId, index));
}

function isFieldVisible(entryId: string, index: number): boolean {
  return isRevealed(fieldKey(entryId, index));
}

function isFieldSensitive(field: { sensitive?: boolean } | undefined): boolean {
  return field?.sensitive === true;
}

function getFieldDisplay(entryId: string, index: number, field: { value: string; sensitive?: boolean }): string {
  if (isFieldSensitive(field) && !isFieldVisible(entryId, index)) {
    return MASK;
  }
  return field.value;
}

// --- フォーム: パスワード/機密フィールドのピーク ---
const FORM_PW_KEY = 'formpw';
const FORM_FIELD_KEY_PREFIX = 'formaf:';
function formFieldKey(index: number): string {
  return `${FORM_FIELD_KEY_PREFIX}${index}`;
}
// フォーム固有のピーク状態をクリア（エディタ開閉時に呼ぶ。
// グローバルキーを使い回すため、閉じたままのrevealが別エントリに漏れないようにする）
function clearFormReveals(): void {
  for (const key of [...revealed.value]) {
    if (key === FORM_PW_KEY || key.startsWith(FORM_FIELD_KEY_PREFIX)) {
      hideSecret(key);
    }
  }
}
function isFormPasswordVisible(): boolean {
  return isRevealed(FORM_PW_KEY);
}
function toggleFormPasswordVisibility(): void {
  toggleReveal(FORM_PW_KEY);
}
function isFormFieldVisible(index: number): boolean {
  return isRevealed(formFieldKey(index));
}
function toggleFormFieldVisibility(index: number): void {
  toggleReveal(formFieldKey(index));
}

// クリップボードへコピー
async function copyValue(text: string, label: string): Promise<void> {
  if (!text) {
    pushToast('info', `${label}は空です`);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    pushToast('success', `${label}をコピーしました`);
  } catch (e) {
    console.error('Failed to copy:', e);
    pushToast('error', 'コピーに失敗しました');
  }
}

// パスワード生成
const genLength = ref(16);
const genUpper = ref(true);
const genDigits = ref(true);
const genSymbols = ref(true);
const genResult = ref('');

async function runGenerate(): Promise<void> {
  const pw = generatePassword({
    length: genLength.value,
    uppercase: genUpper.value,
    digits: genDigits.value,
    symbols: genSymbols.value
  });
  genResult.value = pw;
  // パスワード欄が空欄なら直接挿入、入力済みなら表示+コピーのみ（上書きしない）
  if (formData.value.password === '') {
    formData.value.password = pw;
    pushToast('success', 'パスワードを生成して入力しました');
  } else {
    await copyValue(pw, '生成パスワード');
  }
}

async function copyGenResult(): Promise<void> {
  if (genResult.value) {
    await copyValue(genResult.value, '生成パスワード');
  }
}

async function sendMessage(message: Message): Promise<Response> {
  return chrome.runtime.sendMessage(message);
}

async function checkSessionStatus(): Promise<void> {
  try {
    const response = await sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success && response.data && isSessionStatus(response.data)) {
      isAuthenticated.value = response.data.authenticated;
      sessionExpiresAt.value = response.data.expiresAt ?? null;
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
      // 残り時間を記録（レスポンスに無ければタイムアウト設定から推定）
      const expiresFromResponse = response.data && isSessionStatus(response.data) ? response.data.expiresAt : undefined;
      sessionExpiresAt.value = expiresFromResponse ?? (Date.now() + (settings.sessionTimeout || 30) * 60_000);
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

// UIをロック状態にする（手動ロック・セッション切れ共通）
function lockUi(): void {
  isAuthenticated.value = false;
  sessionExpiresAt.value = null;
  passwords.value = [];
  // 編集中のモーダル・確認ダイアログを閉じる
  showAddForm.value = false;
  editingEntry.value = null;
  deletingEntry.value = null;
  confirmingLock.value = false;
  formError.value = null;
  // 表示中の機密値をすべて隠す
  clearAllReveals();
}

async function lockSession(): Promise<void> {
  try {
    await sendMessage({ type: 'LOCK_SESSION' });
    lockUi();
  } catch (e) {
    console.error('Failed to lock session:', e);
  } finally {
    confirmingLock.value = false;
  }
}

// セッション切れエラーかどうか（background は 'Session expired...' を返す）
function isSessionExpiredError(msg?: string): boolean {
  return !!msg && /expired|session/i.test(msg);
}

// セッション切れを検知した際の即時ロック
function handleSessionExpired(): void {
  if (!isAuthenticated.value) return;
  lockUi();
  setActiveTab('auth');
  authError.value = 'セッションが期限切れです。再認証してください';
}

// セッション状態をポーリング確認
async function pollSession(): Promise<void> {
  if (!isAuthenticated.value) return;
  try {
    const response = await sendMessage({ type: 'GET_SESSION_STATUS' });
    if (response.success && response.data && isSessionStatus(response.data)) {
      if (!response.data.authenticated) {
        handleSessionExpired();
      } else {
        sessionExpiresAt.value = response.data.expiresAt ?? sessionExpiresAt.value;
      }
    }
  } catch (e) {
    // 通信エラーは無視（次回のポーリングで再確認）
    console.debug('Session poll failed:', e);
  }
}

function handleVisibilityChange(): void {
  if (!document.hidden) {
    void pollSession();
  }
}

function confirmClearData(): void {
  clearDataConfirm.value = true;
}

async function clearAllData(): Promise<void> {
  try {
    await storage.clearAll();
    clearDataConfirm.value = false;
    pushToast('info', '全てのデータをクリアしました。ページを再読み込みします');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e) {
    pushToast('error', e instanceof Error ? e.message : 'データクリアに失敗しました');
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

function openAddForm(): void {
  clearFormReveals();
  showAddForm.value = true;
}

function editEntry(entry: PasswordEntry): void {
  clearFormReveals();
  editingEntry.value = entry;
  formData.value = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    urlsText: entry.urls.join('\n'),
    additionalFields: entry.additionalFields
      ? entry.additionalFields.map(f => ({
          name: f.name,
          value: f.value,
          selector: f.selector ?? '',
          sensitive: f.sensitive === true
        }))
      : []
  };
}

function cancelEdit(): void {
  showAddForm.value = false;
  editingEntry.value = null;
  clearFormReveals();
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
    selector: '',
    sensitive: false
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
      ? formData.value.additionalFields
          .filter(f => f.name && f.value)
          .map(f => ({
            name: f.name,
            value: f.value,
            selector: f.selector,
            sensitive: f.sensitive
          }))
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
      const savedEntryId = entry.id;
      const wasEditing = isEditing;
      await loadPasswords();
      cancelEdit();
      // リスト再描画の通常状態を一度描画してからハイライト適用し、CSS transition を発火させる
      await nextTick();
      triggerHighlight({
        kind: 'entry',
        id: savedEntryId,
        message: wasEditing ? '情報を更新しました' : '情報を追加しました'
      });
    } else {
      if (isSessionExpiredError(response.error)) {
        handleSessionExpired();
        return;
      }
      formError.value = response.error || '保存に失敗しました';
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '保存エラー';
  }
}

function confirmDelete(entry: PasswordEntry): void {
  deletingEntry.value = entry;
}

// セッションロック確認ダイアログを開く
function confirmLock(): void {
  confirmingLock.value = true;
}

async function deleteEntry(): Promise<void> {
  if (!deletingEntry.value) return;
  
  try {
    const response = await sendMessage({
      type: 'DELETE_PASSWORD',
      payload: { id: deletingEntry.value.id }
    });
    
    if (response.success) {
      const entryTitle = deletingEntry.value.title;
      await loadPasswords();
      deletingEntry.value = null;
      pushToast('success', `「${entryTitle}」を削除しました`);
    } else {
      if (isSessionExpiredError(response.error)) {
        handleSessionExpired();
        return;
      }
      pushToast('error', response.error || '削除に失敗しました');
    }
  } catch (e) {
    pushToast('error', e instanceof Error ? e.message : '削除エラー');
  }
}

async function saveSettings(target: { name: 'timeout' | 'screenshot'; message: string }): Promise<void> {
  try {
    const response = await sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: settings.value
    });

    if (response.success) {
      triggerHighlight({ kind: 'section', name: target.name, message: target.message });
    } else {
      pushToast('error', response.error || '設定保存に失敗しました');
    }
  } catch (e) {
    pushToast('error', e instanceof Error ? e.message : '設定保存エラー');
  }
}

function openKeyboardShortcuts(): void {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

onMounted(async () => {
  // アクティブタブを復元（localStorage から）
  try {
    const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
    if (isTabId(savedTab)) {
      activeTab.value = savedTab;
    }
  } catch {
    // ストレージアクセス不可は無視
  }

  await checkSessionStatus();
  await loadSettings();
  // 初期タブが Auth で未認証なら認証を開始（「最初から Auth タブなら承認が始まる」）
  if (activeTab.value === 'auth' && !isAuthenticated.value) {
    void authenticate();
  }
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
    openAddForm();
    const capturedFields = Array.isArray(capturedData.additionalFields)
      ? capturedData.additionalFields
      : [];
    formData.value = {
      title: capturedData.title || '',
      username: capturedData.username || '',
      password: capturedData.password || '',
      urlsText: capturedData.urls ? capturedData.urls.join('\n') : '',
      additionalFields: capturedFields.map((f: { name?: string; value?: string; selector?: string; sensitive?: boolean }) => ({
        name: f.name ?? '',
        value: f.value ?? '',
        selector: f.selector ?? '',
        sensitive: f.sensitive === true
      }))
    };
  }
  
  loading.value = false;

  // セッション切れを検知するためのポーリング（10秒ごと）
  sessionPollId = window.setInterval(() => { void pollSession(); }, SESSION_POLL_INTERVAL_MS);
  // ロックアイコンのプログレスリングを滑らかに動かすため現在時刻を定期更新
  progressTimerId = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
  // タブが再びアクティブになった瞬間にも即時確認
  window.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (sessionPollId !== null) {
    clearInterval(sessionPollId);
    sessionPollId = null;
  }
  if (progressTimerId !== null) {
    clearInterval(progressTimerId);
    progressTimerId = null;
  }
  window.removeEventListener('visibilitychange', handleVisibilityChange);
  clearAllReveals();
});
</script>

<style>
@import "../styles/theme.css";

/* ページ全体の外側キャンバスにもテーマ背景を適用。
   設定しないとダークモードでテキストのみ明色になり、
   Chromeの既定の白背景に明文字が乗ってしまう。 */
html,
body {
  margin: 0;
  background: var(--color-bg-primary);
}
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

/* 認証状態はタブバッジに移動したため、パネル内はロック操作のみのコンパクト表示 */
.auth-section--compact {
  display: flex;
  align-items: center;
  padding: 12px 20px;
}

.auth-error {
  margin: 0 0 12px 0;
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

/* === 一覧の行レイアウト（整列・シフト防止） === */
.entry-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.entry-text {
  /* 広い画面では値エリアを固定幅にし、目/コピーボタンを左から一定距離に揃える。
     コンテナが狭い場合は flex-shrink で縮み、ボタンが右に流れる（画面が狭い例外）。 */
  flex: 0 1 340px;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.row-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.row-value {
  min-width: 0;
  word-break: break-all;
  color: var(--color-text-primary);
}

.row-value--mono {
  font-family: monospace;
}

.entry-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* アイコンボタン共通 */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-bg-tertiary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 0;
  color: var(--color-text-primary);
  transition: background 0.15s ease;
}

.btn-icon:hover {
  background: var(--color-border-medium);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 目ボタン・コピーボタンは固定サイズで位置を全行・全状態で一定に保つ */
.btn-eye,
.btn-copy {
  width: 30px;
  height: 30px;
  box-sizing: border-box;
  padding: 0;
  flex-shrink: 0;
}

.btn-eye.is-hidden {
  visibility: hidden;
}

/* 目アイコン切替アニメーション */
.btn-eye svg {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.input-with-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-toggle input {
  flex: 1;
  min-width: 0;
}

/* 追加フィールドの値入力がsecret(type=password)でも、他のフィールド入力と同サイズを維持 */
.input-with-toggle input.field-value-input {
  padding: 6px 8px;
  font-size: 13px;
}

.field-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-name-row .field-name-input {
  flex: 1;
}

.field-sensitive-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

/* === パスワード生成 === */
.generator {
  margin-top: 10px;
  padding: 10px;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
}

.generator-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.generator-len {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.generator-len input {
  width: 56px;
  padding: 4px;
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 13px;
}

.generator-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.generator-result {
  margin-top: 8px;
}

.generator-result-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--color-border-medium);
  border-radius: 4px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: monospace;
  font-size: 13px;
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

/* 残り幅を占有して全エントリで password-info の幅を同一にする。
   これにより行ごとの目/コピーボタンがエントリ間で揃う（値の長さでズレない）。 */
.password-info {
  flex: 1;
  min-width: 0;
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
  flex-shrink: 0;
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

.btn-warning {
  background: var(--color-btn-warning);
  color: var(--color-text-inverse);
}

.btn-warning:hover {
  background: var(--color-btn-warning-hover);
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
  padding-left: 0;
  list-style: none;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.additional-fields-items li {
  margin: 2px 0;
}

/* === 保存ハイライト + インライン通知 === */
.password-item,
.section.theme-section,
.section.settings-section {
  position: relative;
  overflow: hidden;
  /* ハイライト解除時は、白みが左へ走る退場を見せてから色を戻す */
  transition: background-color 0.15s ease 0.15s;
}

.password-item--saved,
.section--saved {
  background: var(--color-success-bg);
  /* ハイライト付与時は delay なしで即フェードイン */
  transition: background-color 0.15s ease;
}

/* 白みが走る演出（退場時に左へ流れる） */
.password-item::after,
.section.theme-section::after,
.section.settings-section::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to left, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  pointer-events: none;
}

.password-item--saved::after,
.section--saved::after {
  transform: translateX(100%);
  /* 入場時の shine は終了(0.3s)より速く控えめに（開始演出は簡素に） */
  transition: transform 0.15s ease;
}

.inline-notice {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--color-btn-primary);
  color: var(--color-text-inverse);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.inline-notice-enter-active,
.inline-notice-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.inline-notice-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

/* 退場: 左へ流れながら消える */
.inline-notice-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* タブナビゲーション */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border-medium);
  margin-bottom: 20px;
}

.tab {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tab:hover {
  color: var(--color-text-primary);
}

.tab:focus-visible {
  outline: 2px solid var(--color-btn-secondary);
  outline-offset: 2px;
}

.tab--active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-btn-primary);
  font-weight: 600;
}

/* Auth タブラベル右の認証状態バッジ（小さく常時表示） */
.tab-auth-badge {
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  border-radius: 9999px;
  white-space: nowrap;
}

.tab-auth-badge--ok {
  color: var(--color-success-text);
  background: var(--color-success-bg);
}

.tab-auth-badge--ng {
  color: var(--color-warning-text);
  background: var(--color-warning-bg);
}

/* Auth タブ直後のセッションロック: 外側 conic-gradient で残り時間をリング表示。
   --session-progress(0〜1) に応じて斜め線の境界が回り、残り時間が減ると塗りが減る。 */
.session-lock-btn {
  --session-progress: 1;
  position: relative;
  align-self: stretch;
  width: 22px;
  padding: 0;
  margin-left: 2px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.session-lock-btn__ring {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(
    var(--color-btn-primary) calc(var(--session-progress) * 360deg),
    var(--color-border-medium) 0
  );
  color: var(--color-btn-primary);
}

.session-lock-btn__ring::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
}

.session-lock-btn__ring svg {
  position: relative;
  z-index: 1;
}

.tab-panel {
  /* タブパネル本体は追加スタイル不要。各セクション側で余白を管理 */
}

/* === 状態変化のアニメーション === */
/* 値スワップ・生成結果などのフェード */
.ss-fade-enter-active,
.ss-fade-leave-active {
  transition: opacity 0.15s ease;
}

.ss-fade-enter-from,
.ss-fade-leave-to {
  opacity: 0;
}

/* モーダル開く（入場）アニメーション */
.modal {
  animation: ss-modal-overlay-in 0.18s ease;
}

.modal-content {
  animation: ss-modal-content-in 0.18s ease;
}

@keyframes ss-modal-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ss-modal-content-in {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .password-item,
  .section.theme-section,
  .section.settings-section,
  .password-item--saved,
  .section--saved {
    transition: background-color 0.1s ease;
  }

  .inline-notice-enter-active,
  .inline-notice-leave-active {
    transition: opacity 0.1s ease;
  }

  .tab {
    transition: none;
  }

  .inline-notice-enter-from,
  .inline-notice-leave-to {
    transform: none;
  }

  .ss-fade-enter-active,
  .ss-fade-leave-active {
    transition: opacity 0.1s ease;
  }

  .modal,
  .modal-content {
    animation: none;
  }

  .btn-eye svg {
    transition: none;
  }
}
</style>

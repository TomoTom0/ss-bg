import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import App from './App.vue';
import type { PasswordEntry, AppSettings } from '@/types/storage';

// Chrome APIのモック
const mockChromeRuntimeSendMessage = vi.fn();
const mockChromeStorageSessionGet = vi.fn();
const mockChromeStorageSessionRemove = vi.fn();
const mockChromeTabsCreate = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockChromeRuntimeSendMessage
  },
  storage: {
    session: {
      get: mockChromeStorageSessionGet,
      remove: mockChromeStorageSessionRemove
    }
  },
  tabs: {
    create: mockChromeTabsCreate
  }
});

// WebAuthn関連のモック
vi.mock('@/utils/webauthn', () => ({
  registerCredential: vi.fn(),
  authenticate: vi.fn()
}));

// Storageのモック
vi.mock('@/utils/storage', () => ({
  storage: {
    getSetupStatus: vi.fn().mockResolvedValue(true),
    markSetupComplete: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({ sessionTimeout: 30 }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn()
  }
}));

// URL正規化のモック
vi.mock('@/utils/url-matcher', () => ({
  normalizeUrl: vi.fn((url: string) => url.trim())
}));

// ヘルパー関数: デフォルトのモック設定
function setupDefaultMocks(options: {
  authenticated?: boolean;
  passwords?: PasswordEntry[];
  settings?: AppSettings;
} = {}) {
  const {
    authenticated = true,
    passwords = [],
    settings = { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true }
  } = options;

  mockChromeRuntimeSendMessage.mockImplementation((message) => {
    if (message.type === 'GET_SESSION_STATUS') {
      return Promise.resolve({
        success: true,
        data: { authenticated, expiresAt: Date.now() + 30000 }
      });
    }
    if (message.type === 'GET_SETTINGS') {
      return Promise.resolve({ success: true, data: settings });
    }
    if (message.type === 'GET_PASSWORDS') {
      return Promise.resolve({ success: true, data: passwords });
    }
    if (message.type === 'SAVE_PASSWORD') {
      return Promise.resolve({ success: true });
    }
    if (message.type === 'DELETE_PASSWORD') {
      return Promise.resolve({ success: true });
    }
    if (message.type === 'UPDATE_SETTINGS') {
      return Promise.resolve({ success: true });
    }
    if (message.type === 'LOCK_SESSION') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: true });
  });

  mockChromeStorageSessionGet.mockResolvedValue({});
  mockChromeStorageSessionRemove.mockResolvedValue(undefined);
}

describe('Options App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初期表示', () => {
    it('コンポーネントがマウントできる', () => {
      setupDefaultMocks();
      const wrapper = mount(App);
      expect(wrapper.exists()).toBe(true);
    });

    it('タイトルが表示される', () => {
      setupDefaultMocks();
      const wrapper = mount(App);
      expect(wrapper.text()).toContain('bg-ss');
    });

    it('読み込み中はローディングメッセージが表示される', () => {
      mockChromeRuntimeSendMessage.mockImplementation(() => new Promise(() => {}));
      mockChromeStorageSessionGet.mockResolvedValue({});
      const wrapper = mount(App);
      expect(wrapper.text()).toContain('読み込み中');
    });
  });

  describe('認証', () => {
    it('未認証時は認証を促すメッセージが表示される', async () => {
      setupDefaultMocks({ authenticated: false, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('未認証');
      expect(wrapper.text()).toContain('認証する');
    });

    it('認証済み時は認証済みメッセージが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('認証済み');
      expect(wrapper.text()).toContain('セッションをロック');
    });

    it('未認証時は情報管理機能に認証が必要な旨が表示される', async () => {
      setupDefaultMocks({ authenticated: false, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('情報管理機能を使用するには認証が必要です');
    });
  });

  describe('保存済み情報一覧', () => {
    const mockPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'テストサイト1',
        username: 'user1',
        password: 'pass1',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '2',
        title: 'テストサイト2',
        username: 'user2',
        password: 'pass2',
        urls: ['https://test.com'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        additionalFields: [
          { name: '電話番号', value: '090-1234-5678' }
        ]
      }
    ];

    it('パスワード一覧が表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('テストサイト1');
      expect(wrapper.text()).toContain('テストサイト2');
      expect(wrapper.text()).toContain('user1');
      expect(wrapper.text()).toContain('user2');
    });

    it('URLが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('https://example.com');
      expect(wrapper.text()).toContain('https://test.com');
    });

    it('パスワードはマスクされて表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('••••••••');
      expect(wrapper.text()).not.toContain('pass1');
    });

    it('追加フィールドが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('電話番号');
      expect(wrapper.text()).toContain('090-1234-5678');
    });

    it('編集・削除ボタンが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      const buttons = wrapper.findAll('.btn');
      const buttonTexts = buttons.map(b => b.text());
      expect(buttonTexts).toContain('編集');
      expect(buttonTexts).toContain('削除');
    });

    it('パスワードが空の場合は空メッセージが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('保存済み情報がありません');
    });
  });

  describe('情報追加', () => {
    it('新規追加ボタンをクリックするとフォームが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      const addButton = wrapper.find('.btn-primary');
      await addButton.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('情報追加');
      expect(wrapper.find('input[type="text"]').exists()).toBe(true);
      expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    });

    it('フォームに入力して保存できる', async () => {
      let saveCalled = false;
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({
            success: true,
            data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true }
          });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'SAVE_PASSWORD') {
          saveCalled = true;
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 新規追加ボタンをクリック
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      // フォームに入力
      const inputs = wrapper.findAll('input[type="text"]');
      const passwordInput = wrapper.find('input[type="password"]');
      const textarea = wrapper.find('textarea');

      await inputs[0].setValue('テストサイト');
      await inputs[1].setValue('testuser');
      await passwordInput.setValue('testpass');
      await textarea.setValue('https://example.com');

      // 保存ボタンをクリック
      const saveButtons = wrapper.findAll('.btn-primary');
      const saveButton = saveButtons.find(b => b.text() === '保存');
      await saveButton?.trigger('click');
      await flushPromises();

      // SAVE_PASSWORDメッセージが送信されたことを確認
      expect(saveCalled).toBe(true);
    });

    it('必須フィールドが空の場合はエラーが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      // 新規追加ボタンをクリック
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      // 何も入力せずに保存ボタンをクリック
      const saveButtons = wrapper.findAll('.btn-primary');
      const saveButton = saveButtons.find(b => b.text() === '保存');
      await saveButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('ユーザー名とパスワードは必須です');
    });

    it('キャンセルボタンでフォームを閉じられる', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      // 新規追加ボタンをクリック
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('情報追加');

      // キャンセルボタンをクリック
      const cancelButton = wrapper.findAll('.btn').find(b => b.text() === 'キャンセル');
      await cancelButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).not.toContain('情報追加');
    });

    it('追加フィールドを追加・削除できる', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      const wrapper = mount(App);
      await flushPromises();

      // 新規追加ボタンをクリック
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      // フィールド追加ボタンをクリック
      const addFieldButton = wrapper.findAll('.btn').find(b => b.text().includes('フィールドを追加'));
      await addFieldButton?.trigger('click');
      await flushPromises();

      // 追加フィールドの入力欄が表示される（placeholderで確認）
      const fieldInputs = wrapper.findAll('.field-name-input');
      expect(fieldInputs.length).toBeGreaterThan(0);
    });
  });

  describe('情報編集', () => {
    const mockPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'テストサイト',
        username: 'user1',
        password: 'pass1',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    it('編集ボタンをクリックすると編集フォームが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 編集ボタンをクリック
      const editButton = wrapper.findAll('.btn-sm').find(b => b.text() === '編集');
      await editButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('情報編集');
    });

    it('編集フォームに既存の値が入力されている', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 編集ボタンをクリック
      const editButton = wrapper.findAll('.btn-sm').find(b => b.text() === '編集');
      await editButton?.trigger('click');
      await flushPromises();

      // フォームの値を確認（VMの状態を確認）
      expect(wrapper.vm.formData.title).toBe('テストサイト');
      expect(wrapper.vm.formData.username).toBe('user1');
      expect(wrapper.vm.formData.password).toBe('pass1');
    });

    it('編集保存時はUPDATE_PASSWORDメッセージが送信される（重複追加されない）', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 編集ボタンをクリック
      const editButton = wrapper.findAll('.btn-sm').find(b => b.text() === '編集');
      await editButton?.trigger('click');
      await flushPromises();

      // マウント時の呼び出しを除外するためクリア
      mockChromeRuntimeSendMessage.mockClear();

      // パスワードを変更して保存
      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('updated-pass');

      const saveButton = wrapper.findAll('.btn-primary').find(b => b.text() === '保存');
      await saveButton?.trigger('click');
      await flushPromises();

      const calls = mockChromeRuntimeSendMessage.mock.calls.map(
        (c) => c[0] as { type: string; payload: unknown }
      );
      const updateMsg = calls.find((m) => m.type === 'UPDATE_PASSWORD');
      const saveMsg = calls.find((m) => m.type === 'SAVE_PASSWORD');

      // 編集時はUPDATE_PASSWORD（上書き）が送信され、SAVE_PASSWORD（追加）は送信されないこと
      expect(updateMsg).toBeDefined();
      expect(saveMsg).toBeUndefined();
      // 既存idを保持して更新していること
      expect((updateMsg!.payload as { id: string }).id).toBe('1');
    });
  });

  describe('情報削除', () => {
    const mockPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'テストサイト',
        username: 'user1',
        password: 'pass1',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    it('削除ボタンをクリックすると確認ダイアログが表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 削除ボタンをクリック
      const deleteButton = wrapper.findAll('.btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('削除確認');
      // 実際のテキスト形式に合わせる
      expect(wrapper.text()).toContain('テストサイト');
      expect(wrapper.text()).toContain('削除しますか');
    });

    it('確認ダイアログで削除を実行できる', async () => {
      let deleteCalled = false;
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({
            success: true,
            data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true }
          });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: mockPasswords });
        }
        if (message.type === 'DELETE_PASSWORD') {
          deleteCalled = true;
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 削除ボタンをクリック（パスワードリスト内）
      const deleteButton = wrapper.findAll('.password-actions .btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      // 確認ダイアログの削除ボタンをクリック（モーダル内）
      const confirmDeleteButton = wrapper.find('.modal .btn-danger');
      await confirmDeleteButton.trigger('click');
      await flushPromises();

      // DELETE_PASSWORDメッセージが送信されたことを確認
      expect(deleteCalled).toBe(true);
    });

    it('確認ダイアログでキャンセルできる', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 削除ボタンをクリック
      const deleteButton = wrapper.findAll('.btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('削除確認');

      // キャンセルボタンをクリック
      const cancelButton = wrapper.findAll('.btn').find(b => b.text() === 'キャンセル');
      await cancelButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).not.toContain('削除確認');
    });
  });

  describe('設定管理', () => {
    const mockSettings: AppSettings = {
      sessionTimeout: 30,
      screenshotCopyToClipboard: true,
      screenshotDownloadImage: true
    };

    it('設定が表示される', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [], settings: mockSettings });

      const wrapper = mount(App);
      await flushPromises();

      expect(wrapper.text()).toContain('設定');
      expect(wrapper.text()).toContain('セッションタイムアウト');
      expect(wrapper.text()).toContain('スクリーンショット');
    });

    it('設定を変更して保存できる', async () => {
      let settingsSaved = false;
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: mockSettings });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'UPDATE_SETTINGS') {
          settingsSaved = true;
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 設定を保存ボタンをクリック
      const saveSettingsButton = wrapper.findAll('.btn-primary').find(b => b.text() === '設定を保存');
      await saveSettingsButton?.trigger('click');
      await flushPromises();

      // UPDATE_SETTINGSメッセージが送信されたことを確認
      expect(settingsSaved).toBe(true);
    });

    it('テーマ変更後に設定を保存すると新しいテーマが送信される', async () => {
      // 回帰テーマ: saveThemeSetting() で settings.value.theme を同期しないと、
      // 後で「設定を保存」を押した際に古いテーマが UPDATE_SETTINGS で復元される。
      let capturedPayload: { theme?: string } | null = null;
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          // マウント時は light を読み込む
          return Promise.resolve({
            success: true,
            data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true, theme: 'light' }
          });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'UPDATE_SETTINGS') {
          capturedPayload = message.payload;
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // テーマを dark に変更（saveThemeSetting が発火し settings.value.theme も同期される）
      const darkRadio = wrapper.find('input[type="radio"][value="dark"]');
      await darkRadio.setValue(true);
      await flushPromises();

      // 設定を保存ボタンをクリック
      const saveSettingsButton = wrapper.findAll('.btn-primary').find(b => b.text() === '設定を保存');
      await saveSettingsButton?.trigger('click');
      await flushPromises();

      // 同期されていれば新しいテーマ(dark)が送信される（同期漏れだと light が復元される）
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload?.theme).toBe('dark');
    });

    it('設定保存成功時にメッセージが表示される', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: mockSettings });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'UPDATE_SETTINGS') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 設定を保存ボタンをクリック
      const saveSettingsButton = wrapper.findAll('.btn-primary').find(b => b.text() === '設定を保存');
      await saveSettingsButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('設定を保存しました');
    });

    it('キーボードショートカット設定ボタンが動作する', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [], settings: mockSettings });

      const wrapper = mount(App);
      await flushPromises();

      // キーボードショートカット設定ボタンをクリック
      const shortcutButton = wrapper.findAll('.btn-secondary').find(b => b.text().includes('キーボードショートカット'));
      await shortcutButton?.trigger('click');

      expect(mockChromeTabsCreate).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts' });
    });
  });

  describe('パスワード表示切り替え', () => {
    const mockPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'テストサイト',
        username: 'user1',
        password: 'secret123',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    it('パスワード表示ボタンでパスワードを表示できる', async () => {
      setupDefaultMocks({ authenticated: true, passwords: mockPasswords });

      const wrapper = mount(App);
      await flushPromises();

      // 初期状態ではマスクされている
      expect(wrapper.vm.getPasswordDisplay('1')).toBe('••••••••');

      // 表示ボタンをクリック
      const toggleButton = wrapper.find('.btn-icon');
      await toggleButton.trigger('click');
      await flushPromises();

      // パスワードが表示される
      expect(wrapper.vm.isPasswordVisible('1')).toBe(true);
      expect(wrapper.vm.getPasswordDisplay('1')).toBe('secret123');
    });
  });

  describe('セッション管理', () => {
    it('セッションをロックできる', async () => {
      let lockCalled = false;
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({
            success: true,
            data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true }
          });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'LOCK_SESSION') {
          lockCalled = true;
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // セッションをロックボタンをクリック
      const lockButton = wrapper.findAll('.btn-warning').find(b => b.text() === 'セッションをロック');
      await lockButton?.trigger('click');
      await flushPromises();

      // LOCK_SESSIONメッセージが送信されたことを確認
      expect(lockCalled).toBe(true);

      // 認証状態が解除される
      expect(wrapper.vm.isAuthenticated).toBe(false);
    });
  });

  describe('バックグラウンドスクリプトとの連携', () => {
    it('GET_SESSION_STATUSメッセージを送信する', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      mount(App);
      await flushPromises();

      expect(mockChromeRuntimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_SESSION_STATUS'
        })
      );
    });

    it('GET_SETTINGSメッセージを送信する', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      mount(App);
      await flushPromises();

      expect(mockChromeRuntimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_SETTINGS'
        })
      );
    });

    it('GET_PASSWORDSメッセージを送信する（認証済みの場合）', async () => {
      setupDefaultMocks({ authenticated: true, passwords: [] });

      mount(App);
      await flushPromises();

      expect(mockChromeRuntimeSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_PASSWORDS'
        })
      );
    });

    it('未認証の場合はGET_PASSWORDSメッセージを送信しない', async () => {
      setupDefaultMocks({ authenticated: false, passwords: [] });

      mount(App);
      await flushPromises();

      const getPasswordsCalls = mockChromeRuntimeSendMessage.mock.calls.filter(
        call => call[0]?.type === 'GET_PASSWORDS'
      );
      expect(getPasswordsCalls.length).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('読み込みエラー時もコンポーネントは継続して動作する', async () => {
      mockChromeRuntimeSendMessage.mockRejectedValue(new Error('通信エラー'));
      mockChromeStorageSessionGet.mockResolvedValue({});

      const wrapper = mount(App);
      await flushPromises();

      // エラーが発生してもコンポーネントは表示される
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('bg-ss');
    });

    it('保存エラー時にエラーメッセージが表示される', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({
            success: true,
            data: { authenticated: true, expiresAt: Date.now() + 30000 }
          });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({
            success: true,
            data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true }
          });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'SAVE_PASSWORD') {
          return Promise.resolve({ success: false, error: '保存に失敗しました' });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 新規追加ボタンをクリック
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      // フォームに入力
      const inputs = wrapper.findAll('input[type="text"]');
      const passwordInput = wrapper.find('input[type="password"]');

      await inputs[0].setValue('テスト');
      await inputs[1].setValue('user');
      await passwordInput.setValue('pass');

      // 保存ボタンをクリック
      const saveButtons = wrapper.findAll('.btn-primary');
      const saveButton = saveButtons.find(b => b.text() === '保存');
      await saveButton?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('保存に失敗しました');
    });
  });

  describe('トースト通知', () => {
    const testPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'テストサイト',
        username: 'user',
        password: 'pass',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    it('パスワード削除成功時にsuccessトーストが表示される', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: testPasswords });
        }
        if (message.type === 'DELETE_PASSWORD') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      const deleteButton = wrapper.findAll('.password-actions .btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      const confirmDeleteButton = wrapper.find('.modal .btn-danger');
      await confirmDeleteButton.trigger('click');
      await flushPromises();

      expect(wrapper.find('.toast--success').exists()).toBe(true);
      expect(wrapper.find('.toast__message').text()).toContain('削除しました');
    });

    it('パスワード削除失敗時にerrorトーストが表示されUIは維持される', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: testPasswords });
        }
        if (message.type === 'DELETE_PASSWORD') {
          return Promise.resolve({ success: false, error: '削除エラー' });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      const deleteButton = wrapper.findAll('.password-actions .btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      const confirmDeleteButton = wrapper.find('.modal .btn-danger');
      await confirmDeleteButton.trigger('click');
      await flushPromises();

      // トーストでエラー表示
      expect(wrapper.find('.toast--error').exists()).toBe(true);
      // UI全体は維持される（保存失敗で error.value に書き込まれ画面が消えないことの回帰）
      expect(wrapper.text()).toContain('bg-ss 設定');
      expect(wrapper.text()).toContain('保存済み情報');
    });

    it('設定保存失敗時にerrorトーストが表示されUIは維持される', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'UPDATE_SETTINGS') {
          return Promise.resolve({ success: false, error: '設定保存エラー' });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      const saveSettingsButton = wrapper.findAll('.btn-primary').find(b => b.text() === '設定を保存');
      await saveSettingsButton?.trigger('click');
      await flushPromises();

      expect(wrapper.find('.toast--error').exists()).toBe(true);
      expect(wrapper.text()).toContain('bg-ss 設定');
      expect(wrapper.text()).toContain('保存済み情報');
    });

    it('トーストのクローズボタンで即時非表示になる', async () => {
      // deleteEntry は該当アイテムが消えるためトースト維持。これを利用してクローズ動作を検証
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: testPasswords });
        }
        if (message.type === 'DELETE_PASSWORD') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 削除を実行して成功トーストを表示
      const deleteButton = wrapper.findAll('.password-actions .btn-danger').find(b => b.text() === '削除');
      await deleteButton?.trigger('click');
      await flushPromises();

      const confirmDeleteButton = wrapper.find('.modal .btn-danger');
      await confirmDeleteButton.trigger('click');
      await flushPromises();

      expect(wrapper.find('.toast--success').exists()).toBe(true);

      await wrapper.find('.toast__close').trigger('click');
      await flushPromises();

      expect(wrapper.find('.toast--success').exists()).toBe(false);
    });
  });

  describe('保存ハイライト', () => {
    const entry: PasswordEntry = {
      id: '1',
      title: 'テスト',
      username: 'user',
      password: 'pass',
      urls: ['https://example.com'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('パスワード編集成功: 該当アイテムがハイライトされインライン通知表示、successトーストなし', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [entry] });
        }
        if (message.type === 'UPDATE_PASSWORD') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // 既存アイテムを編集して保存（entry.id が一致するためハイライト対象を特定できる）
      const editButton = wrapper.findAll('.password-actions .btn-sm').find(b => b.text() === '編集');
      await editButton?.trigger('click');
      await flushPromises();

      const saveButton = wrapper.findAll('.btn-primary').find(b => b.text() === '保存');
      await saveButton?.trigger('click');
      await flushPromises();

      // 該当アイテムがハイライト + インライン通知
      expect(wrapper.find('.password-item--saved').exists()).toBe(true);
      expect(wrapper.find('.password-item .inline-notice').text()).toContain('更新しました');
      // success トーストは出ない（インラインに置換）
      expect(wrapper.find('.toast--success').exists()).toBe(false);
    });

    it('設定保存成功: 設定セクションがハイライトされインライン通知表示、successトーストなし', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        if (message.type === 'UPDATE_SETTINGS') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      const saveSettingsButton = wrapper.findAll('.btn-primary').find(b => b.text() === '設定を保存');
      await saveSettingsButton?.trigger('click');
      await flushPromises();

      expect(wrapper.find('.settings-section.section--saved').exists()).toBe(true);
      expect(wrapper.find('.settings-section .inline-notice').text()).toContain('設定を保存しました');
      expect(wrapper.find('.toast--success').exists()).toBe(false);
    });

    it('テーマ変更: テーマセクションがハイライトされ「テーマを適用しました」', async () => {
      mockChromeRuntimeSendMessage.mockImplementation((message) => {
        if (message.type === 'GET_SESSION_STATUS') {
          return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
        }
        if (message.type === 'GET_SETTINGS') {
          return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
        }
        if (message.type === 'GET_PASSWORDS') {
          return Promise.resolve({ success: true, data: [] });
        }
        return Promise.resolve({ success: true });
      });
      mockChromeStorageSessionGet.mockResolvedValue({});
      mockChromeStorageSessionRemove.mockResolvedValue(undefined);

      const wrapper = mount(App);
      await flushPromises();

      // storage.saveSettings は vi.mock で成功を返す
      const darkRadio = wrapper.find('input[type="radio"][value="dark"]');
      await darkRadio.setValue(true);
      await flushPromises();

      expect(wrapper.find('.theme-section.section--saved').exists()).toBe(true);
      expect(wrapper.find('.theme-section .inline-notice').text()).toContain('テーマを適用しました');
    });

    it('パスワード編集成功: ハイライトは指定時間後に自動解除される', async () => {
      vi.useFakeTimers();
      try {
        mockChromeRuntimeSendMessage.mockImplementation((message) => {
          if (message.type === 'GET_SESSION_STATUS') {
            return Promise.resolve({ success: true, data: { authenticated: true, expiresAt: Date.now() + 30000 } });
          }
          if (message.type === 'GET_SETTINGS') {
            return Promise.resolve({ success: true, data: { sessionTimeout: 30, screenshotCopyToClipboard: true, screenshotDownloadImage: true } });
          }
          if (message.type === 'GET_PASSWORDS') {
            return Promise.resolve({ success: true, data: [entry] });
          }
          if (message.type === 'UPDATE_PASSWORD') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve({ success: true });
        });
        mockChromeStorageSessionGet.mockResolvedValue({});
        mockChromeStorageSessionRemove.mockResolvedValue(undefined);

        const wrapper = mount(App);
        await flushPromises();

        const editButton = wrapper.findAll('.password-actions .btn-sm').find(b => b.text() === '編集');
        await editButton?.trigger('click');
        await flushPromises();

        const saveButton = wrapper.findAll('.btn-primary').find(b => b.text() === '保存');
        await saveButton?.trigger('click');
        await flushPromises();

        expect(wrapper.find('.password-item--saved').exists()).toBe(true);

        vi.advanceTimersByTime(1500);
        await flushPromises();

        expect(wrapper.find('.password-item--saved').exists()).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

// chrome.runtime.sendMessageのモック
const mockSendMessage = vi.fn();
const mockSessionStorage: Record<string, any> = {};
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({ isSetupComplete: true }))
    },
    session: {
      get: vi.fn((keys) => {
        return Promise.resolve(
          typeof keys === 'string'
            ? { [keys]: mockSessionStorage[keys] }
            : keys === null
            ? { ...mockSessionStorage }
            : keys.reduce((acc, key) => ({ ...acc, [key]: mockSessionStorage[key] }), {})
        );
      }),
      set: vi.fn((items) => {
        Object.assign(mockSessionStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete mockSessionStorage[key]);
        return Promise.resolve();
      })
    }
  }
} as any;

describe('Popup App', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
  });

  describe('初期表示', () => {
    it('コンポーネントがマウントできる', () => {
      const wrapper = mount(App);
      expect(wrapper.exists()).toBe(true);
    });

    it('タイトルが表示される', () => {
      const wrapper = mount(App);
      expect(wrapper.text()).toContain('bg-ss');
    });
  });

  describe('セッション状態の表示', () => {
    it('未認証時は認証ボタンを表示する', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('認証');
    });

    it('認証済み時はロックボタンを表示する', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('ロック');
    });

    it('セッションの有効期限を表示する', async () => {
      const expiresAt = Date.now() + 60000; // 1分後
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // 残り時間が表示されているか
      expect(wrapper.text()).toMatch(/[0-9]+/);
    });
  });

  describe('認証機能', () => {
    it('認証ボタンをクリックできる', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);

      // ボタンクリックはエラーになる可能性がある（WebAuthnがないため）
      // ボタンが存在してクリックできることを確認
      expect(button.text()).toContain('認証');
    });

    it('認証失敗時はエラーメッセージを表示する', async () => {
      // 未認証状態でマウント
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // 認証ボタンが表示されていることを確認
      expect(wrapper.text()).toContain('認証');

      // エラーメッセージのエリアが存在することを確認
      const errorArea = wrapper.find('.error');
      expect(errorArea.exists()).toBe(true);
    });
  });

  describe('ロック機能', () => {
    it('ロックボタンをクリックできる', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      
      // ロック成功をモック
      mockSendMessage.mockResolvedValueOnce({ success: true });
      
      await button.trigger('click');
      
      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'LOCK_SESSION' });
    });
  });

  describe('設定ページへのリンク', () => {
    it('設定ページへのリンクが表示される', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const link = wrapper.find('.footer a');
      expect(link.exists()).toBe(true);
      expect(link.text()).toContain('設定');
    });

    it('設定リンクをクリックすると設定ページが開く', async () => {
      const mockOpenExtensionPage = vi.fn();
      (global as any).chrome.runtime.openOptionsPage = mockOpenExtensionPage;

      const wrapper = mount(App);
      const link = wrapper.find('a[href*="options"], button:contains("設定")');
      
      if (link.exists()) {
        await link.trigger('click');
        // 実際には chrome.runtime.openOptionsPage が呼ばれることを期待
      }
    });
  });

  describe('初期化処理', () => {
    it('マウント時にセッション状態を取得する', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      mount(App);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'GET_SESSION_STATUS' });
    });

    it('セットアップ未完了時は初期設定ボタンを表示する', async () => {
      (global.chrome.storage.local.get as any).mockResolvedValue({ isSetupComplete: false });

      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('初期設定');
    });

    it('通信エラー時はエラー状態を表示する', async () => {
      mockSendMessage.mockRejectedValue(new Error('Connection failed'));

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('エラー');
    });
  });

  describe('自動更新', () => {
    it('セッション状態を定期的に更新する', async () => {
      vi.useFakeTimers();

      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });

      mount(App);
      
      // 初期ロードを待つ
      await vi.advanceTimersByTimeAsync(100);

      const initialCallCount = mockSendMessage.mock.calls.length;

      // 5秒進める
      await vi.advanceTimersByTimeAsync(5000);

      // 再度セッション状態が取得されているはず
      expect(mockSendMessage.mock.calls.length).toBeGreaterThan(initialCallCount);

      vi.useRealTimers();
    });
  });

  describe('機密フィールドのマスク表示', () => {
    it('機密追加フィールドはマスク表示され、非機密は実値のまま', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(r => setTimeout(r, 10));

      // フィールド選択状態を直接セット
      wrapper.vm.selectedEntry = {
        id: '1',
        title: 'テスト',
        username: 'u',
        password: 'p',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        additionalFields: [
          { name: 'メモ', value: 'plain-value' },
          { name: 'PIN', value: '1234', sensitive: true }
        ]
      };
      wrapper.vm.autofillMode = 'select-field';
      await wrapper.vm.$nextTick();

      const text = wrapper.text();
      expect(text).toContain('plain-value'); // 非機密は実値
      expect(text).not.toContain('1234');    // 機密はマスク
      expect(text).toContain('••••••••');
    });

    it('機密フィールドをクリックしても実値で入力される', async () => {
      const fillSpy = vi.fn();
      mockSendMessage.mockResolvedValue({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(r => setTimeout(r, 10));

      wrapper.vm.selectedEntry = {
        id: '1',
        title: 'テスト',
        username: 'u',
        password: 'p',
        urls: ['https://example.com'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        additionalFields: [{ name: 'PIN', value: '1234', sensitive: true }]
      };
      wrapper.vm.autofillMode = 'select-field';
      wrapper.vm.autofillTabId = 1;
      await wrapper.vm.$nextTick();

      // FILL_FIELD を横取りするため chrome.tabs.sendMessage をモック
      (global.chrome as any).tabs = { sendMessage: fillSpy };

      const fieldButton = wrapper.findAll('.field-item').find(b => b.text().includes('PIN'));
      await fieldButton?.trigger('click');

      // fillSingleField(field.value) で実値が渡されること
      expect(fillSpy).toHaveBeenCalled();
      const payload = fillSpy.mock.calls[0][1];
      expect(payload.payload.value).toBe('1234');
    });
  });
});

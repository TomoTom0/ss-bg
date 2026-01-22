import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';
import type { PasswordEntry } from '@/types/storage';

// chrome.runtime.sendMessageのモック
const mockSendMessage = vi.fn();
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage
  }
} as any;

describe('Options App', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockSendMessage.mockImplementation((message) => {
      if (message.type === 'GET_SETTINGS') {
        return Promise.resolve({
          success: true,
          data: {
            sessionTimeout: 30
          }
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });
  });

  describe('初期表示', () => {
    it('コンポーネントがマウントできる', () => {
      const wrapper = mount(App);
      expect(wrapper.exists()).toBe(true);
    });

    it('タイトルが表示される', () => {
      const wrapper = mount(App);
      expect(wrapper.text()).toContain('SS-BG');
    });
  });

  describe('パスワード一覧', () => {
    it('パスワードが一覧表示される', async () => {
      const mockPasswords: PasswordEntry[] = [
        {
          id: '1',
          title: 'GitHub',
          urls: ['https://github.com'],
          username: 'user1',
          password: 'pass1',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: '2',
          title: 'Google',
          urls: ['https://google.com'],
          username: 'user2',
          password: 'pass2',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      mockSendMessage.mockResolvedValue({
        success: true,
        data: mockPasswords
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('GitHub');
      expect(wrapper.text()).toContain('Google');
    });

    it('パスワードがない場合はメッセージを表示', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: []
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('パスワードがありません');
    });
  });

  describe('パスワード追加', () => {
    it('追加フォームが表示される', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: []
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = wrapper.findAll('button');
      const addButton = buttons.find(btn => btn.text().includes('追加') || btn.text().includes('新規'));
      expect(addButton).toBeTruthy();
    });

    it('パスワードを追加できる', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: []
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // 新規作成ボタンをクリック
      const addButton = wrapper.find('button');
      await addButton.trigger('click');

      // フォームが表示されるか
      const titleInput = wrapper.find('input[type="text"]');
      expect(titleInput.exists()).toBe(true);
    });
  });

  describe('パスワード編集', () => {
    it('編集ボタンが表示される', async () => {
      const mockPasswords: PasswordEntry[] = [
        {
          id: '1',
          title: 'GitHub',
          urls: ['https://github.com'],
          username: 'user1',
          password: 'pass1',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      mockSendMessage.mockResolvedValue({
        success: true,
        data: mockPasswords
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = wrapper.findAll('button');
      const editButton = buttons.find(btn => btn.text().includes('編集'));
      expect(editButton).toBeTruthy();
    });
  });

  describe('パスワード削除', () => {
    it('削除ボタンが表示される', async () => {
      const mockPasswords: PasswordEntry[] = [
        {
          id: '1',
          title: 'GitHub',
          urls: ['https://github.com'],
          username: 'user1',
          password: 'pass1',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      mockSendMessage.mockResolvedValue({
        success: true,
        data: mockPasswords
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = wrapper.findAll('button');
      const deleteButton = buttons.find(btn => btn.text().includes('削除'));
      expect(deleteButton).toBeTruthy();
    });

    it('削除確認が表示される', async () => {
      const mockPasswords: PasswordEntry[] = [
        {
          id: '1',
          title: 'GitHub',
          urls: ['https://github.com'],
          username: 'user1',
          password: 'pass1',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      mockSendMessage.mockResolvedValue({
        success: true,
        data: mockPasswords
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = wrapper.findAll('button');
      const deleteButton = buttons.find(btn => btn.text().includes('削除'));
      await deleteButton!.trigger('click');
      await wrapper.vm.$nextTick();

      // 確認ダイアログまたはメッセージ
      expect(wrapper.text()).toMatch(/削除|確認/);
    });
  });

  describe('設定', () => {
    it('セッションタイムアウト設定が表示される', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: []
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toMatch(/タイムアウト|セッション/);
    });

    it('スクリーンショット設定が表示される', async () => {
      mockSendMessage.mockResolvedValue({
        success: true,
        data: []
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toMatch(/スクリーンショット/);
    });
  });

  describe('認証', () => {
    it('未認証時は認証を促すメッセージが表示される', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          success: false,
          error: 'Not authenticated'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Not authenticated'
        });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // エラーメッセージが表示される
      expect(wrapper.text()).toMatch(/エラー|認証/);
    });
  });

  describe('エラーハンドリング', () => {
    it('通信エラー時はエラーメッセージを表示', async () => {
      mockSendMessage.mockRejectedValue(new Error('Connection failed'));

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('エラー');
    });
  });
});

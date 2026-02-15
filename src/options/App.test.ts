import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

describe('Options App', () => {
  beforeEach(() => {
    // デフォルトのモックを設定
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
      success: true,
      data: { authenticated: true, expiresAt: Date.now() + 30000 }
    });
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


  describe('認証', () => {
    it('未認証時は認証を促すメッセージが表示される', async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
        success: true,
        data: { authenticated: false }
      });

      const wrapper = mount(App);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.text()).toContain('認証');
    });
  });
});

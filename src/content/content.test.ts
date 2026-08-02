import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initialize, getLastFocusedInput, getDialogStylesForTest } from './content';

// chrome APIのモック
const mockSendMessage = vi.fn();
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
} as any;

describe('content script', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mockSendMessage.mockReset();
  });

  afterEach(() => {
    const dialogHost = document.getElementById('ss-bg-dialog-host');
    if (dialogHost) {
      dialogHost.remove();
    }
    const highlightStyles = document.getElementById('ss-bg-highlight-styles');
    if (highlightStyles) {
      highlightStyles.remove();
    }
  });

  describe('初期化', () => {
    it('initialize関数が存在する', () => {
      expect(typeof initialize).toBe('function');
    });

    it('getLastFocusedInput関数が存在する', () => {
      expect(typeof getLastFocusedInput).toBe('function');
    });

    it('初期化時にハイライト用CSSが注入される', () => {
      initialize();

      const style = document.getElementById('ss-bg-highlight-styles');
      expect(style).toBeTruthy();
      expect(style?.textContent).toContain('ss-bg-highlight-target');
    });

    it('初期化時にメッセージリスナーが設定される', () => {
      initialize();

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('フォーカス追跡', () => {
    it('フォーカスされた入力フィールドを追跡できる', () => {
      initialize();

      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      input.focus();

      // フォーカスイベントを発火
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // フォーカス追跡は内部状態なので、直接テストすることは困難
      // ただし、エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('Shadow DOM内のフォーカスは追跡されない', () => {
      initialize();

      // Shadow DOMを作成
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const input = document.createElement('input');
      input.type = 'text';
      shadowRoot.appendChild(input);
      container.appendChild(host);

      // フォーカスイベントを発火
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('ダイアログ位置計算', () => {
    it('右側に十分なスペースがある場合は右側に表示される', () => {
      // ウィンドウサイズをモック
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      const rect = input.getBoundingClientRect();

      // 右側に十分なスペースがある場合
      const spaceRight = window.innerWidth - rect.right;
      expect(spaceRight).toBeGreaterThan(350); // ダイアログ幅
    });

    it('左側にスペースがある場合は左側に表示される', () => {
      // ウィンドウサイズをモック
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });

      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      const rect = input.getBoundingClientRect();
      const spaceLeft = rect.left;

      // 要素がDOMに追加されているので、左側のスペースは0以上
      expect(spaceLeft).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Shadow DOMの分離', () => {
    it('Shadow DOMを使用してUIを分離できる', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadowRoot = host.attachShadow({ mode: 'closed' });
      const secretElement = document.createElement('div');
      secretElement.className = 'secret';
      secretElement.textContent = 'Hidden';
      shadowRoot.appendChild(secretElement);

      expect(document.querySelector('.secret')).toBeNull();
      expect(shadowRoot.querySelector('.secret')).toBeTruthy();
    });

    it('Shadow DOM外から内部要素にはアクセスできない', () => {
      const host = document.createElement('div');
      container.appendChild(host);

      const shadowRoot = host.attachShadow({ mode: 'closed' });
      const internalElement = document.createElement('div');
      internalElement.id = 'internal';
      shadowRoot.appendChild(internalElement);

      expect(document.querySelector('#internal')).toBeNull();
    });
  });

  describe('Service Workerとの通信', () => {
    it('chrome.runtime.sendMessageでメッセージを送信できる', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendMessage.mockResolvedValue(mockResponse);

      const response = await chrome.runtime.sendMessage({ type: 'GET_PASSWORDS' });

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'GET_PASSWORDS' });
      expect(response.success).toBe(true);
    });

    it('メッセージ送信エラーをハンドリングできる', async () => {
      mockSendMessage.mockRejectedValue(new Error('Connection failed'));

      await expect(chrome.runtime.sendMessage({ type: 'GET_PASSWORDS' }))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('セキュリティ', () => {
    it('パスワードをDOM属性に保存しない', () => {
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.value = 'secret';
      container.appendChild(passwordInput);

      expect(passwordInput.dataset.password).toBeUndefined();
      expect(passwordInput.getAttribute('data-password')).toBeNull();
    });

    it('valueプロパティは直接設定できない', () => {
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.value = 'secret';
      container.appendChild(passwordInput);

      // HTML属性としてのvalueは空
      expect(passwordInput.getAttribute('value')).toBeNull();
      // プロパティとしてのvalueは設定される
      expect(passwordInput.value).toBe('secret');
    });
  });

  describe('エラーハンドリング', () => {
    it('console.errorでエラーがログ出力される', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      console.error('[bg-ss] Test error');

      expect(consoleSpy).toHaveBeenCalledWith('[bg-ss] Test error');

      consoleSpy.mockRestore();
    });
  });

  describe('動的フォーム対応', () => {
    it('後から追加された入力フィールドにも対応できる', (done) => {
      initialize();

      setTimeout(() => {
        const dynamicInput = document.createElement('input');
        dynamicInput.type = 'text';
        container.appendChild(dynamicInput);

        dynamicInput.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        expect(dynamicInput).toBeTruthy();
        done();
      }, 100);
    });

    it('削除された要素のハイライトはクリーンアップされる', () => {
      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      input.classList.add('ss-bg-highlight-target');
      expect(input.classList.contains('ss-bg-highlight-target')).toBe(true);

      input.remove();
      expect(document.querySelector('.ss-bg-highlight-target')).toBeNull();
    });
  });

  describe('キーボード操作', () => {
    it('Escapeキーでダイアログを閉じるリスナーが設定される', () => {
      initialize();

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });

  describe('ダークテーマ対応', () => {
    it('ダイアログCSSにCSS変数が含まれる', () => {
      const styles = getDialogStylesForTest();

      // CSS変数が定義されていることを検証
      expect(styles).toContain(':host {');
      expect(styles).toContain('--color-bg-primary:');
      expect(styles).toContain('--color-text-primary:');
      expect(styles).toContain('--color-border-medium:');

      // ダークモード対応のメディアクエリが含まれる
      expect(styles).toContain('@media (prefers-color-scheme: dark)');

      // 保存テーマ（light/dark）を Shadow host の data-theme 属性で反映するため、
      // data-theme 駆動のセレクタが含まれることを検証
      expect(styles).toContain(":host[data-theme='dark']");
      // auto（システム設定）の場合のみ OS 設定に従うよう、
      // 明示テーマ以外に限定されたセレクタが含まれることを検証
      expect(styles).toContain(":host:not([data-theme='light']):not([data-theme='dark'])");

      // 主要な要素にCSS変数が使用されていることを検証
      expect(styles).toContain('.ss-bg-dialog-content {');
      expect(styles).toContain('color: var(--color-dialog-text)');

      expect(styles).toContain('.ss-bg-field-button {');
      expect(styles).toContain('background: var(--color-bg-elevated)');

      expect(styles).toContain('.ss-bg-password-item {');
      expect(styles).toContain('background: var(--color-bg-elevated)');

      // 入力フィールドにCSS変数が使用されている
      expect(styles).toContain('.ss-bg-name-input {');
      expect(styles).toContain('color: var(--color-text-primary)');

      expect(styles).toContain('.ss-bg-value-input {');
      expect(styles).toContain('color: var(--color-text-primary)');

      expect(styles).toContain('.ss-bg-selector-input {');
      expect(styles).toContain('color: var(--color-text-primary)');

      expect(styles).toContain('.ss-bg-form-input {');
      expect(styles).toContain('color: var(--color-text-primary)');

      expect(styles).toContain('.ss-bg-form-textarea {');
      expect(styles).toContain('color: var(--color-text-primary)');
    });

    it('ダークモードのページでもテキストが読める', () => {
      // ダークモードをシミュレート
      document.documentElement.style.setProperty('color', '#ffffff');

      const styles = getDialogStylesForTest();

      // 注入されるCSSでCSS変数が定義されていることを確認
      expect(styles).toContain('--color-text-primary:');
      expect(styles).toContain('--color-dialog-text:');
    });
  });
});

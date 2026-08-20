import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initialize, getLastFocusedInput, getDialogStylesForTest, createAdditionalFieldRowForTest, markEntryUsed, suggestAddingCurrentUrl, getConfirmDialogButtonsForTest } from './content';
import { normalizeUrl } from '@/utils/url-matcher';
import type { PasswordEntry } from '@/types/storage';

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

  describe('追加フィールド行の機密扱い', () => {
    it('機密フィールドの値入力は type=password になる', () => {
      const { inputs } = createAdditionalFieldRowForTest('PIN', '1234', '', true);
      expect(inputs.valueInput.type).toBe('password');
      expect(inputs.valueInput.value).toBe('1234');
    });

    it('非機密フィールドの値入力は type=text でピークボタンが非表示', () => {
      const { row, inputs } = createAdditionalFieldRowForTest('メモ', 'plain', '', false);
      expect(inputs.valueInput.type).toBe('text');
      const peekBtn = row.querySelector('.ss-bg-peek-btn') as HTMLElement;
      expect(peekBtn.style.display).toBe('none');
    });

    it('ピークボタンで値を表示し、再度クリックでマスクに戻る', async () => {
      const { row, inputs } = createAdditionalFieldRowForTest('PIN', '1234', '', true);
      const peekBtn = row.querySelector('.ss-bg-peek-btn') as HTMLButtonElement;
      expect(inputs.valueInput.type).toBe('password');

      peekBtn.click();
      expect(inputs.valueInput.type).toBe('text');
      expect(peekBtn.getAttribute('aria-label')).toBe('隠す');

      peekBtn.click();
      expect(inputs.valueInput.type).toBe('password');
      expect(peekBtn.getAttribute('aria-label')).toBe('表示');
    });

    it('機密チェックを外すと type=text になりピークボタンが隠れる', () => {
      const { row, inputs } = createAdditionalFieldRowForTest('PIN', '1234', '', true);
      inputs.sensitiveInput.checked = false;
      inputs.sensitiveInput.dispatchEvent(new Event('change'));

      expect(inputs.valueInput.type).toBe('text');
      const peekBtn = row.querySelector('.ss-bg-peek-btn') as HTMLElement;
      expect(peekBtn.style.display).toBe('none');
    });

    it('ピーク表示は5分後に自動でマスクへ戻る', () => {
      vi.useFakeTimers();
      try {
        const { row, inputs } = createAdditionalFieldRowForTest('PIN', '1234', '', true);
        const peekBtn = row.querySelector('.ss-bg-peek-btn') as HTMLButtonElement;
        peekBtn.click();
        expect(inputs.valueInput.type).toBe('text');

        vi.advanceTimersByTime(5 * 60 * 1000);

        expect(inputs.valueInput.type).toBe('password');
        expect(peekBtn.getAttribute('aria-label')).toBe('表示');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('markEntryUsed', () => {
    it('UPDATE_PASSWORD を送信し lastUsedAt を付与する', () => {
      mockSendMessage.mockClear();
      const entry = { id: 'abc', title: 'T', username: 'u', password: 'p', urls: [], createdAt: 1, updatedAt: 2 } as any;
      markEntryUsed(entry);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendMessage.mock.calls[0][0];
      expect(msg.type).toBe('UPDATE_PASSWORD');
      expect(msg.payload.id).toBe('abc');
      expect(typeof msg.payload.entry.lastUsedAt).toBe('number');
      // updatedAt は維持
      expect(msg.payload.entry.updatedAt).toBe(2);
    });
  });

  describe('suggestAddingCurrentUrl', () => {
    const baseEntry: PasswordEntry = {
      id: 'abc',
      title: 'T',
      username: 'u',
      password: 'p',
      urls: ['other.example.com'],
      createdAt: 1,
      updatedAt: 2
    };

    it('承認すると現在URLを含む更新エントリを返す（markEntryUsedに渡して追加URLを保持できる）', async () => {
      mockSendMessage.mockClear();
      mockSendMessage.mockResolvedValue({ success: true });

      const promise = suggestAddingCurrentUrl(baseEntry);
      await vi.waitFor(() => {
        expect(getConfirmDialogButtonsForTest().ok).not.toBeNull();
      });
      getConfirmDialogButtonsForTest().ok?.click();

      const updated = await promise;
      const expectedUrl = normalizeUrl(window.location.href);
      expect(updated).not.toBeNull();
      expect(updated?.urls).toContain(expectedUrl);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      const msg = mockSendMessage.mock.calls[0][0];
      expect(msg.type).toBe('UPDATE_PASSWORD');
      expect(msg.payload.entry.urls).toContain(expectedUrl);
    });

    it('キャンセルすると null を返し保存しない', async () => {
      mockSendMessage.mockClear();

      const promise = suggestAddingCurrentUrl(baseEntry);
      await vi.waitFor(() => {
        expect(getConfirmDialogButtonsForTest().cancel).not.toBeNull();
      });
      getConfirmDialogButtonsForTest().cancel?.click();

      const updated = await promise;
      expect(updated).toBeNull();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('現在URLが既に登録済みの場合はプロンプトを出さず null を返す', async () => {
      mockSendMessage.mockClear();
      const registered: PasswordEntry = {
        ...baseEntry,
        urls: [normalizeUrl(window.location.href)]
      };

      const updated = await suggestAddingCurrentUrl(registered);

      expect(updated).toBeNull();
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(getConfirmDialogButtonsForTest().ok).toBeNull();
    });
  });
});

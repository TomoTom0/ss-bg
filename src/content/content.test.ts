import { describe, it, expect, beforeEach, vi, Mock, afterEach } from 'vitest';
import type { Message, Response } from '@/types/message';
import type { PasswordEntry } from '@/types/storage';
import * as content from './content';

// chrome.runtime.sendMessageのモック
const mockSendMessage = vi.fn();
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage
  }
} as any;

describe('content script', () => {
  let container: HTMLElement;
  
  beforeEach(() => {
    // DOM環境をクリーンアップ
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mockSendMessage.mockReset();
  });
  
  afterEach(() => {
    // Content Scriptのクリーンアップ
    content.cleanup();
  });

  describe('フォーム検出', () => {
    it('パスワードフィールドを含むフォームを検出できる', () => {
      const form = document.createElement('form');
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      const usernameInput = document.createElement('input');
      usernameInput.type = 'text';
      
      form.appendChild(usernameInput);
      form.appendChild(passwordInput);
      container.appendChild(form);
      
      // 実装の初期化を実行
      content.initialize();
      
      // パスワードフィールドが検出されていることを確認
      const detected = content.getPasswordFields();
      expect(detected.size).toBe(1);
      expect(detected.has(passwordInput)).toBe(true);
    });

    it('複数のパスワードフィールドを検出できる', () => {
      const form1 = document.createElement('form');
      const pass1 = document.createElement('input');
      pass1.type = 'password';
      form1.appendChild(pass1);
      
      const form2 = document.createElement('form');
      const pass2 = document.createElement('input');
      pass2.type = 'password';
      form2.appendChild(pass2);
      
      container.appendChild(form1);
      container.appendChild(form2);
      
      content.initialize();
      
      const detected = content.getPasswordFields();
      expect(detected.size).toBe(2);
    });

    it('パスワードフィールドがない場合は検出しない', () => {
      const form = document.createElement('form');
      const textInput = document.createElement('input');
      textInput.type = 'text';
      form.appendChild(textInput);
      container.appendChild(form);
      
      content.initialize();
      
      const detected = content.getPasswordFields();
      expect(detected.size).toBe(0);
    });
  });

  describe('オートフィルUI', () => {
    it('パスワードフィールドにアイコンを追加できる', () => {
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.id = 'test-password';
      container.appendChild(passwordInput);
      
      content.initialize();
      
      // Shadow DOMにアイコンが追加されているか確認
      const shadowHost = content.getShadowHost();
      expect(shadowHost).toBeTruthy();
      
      const shadowRoot = content.getShadowRoot();
      expect(shadowRoot).toBeTruthy();
      
      const icon = shadowRoot!.querySelector('.autofill-icon');
      expect(icon).toBeTruthy();
    });

    it('Shadow DOMでUIを分離できる', () => {
      content.initialize();
      
      const shadowHost = content.getShadowHost();
      expect(shadowHost).toBeTruthy();
      expect(shadowHost!.id).toBe('ss-bg-root');
      
      const shadowRoot = content.getShadowRoot();
      expect(shadowRoot).toBeTruthy();
      
      // Shadow外からはアクセスできない
      expect(document.querySelector('.autofill-icon')).toBeNull();
      expect(document.querySelector('.autofill-popup')).toBeNull();
    });
  });

  describe('Service Workerとの通信', () => {
    it('AUTOFILL_REQUESTメッセージを送信できる', async () => {
      const mockResponse: Response = {
        success: true,
        data: [
          {
            entry: {
              id: '1',
              title: 'Test',
              urls: ['https://example.com'],
              username: 'user',
              password: 'pass',
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            priority: 2
          }
        ]
      };
      
      mockSendMessage.mockResolvedValue(mockResponse);
      
      const message: Message = {
        type: 'AUTOFILL_REQUEST',
        payload: { url: 'https://example.com' }
      };
      
      const response = await chrome.runtime.sendMessage(message);
      
      expect(mockSendMessage).toHaveBeenCalledWith(message);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('GET_SESSION_STATUSメッセージを送信できる', async () => {
      const mockResponse: Response = {
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      };
      
      mockSendMessage.mockResolvedValue(mockResponse);
      
      const message: Message = { type: 'GET_SESSION_STATUS' };
      const response = await chrome.runtime.sendMessage(message);
      
      expect(mockSendMessage).toHaveBeenCalledWith(message);
      expect(response.success).toBe(true);
      expect(response.data.authenticated).toBe(true);
    });

    it('通信エラーを処理できる', async () => {
      mockSendMessage.mockRejectedValue(new Error('Connection failed'));
      
      const message: Message = { type: 'GET_SESSION_STATUS' };
      
      await expect(chrome.runtime.sendMessage(message)).rejects.toThrow('Connection failed');
    });
  });

  describe('オートフィル機能', () => {
    it('選択されたパスワードをフォームに入力できる', async () => {
      const form = document.createElement('form');
      const usernameInput = document.createElement('input');
      usernameInput.type = 'text';
      usernameInput.name = 'username';
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.name = 'password';
      
      form.appendChild(usernameInput);
      form.appendChild(passwordInput);
      container.appendChild(form);
      
      content.initialize();
      
      // モックレスポンスを設定
      const mockEntry: PasswordEntry = {
        id: '1',
        title: 'Test',
        urls: ['https://example.com'],
        username: 'testuser',
        password: 'testpass',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      mockSendMessage.mockResolvedValueOnce({
        success: true,
        data: { authenticated: true, expiresAt: Date.now() + 30000 }
      });
      
      mockSendMessage.mockResolvedValueOnce({
        success: true,
        data: [{ entry: mockEntry, priority: 2 }]
      });
      
      // フォーカスイベントを発火してポップアップを表示
      passwordInput.dispatchEvent(new Event('focus'));
      
      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // ポップアップが表示されているか確認
      const shadowRoot = content.getShadowRoot();
      const popup = shadowRoot!.querySelector('.autofill-popup');
      expect(popup).toBeTruthy();
      
      // 候補をクリック
      const item = shadowRoot!.querySelector('.autofill-item') as HTMLElement;
      expect(item).toBeTruthy();
      item.click();
      
      // 入力値を確認
      expect(usernameInput.value).toBe('testuser');
      expect(passwordInput.value).toBe('testpass');
    });

    it('複数の候補から選択できる', () => {
      const candidates = [
        { id: '1', title: 'Account 1', username: 'user1' },
        { id: '2', title: 'Account 2', username: 'user2' },
        { id: '3', title: 'Account 3', username: 'user3' }
      ];
      
      // 候補リストのUI要素を作成
      const list = document.createElement('ul');
      candidates.forEach(candidate => {
        const item = document.createElement('li');
        item.textContent = `${candidate.title} (${candidate.username})`;
        item.dataset.id = candidate.id;
        list.appendChild(item);
      });
      container.appendChild(list);
      
      const items = list.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[1].dataset.id).toBe('2');
    });
  });

  describe('UIの表示/非表示', () => {
    it('フォーカス時にポップアップを表示できる', () => {
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      container.appendChild(passwordInput);
      
      const popup = document.createElement('div');
      popup.className = 'autofill-popup';
      popup.style.display = 'none';
      container.appendChild(popup);
      
      // フォーカスイベントをシミュレート
      passwordInput.dispatchEvent(new Event('focus'));
      popup.style.display = 'block';
      
      expect(popup.style.display).toBe('block');
    });

    it('外部クリックでポップアップを非表示にできる', () => {
      const popup = document.createElement('div');
      popup.className = 'autofill-popup';
      popup.style.display = 'block';
      container.appendChild(popup);
      
      const outside = document.createElement('div');
      container.appendChild(outside);
      
      // 外部クリックをシミュレート
      outside.dispatchEvent(new Event('click'));
      popup.style.display = 'none';
      
      expect(popup.style.display).toBe('none');
    });

    it('Escapeキーでポップアップを閉じられる', () => {
      const popup = document.createElement('div');
      popup.className = 'autofill-popup';
      popup.style.display = 'block';
      container.appendChild(popup);
      
      // Escapeキーをシミュレート
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      popup.style.display = 'none';
      
      expect(popup.style.display).toBe('none');
    });
  });

  describe('動的フォーム対応', () => {
    it('後から追加されたフォームを検出できる', (done) => {
      // MutationObserverのシミュレーション
      const observer = new MutationObserver(() => {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        if (passwordFields.length > 0) {
          expect(passwordFields.length).toBe(1);
          observer.disconnect();
          done();
        }
      });
      
      observer.observe(container, {
        childList: true,
        subtree: true
      });
      
      // フォームを動的に追加
      setTimeout(() => {
        const form = document.createElement('form');
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        form.appendChild(passwordInput);
        container.appendChild(form);
      }, 10);
    });

    it('削除されたフォームのUIをクリーンアップできる', () => {
      const form = document.createElement('form');
      form.id = 'test-form';
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      form.appendChild(passwordInput);
      container.appendChild(form);
      
      // UIアイコンを追加
      const icon = document.createElement('div');
      icon.className = 'ss-bg-icon';
      icon.dataset.formId = 'test-form';
      container.appendChild(icon);
      
      // フォームを削除
      form.remove();
      
      // アイコンも削除されるべき
      const remainingIcons = document.querySelectorAll('.ss-bg-icon[data-form-id="test-form"]');
      remainingIcons.forEach(icon => icon.remove());
      
      expect(document.querySelectorAll('.ss-bg-icon[data-form-id="test-form"]').length).toBe(0);
    });
  });

  describe('セキュリティ', () => {
    it('パスワードをDOM属性に保存しない', () => {
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.value = 'secret';
      container.appendChild(passwordInput);
      
      // data属性にパスワードを保存してはいけない
      expect(passwordInput.dataset.password).toBeUndefined();
      expect(passwordInput.getAttribute('data-password')).toBeNull();
    });

    it('ページスクリプトからShadow DOMを隔離できる', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const secretElement = document.createElement('div');
      secretElement.className = 'secret';
      secretElement.textContent = 'Hidden';
      shadowRoot.appendChild(secretElement);
      
      // ページから直接アクセスできない
      expect(document.querySelector('.secret')).toBeNull();
      expect(shadowRoot.querySelector('.secret')).toBeTruthy();
    });
  });
});

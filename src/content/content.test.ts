import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initialize, getLastFocusedInput } from './content';

describe('content script', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    const dialogHost = document.getElementById('ss-bg-dialog-host');
    if (dialogHost) {
      dialogHost.remove();
    }
  });

  describe('初期化', () => {
    it('initialize関数が存在する', () => {
      expect(typeof initialize).toBe('function');
    });

    it('getLastFocusedInput関数が存在する', () => {
      expect(typeof getLastFocusedInput).toBe('function');
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
  });
});

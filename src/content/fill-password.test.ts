import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initialize, handleFillPassword, getLastFocusedInput } from './content';
import { normalizeUrl } from '@/utils/url-matcher';
import type { PasswordEntry } from '@/types/storage';

// chrome APIのモック（content.test.ts と同型）
const mockSendMessage = vi.fn();
const mockAddListener = vi.fn();
global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener,
      removeListener: vi.fn()
    }
  }
} as any;

const entry: PasswordEntry = {
  id: 'entry-1',
  title: 'Test',
  username: 'alice',
  password: 's3cret-value',
  urls: [],
  createdAt: 1,
  updatedAt: 1
};

describe('handleFillPassword（content script 注入前フォーカスの回帰）', () => {
  let usernameInput: HTMLInputElement;
  let passwordInput: HTMLInputElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    const form = document.createElement('form');
    usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.name = 'username';
    usernameInput.autocomplete = 'username';
    passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.autocomplete = 'current-password';
    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    document.body.appendChild(form);
    // happy-dom にはレイアウトがないため、表示中要素として offsetParent を与える
    for (const input of [usernameInput, passwordInput]) {
      Object.defineProperty(input, 'offsetParent', { configurable: true, get: () => document.body });
    }
    mockSendMessage.mockReset();
    mockSendMessage.mockImplementation(async (message: { type: string }) => {
      if (message.type === 'GET_FAVORITES') return { success: true, data: [] };
      return { success: true };
    });
    entry.urls = [normalizeUrl(window.location.href)];
  });

  it('注入前にフォーカスされたフィールドでも「すべて入力」が両欄へ入力する', async () => {
    // content script の初期化（=注入）より前にフォーカスする。
    // この時点では focusin リスナーが存在しないため lastFocusedInput は追跡されない。
    passwordInput.focus();
    expect(getLastFocusedInput()).toBeNull();

    initialize();
    await handleFillPassword(entry);

    expect(usernameInput.value).toBe('alice');
    expect(passwordInput.value).toBe('s3cret-value');
    expect(getLastFocusedInput()).toBe(passwordInput);
  });

  it('注入後にフォーカスした場合は従来どおり入力する', async () => {
    initialize();
    passwordInput.focus();
    expect(getLastFocusedInput()).toBe(passwordInput);

    await handleFillPassword(entry);

    expect(usernameInput.value).toBe('alice');
    expect(passwordInput.value).toBe('s3cret-value');
  });
});

import { vi } from 'vitest';

// Chrome APIのグローバルモック
const mockStorage: Record<string, any> = {};
const mockSessionStorage: Record<string, any> = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        return Promise.resolve(
          typeof keys === 'string'
            ? { [keys]: mockStorage[keys] }
            : keys === null
            ? { ...mockStorage }
            : keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
        );
      }),
      set: vi.fn((items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      })
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
      }),
      clear: vi.fn(() => {
        Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
        return Promise.resolve();
      })
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    getManifest: vi.fn(() => ({ version: '0.1.0' })),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    openOptionsPage: vi.fn()
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
    captureVisibleTab: vi.fn()
  },
  downloads: {
    download: vi.fn()
  },
  action: {
    openPopup: vi.fn()
  },
  commands: {
    onCommand: {
      addListener: vi.fn()
    }
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    },
    removeAll: vi.fn()
  },
  offscreen: {
    createDocument: vi.fn()
  }
} as any;

// Navigator credentials APIのモック
global.navigator = {
  credentials: {
    create: vi.fn(),
    get: vi.fn()
  }
} as any;

import { handleMessage, ensureContentScriptInjected } from "./background";
import { isSessionStatus, isPasswordEntryArray } from "@/types/message";
import { storage } from "@/utils/storage";

// イベントリスナーを最優先で登録
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === 'autofill-forms') {
    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

    if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {
      await chrome.storage.session.set({
        pendingAutofillTabId: tab.id
      });
      await chrome.action.openPopup();
      return;
    }

    await showPasswordDialog(tab.id);
  } else if (info.menuItemId === 'save-form') {
    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

    if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {
      await chrome.storage.session.set({
        pendingSaveFormTabId: tab.id
      });
      await chrome.action.openPopup();
      return;
    }

    const injected = await ensureContentScriptInjected(tab.id);
    if (injected) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SAVE_CURRENT_FORM'
      });
    }
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('favorite-')) {
    const slot = parseInt(info.menuItemId.replace('favorite-', ''), 10) as 1 | 2 | 3;
    if (tab.url) {
      await executeFavoriteForTab(tab.id, tab.url, slot);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'take-screenshot') {
    await handleMessage({ type: 'TAKE_SCREENSHOT' });
  } else if (command === 'autofill-forms') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      return;
    }

    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

    if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {
      await chrome.storage.session.set({
        pendingAutofillTabId: tab.id
      });
      await chrome.action.openPopup();
      return;
    }

    await showPasswordDialog(tab.id);
  } else if (command.startsWith('favorite-')) {
    const slot = parseInt(command.replace('favorite-', ''), 10) as 1 | 2 | 3;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url) {
      await executeFavoriteForTab(tab.id, tab.url, slot);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(async (response) => {
      // お気に入り保存/削除後にメニューを更新
      if ((message.type === 'SAVE_FAVORITE' || message.type === 'DELETE_FAVORITE') && response.success) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url) {
            await updateFavoriteMenuItems(tab.url);
          }
        } catch (e) {
          console.debug('[bg-ss] Failed to update favorite menus after save/delete:', e);
        }
      }
      sendResponse(response);
    })
    .catch(error => {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    });
  return true;
});

// コンテキストメニューを作成
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'ss-bg-root',
    title: 'bg-ss',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'autofill-forms',
    parentId: 'ss-bg-root',
    title: '情報を入力...',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'save-form',
    parentId: 'ss-bg-root',
    title: '現在のフォームを保存',
    contexts: ['editable']
  });

  // 起動時にアクティブタブのお気に入りメニューを反映
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab?.url) {
      updateFavoriteMenuItems(tab.url);
    }
  }).catch((e) => {
    console.debug('[bg-ss] Failed to update favorite menus on init:', e);
  });
});

// アクティブタブ変更時にお気に入りメニューを更新
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateFavoriteMenuItems(tab.url);
    }
  } catch (e) {
    console.debug('[bg-ss] Failed to update favorite menus on tab activation:', e);
  }
});

// タブURL変更時にお気に入りメニューを更新
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  try {
    if (changeInfo.url && tab.active) {
      await updateFavoriteMenuItems(changeInfo.url);
    }
  } catch (e) {
    console.debug('[bg-ss] Failed to update favorite menus on tab update:', e);
  }
});

/**
 * お気に入りコンテキストメニューを現在のドメインに応じて更新
 */
async function updateFavoriteMenuItems(url: string): Promise<void> {
  for (const id of ['favorite-separator', 'favorite-1', 'favorite-2', 'favorite-3']) {
    try {
      await chrome.contextMenus.remove(id);
    } catch {
      // 存在しない場合は無視
    }
  }

  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return;
  }

  const favorites = await storage.getFavoritesByDomain(domain);

  if (favorites.length === 0) {
    try {
      chrome.contextMenus.update('ss-bg-root', { contexts: ['editable'] });
    } catch {
      // ignore
    }
    return;
  }

  try {
    chrome.contextMenus.update('ss-bg-root', { contexts: ['editable', 'page'] });
  } catch {
    // ignore
  }

  chrome.contextMenus.create({
    id: 'favorite-separator',
    parentId: 'ss-bg-root',
    type: 'separator',
    contexts: ['editable', 'page']
  });

  for (const fav of favorites) {
    chrome.contextMenus.create({
      id: `favorite-${fav.slot}`,
      parentId: 'ss-bg-root',
      title: `お気に入り ${fav.slot}`,
      contexts: ['editable', 'page']
    });
  }
}

/**
 * お気に入り動作を実行
 */
async function executeFavoriteForTab(tabId: number, url: string, slot: 1 | 2 | 3) {
  const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

  if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {
    await chrome.storage.session.set({
      pendingFavorite: { tabId, slot }
    });
    await chrome.action.openPopup();
    return;
  }

  const domain = new URL(url).hostname;
  const response = await handleMessage({
    type: 'EXECUTE_FAVORITE',
    payload: { domain, slot, tabId }
  });

  if (!response.success) {
    console.error('[bg-ss] Failed to execute favorite:', response.error);
    if (response.error?.includes('No favorite found')) {
      await showPasswordDialog(tabId);
    }
  }
}

async function showPasswordDialog(tabId: number) {
  const injected = await ensureContentScriptInjected(tabId);
  if (!injected) {
    console.error('[bg-ss] Failed to inject content script');
    return;
  }

  const response = await handleMessage({ type: 'GET_PASSWORDS' });

  if (response.success && isPasswordEntryArray(response.data)) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_PASSWORD_DIALOG',
        payload: {
          candidates: response.data,
          tabId: tabId
        }
      });
    } catch (error) {
      console.error('[bg-ss] Failed to send message to content script:', error);
    }
  }
}

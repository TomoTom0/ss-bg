import { handleMessage, ensureContentScriptInjected } from "./background";
import { isSessionStatus, isPasswordEntryArray } from "@/types/message";

// イベントリスナーを最優先で登録
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[bg-ss] contextMenus.onClicked fired:', info.menuItemId);

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
    const injected = await ensureContentScriptInjected(tab.id);
    if (injected) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SAVE_CURRENT_FORM'
      });
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[bg-ss] commands.onCommand fired:', command);

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
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(response => sendResponse(response))
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
});

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

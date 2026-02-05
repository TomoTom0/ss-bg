import { handleMessage } from "./background";
import { isSessionStatus, isPasswordEntryArray } from "@/types/message";

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

// コンテキストメニューを作成（起動時に毎回実行）
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'ss-bg-root',
    title: 'SS-BG パスワード管理',
    contexts: ['editable']
  });
  
  chrome.contextMenus.create({
    id: 'autofill-password',
    parentId: 'ss-bg-root',
    title: 'パスワードを入力...',
    contexts: ['editable']
  });
  
  chrome.contextMenus.create({
    id: 'save-form',
    parentId: 'ss-bg-root',
    title: '現在のフォームを保存',
    contexts: ['editable']
  });
});

// インストール時にも実行（念のため）
chrome.runtime.onInstalled.addListener(() => {
  // Context menus are created on startup
});

// コンテキストメニューのクリックハンドラ（Service Worker起動時に常に登録）
chrome.contextMenus.onClicked.addListener(async (info, tab) => {

  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === 'autofill-password') {
    // セッション状態を確認
    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

    if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {
      // タブIDを保存（認証後にダイアログ表示するため）
      await chrome.storage.session.set({
        pendingAutofillTabId: tab.id
      });
      
      // 未認証の場合は認証を促す
      await chrome.action.openPopup();
      return;
    }
    
    // 認証済みの場合、パスワードリストを取得してダイアログを表示
    await showPasswordDialog(tab.id);
  } else if (info.menuItemId === 'save-form') {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SAVE_CURRENT_FORM'
    });
  }
});

// キーボードショートカットのハンドラ
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'take-screenshot') {
    await handleMessage({ type: 'TAKE_SCREENSHOT' });
  } else if (command === 'autofill-password') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      return;
    }

    // セッション状態を確認
    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });

    if (!sessionStatus.success || !isSessionStatus(sessionStatus.data) || !sessionStatus.data.authenticated) {

      // タブIDを保存（認証後にダイアログ表示するため）
      await chrome.storage.session.set({
        pendingAutofillTabId: tab.id
      });

      // 未認証の場合は認証を促す
      await chrome.action.openPopup();
      return;
    }

    // 認証済みの場合、パスワードダイアログを表示
    await showPasswordDialog(tab.id);
  }
});

// パスワードダイアログを表示する共通関数
async function showPasswordDialog(tabId: number) {
  // 全パスワードリストを取得
  const response = await handleMessage({ type: 'GET_PASSWORDS' });

  if (response.success && isPasswordEntryArray(response.data)) {

    try {
      // Content Scriptにダイアログ表示を指示
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_PASSWORD_DIALOG',
        payload: {
          candidates: response.data,
          tabId: tabId
        }
      });
    } catch (error) {
      console.error('[SS-BG] Failed to send message to content script:', error);
    }
  }
}

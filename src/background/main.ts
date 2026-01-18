import { handleMessage } from "./background";

console.log('[SS-BG Background] Service Worker loaded!');
console.log('[SS-BG Background] Version:', chrome.runtime.getManifest().version);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SS-BG Background] Message received:', message.type);
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
console.log('[SS-BG Background] Creating context menus');
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
  
  console.log('[SS-BG Background] Context menus created');
});

// インストール時にも実行（念のため）
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SS-BG Background] Extension installed/updated');
});

// コンテキストメニューのクリックハンドラ（Service Worker起動時に常に登録）
console.log('[SS-BG Background] Registering context menu click handler');
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[SS-BG Background] Context menu clicked:', info.menuItemId);
  
  if (!tab?.id) {
    console.log('[SS-BG Background] No tab ID');
    return;
  }
  
  if (info.menuItemId === 'autofill-password') {
    console.log('[SS-BG] Autofill password clicked');
    
    // セッション状態を確認
    const sessionStatus = await handleMessage({ type: 'GET_SESSION_STATUS' });
    console.log('[SS-BG] Session status:', sessionStatus);
    
    if (!sessionStatus.success || !sessionStatus.data?.authenticated) {
      console.log('[SS-BG] Not authenticated, opening popup for auth');
      
      // タブIDを保存（認証後にダイアログ表示するため）
      console.log('[SS-BG] Saving pendingAutofillTabId:', tab.id);
      await chrome.storage.session.set({
        pendingAutofillTabId: tab.id
      });
      
      // 確認のため再取得
      const check = await chrome.storage.session.get(['pendingAutofillTabId']);
      console.log('[SS-BG] Verified pendingAutofillTabId saved:', check.pendingAutofillTabId);
      
      // 未認証の場合は認証を促す
      await chrome.action.openPopup();
      return;
    }
    
    // 認証済みの場合、パスワードリストを取得してダイアログを表示
    await showPasswordDialog(tab.id);
  } else if (info.menuItemId === 'save-form') {
    console.log('[SS-BG] Save form clicked');
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SAVE_CURRENT_FORM'
    });
  }
});

// パスワードダイアログを表示する共通関数
async function showPasswordDialog(tabId: number) {
  console.log('[SS-BG] Showing password dialog for tab', tabId);
  
  // 全パスワードリストを取得
  const response = await handleMessage({ type: 'GET_PASSWORDS' });
  
  console.log('[SS-BG] GET_PASSWORDS response:', response);
  
  if (response.success && response.data) {
    console.log('[SS-BG] Sending SHOW_PASSWORD_DIALOG to tab', tabId, 'with', response.data.length, 'passwords');
    
    try {
      // Content Scriptにダイアログ表示を指示
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_PASSWORD_DIALOG',
        payload: {
          candidates: response.data,
          tabId: tabId
        }
      });
      console.log('[SS-BG] Message sent successfully');
    } catch (error) {
      console.error('[SS-BG] Failed to send message to content script:', error);
    }
  } else {
    console.error('[SS-BG] Failed to get passwords:', response.error);
  }
}

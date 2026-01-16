import { handleMessage } from "./background";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(() => {
  // 親メニュー
  chrome.contextMenus.create({
    id: 'ss-bg-root',
    title: 'SS-BG パスワード管理',
    contexts: ['editable']
  });
  
  // パスワードを入力
  chrome.contextMenus.create({
    id: 'autofill-password',
    parentId: 'ss-bg-root',
    title: 'パスワードを入力...',
    contexts: ['editable']
  });
  
  // 現在のフォームを保存
  chrome.contextMenus.create({
    id: 'save-form',
    parentId: 'ss-bg-root',
    title: '現在のフォームを保存',
    contexts: ['editable']
  });
});

// コンテキストメニューのクリックハンドラ
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  if (info.menuItemId === 'autofill-password') {
    // 全パスワードリストを取得してPopupで選択させる
    const response = await handleMessage({ type: 'GET_PASSWORDS' });
    
    if (response.success && response.data) {
      // Popupで選択させるために候補を保存
      await chrome.storage.session.set({
        autofillCandidates: response.data,
        autofillTabId: tab.id,
        autofillMode: 'select-entry' // エントリ選択モード
      });
      
      await chrome.action.openPopup();
    } else {
      console.error('Failed to get passwords:', response.error);
    }
  } else if (info.menuItemId === 'save-form') {
    // フォーム保存メッセージを送信
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SAVE_CURRENT_FORM'
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'COPY_IMAGE_TO_CLIPBOARD') {
    copyImageToClipboard(message.payload.dataUrl)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function copyImageToClipboard(dataUrl: string): Promise<void> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageItem = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([imageItem]);
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    throw error;
  }
}

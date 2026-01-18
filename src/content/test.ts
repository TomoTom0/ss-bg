// Simple test content script
console.log('========================================');
console.log('[SS-BG TEST] Content script is LOADED!');
console.log('[SS-BG TEST] URL:', window.location.href);
console.log('[SS-BG TEST] Document ready state:', document.readyState);
console.log('========================================');

// Add visible element to page
const testDiv = document.createElement('div');
testDiv.id = 'ss-bg-test-marker';
testDiv.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 20px;
  background: red;
  color: white;
  font-size: 20px;
  font-weight: bold;
  z-index: 9999999;
  border: 3px solid black;
`;
testDiv.textContent = 'SS-BG LOADED';
document.body.appendChild(testDiv);

console.log('[SS-BG TEST] Red marker added to page');

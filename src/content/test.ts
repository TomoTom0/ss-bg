// Simple test content script

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
testDiv.textContent = 'bg-ss LOADED';
document.body.appendChild(testDiv);

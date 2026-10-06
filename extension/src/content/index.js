// src/content/index.js - Google Meet Overlay Injector

let isChecking = false;

function injectOverlay() {
  const container = document.createElement('div');
  container.id = 'expression-lock-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.height = '400px';
  container.style.zIndex = '999999';
  container.style.display = 'none';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .overlay {
      width: 100%;
      height: 100%;
      background: #1e1e1e;
      border: 2px solid #f59e0b;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      color: white;
      font-family: sans-serif;
    }
    .header { padding: 10px; background: #f59e0b; color: black; font-weight: bold; text-align: center; }
    iframe { flex: 1; border: none; }
  `;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const header = document.createElement('div');
  header.className = 'header';
  header.innerText = 'Verification Check';
  overlay.appendChild(header);

  // Inject Engine Sandbox
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/engine/engine.html');
  iframe.allow = 'camera';
  overlay.appendChild(iframe);

  shadow.appendChild(overlay);

  return { container, iframe, header };
}

// Global state
let overlayUI = null;

// Listen for messages from the Service Worker (Background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_VERIFICATION') {
    if (isChecking) return;
    isChecking = true;

    if (!overlayUI) overlayUI = injectOverlay();
    overlayUI.container.style.display = 'block';
    overlayUI.header.innerText = 'Verification Check...';

    // Forward the command to the isolated iframe engine
    overlayUI.iframe.contentWindow.postMessage({
      type: 'START_VERIFICATION',
      payload: { challengeCount: 2, nonce: message.nonce }
    }, '*');
  }
});

// Listen for results from the Engine Iframe
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'VERIFICATION_RESULT') {
    isChecking = false;
    if (overlayUI) {
      overlayUI.header.innerText = 'VERIFIED';
      overlayUI.header.style.background = '#10b981';
      setTimeout(() => {
        overlayUI.container.style.display = 'none';
        overlayUI.header.style.background = '#f59e0b';
      }, 3000);
    }
    
    // Send result back to service worker
    chrome.runtime.sendMessage({
      type: 'VERIFICATION_COMPLETE',
      payload: event.data.payload
    });
  } else if (event.data && event.data.type === 'CHALLENGE_UPDATED') {
    if (overlayUI) {
      overlayUI.header.innerText = `Challenge: ${event.data.payload.instructions}`;
    }
  }
});

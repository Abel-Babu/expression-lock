// src/content/index.js - Google Meet Overlay Injector

let isChecking = false;
let meetingId = window.location.pathname.replace('/', '') || 'test-meeting';
let participantId = 'user-' + Math.floor(Math.random() * 10000); // Mock participant ID
let isHost = true; // For demo purposes, pretend we are the host

// Tell background to join
chrome.runtime.sendMessage({
  type: 'JOIN_MEETING_REQ',
  meetingId,
  participantId,
  isHost
});

function injectOverlay() {
  const container = document.createElement('div');
  container.id = 'expression-lock-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.height = '400px';
  container.style.zIndex = '999999';
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
    iframe { flex: 1; border: none; display: none; }
    .dashboard { padding: 15px; display: flex; flex-direction: column; gap: 10px; flex: 1;}
    button { padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
    button:hover { background: #2563eb; }
    .status { font-size: 14px; color: #9ca3af; }
  `;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const header = document.createElement('div');
  header.className = 'header';
  header.innerText = 'Expression Lock';
  overlay.appendChild(header);

  // Dashboard View
  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard';
  
  const statusTxt = document.createElement('div');
  statusTxt.className = 'status';
  statusTxt.innerText = 'Status: UNARMED';
  dashboard.appendChild(statusTxt);

  const armBtn = document.createElement('button');
  armBtn.innerText = 'ARM MEETING';
  armBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'ARM_MEETING_REQ' });
    armBtn.innerText = 'ARMING...';
    armBtn.disabled = true;
  };
  dashboard.appendChild(armBtn);
  
  overlay.appendChild(dashboard);

  // Inject Engine Sandbox
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/engine/engine.html');
  iframe.allow = 'camera';
  overlay.appendChild(iframe);

  shadow.appendChild(overlay);

  return { container, iframe, header, dashboard, statusTxt, armBtn };
}

// Global state
let overlayUI = injectOverlay();

// Listen for messages from the Service Worker (Background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEETING_ARMED') {
    overlayUI.statusTxt.innerText = 'Status: ARMED (Checks scheduled)';
    overlayUI.armBtn.style.display = 'none';
  } else if (message.type === 'TRIGGER_VERIFICATION') {
    if (isChecking) return;
    isChecking = true;

    overlayUI.dashboard.style.display = 'none';
    overlayUI.iframe.style.display = 'block';
    overlayUI.header.innerText = 'Verification Check...';

    // Forward the command to the isolated iframe engine
    overlayUI.iframe.contentWindow.postMessage({
      type: 'START_VERIFICATION',
      payload: { challengeCount: 2, nonce: message.nonce }
    }, '*');
  } else if (message.type === 'TRUST_LEVEL_UPDATED') {
    overlayUI.statusTxt.innerText = `Trust Level: ${message.payload.level}`;
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

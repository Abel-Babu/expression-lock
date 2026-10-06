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
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '320px';
  container.style.height = '420px';
  container.style.zIndex = '999999';
  container.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    .overlay {
      width: 100%;
      height: 100%;
      background: rgba(23, 23, 23, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      transition: all 0.3s;
    }
    .overlay.minimized {
      height: 52px !important;
      width: 200px !important;
      cursor: pointer;
    }
    .header { 
      padding: 14px 16px; 
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.02)); 
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .header-title {
      font-weight: 600; 
      font-size: 14px;
      color: #f59e0b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-controls { display: flex; gap: 8px; }
    .control-btn {
      background: none; border: none; color: #a3a3a3; cursor: pointer;
      font-size: 18px; padding: 0 4px; line-height: 1; border-radius: 4px; transition: all 0.2s;
    }
    .control-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }
    iframe { flex: 1; border: none; display: none; background: #000; }
    .dashboard { padding: 20px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
    .status-card {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .status-label { font-size: 12px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-value { font-size: 16px; font-weight: 600; color: #10b981; }
    .status-value.unarmed { color: #f59e0b; }
    .action-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: auto;
    }
    button.primary-btn { 
      padding: 14px; background: #3b82f6; color: white; border: none; 
      border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;
    }
    button.primary-btn:hover:not(:disabled) { background: #2563eb; }
    button.secondary-btn {
      padding: 14px; background: rgba(255, 255, 255, 0.05); color: #e5e5e5; 
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
      cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;
    }
    button.secondary-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .overlay.minimized .dashboard { display: none; }
  `;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  // Header
  const header = document.createElement('div');
  header.className = 'header';
  
  const headerTitle = document.createElement('div');
  headerTitle.className = 'header-title';
  headerTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Expression Lock`;
  header.appendChild(headerTitle);

  const headerControls = document.createElement('div');
  headerControls.className = 'header-controls';
  
  const minBtn = document.createElement('button');
  minBtn.className = 'control-btn';
  minBtn.innerHTML = '−';
  minBtn.onclick = (e) => {
    e.stopPropagation();
    if (overlay.classList.contains('minimized')) {
      overlay.classList.remove('minimized');
      minBtn.innerHTML = '−';
    } else {
      overlay.classList.add('minimized');
      minBtn.innerHTML = '+';
    }
  };
  
  header.onclick = () => {
    if (overlay.classList.contains('minimized')) {
      overlay.classList.remove('minimized');
      minBtn.innerHTML = '−';
    }
  };

  headerControls.appendChild(minBtn);
  header.appendChild(headerControls);
  overlay.appendChild(header);

  // Dashboard View
  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard';
  
  const statusCard = document.createElement('div');
  statusCard.className = 'status-card';
  
  const statusLabel = document.createElement('div');
  statusLabel.className = 'status-label';
  statusLabel.innerText = 'System Status';
  statusCard.appendChild(statusLabel);
  
  const statusTxt = document.createElement('div');
  statusTxt.className = 'status-value unarmed';
  statusTxt.innerText = 'Unarmed';
  statusCard.appendChild(statusTxt);
  
  dashboard.appendChild(statusCard);

  const actionGroup = document.createElement('div');
  actionGroup.className = 'action-group';

  const manualBtn = document.createElement('button');
  manualBtn.className = 'secondary-btn';
  manualBtn.innerText = 'Trigger Manual Check';
  manualBtn.onclick = () => {
    // Send message to background to trigger verification manually
    chrome.runtime.sendMessage({ type: 'MANUAL_CHECK_REQ' });
  };
  actionGroup.appendChild(manualBtn);

  const armBtn = document.createElement('button');
  armBtn.className = 'primary-btn';
  armBtn.innerText = 'Arm Auto-Scheduler';
  armBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'ARM_MEETING_REQ' });
  };
  actionGroup.appendChild(armBtn);
  
  dashboard.appendChild(actionGroup);
  overlay.appendChild(dashboard);

  // Inject Engine Sandbox
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/engine/engine.html');
  iframe.allow = 'camera';
  overlay.appendChild(iframe);

  shadow.appendChild(overlay);

  return { container, overlay, iframe, headerTitle, dashboard, statusTxt, armBtn };
}

// Global state
let overlayUI = injectOverlay();

// Listen for messages from the Service Worker (Background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEETING_ARMED') {
    overlayUI.statusTxt.innerText = 'Armed (Checks Scheduled)';
    overlayUI.statusTxt.className = 'status-value';
    overlayUI.armBtn.innerText = 'Scheduler Armed';
    overlayUI.armBtn.disabled = true;
  } else if (message.type === 'TRIGGER_VERIFICATION') {
    if (isChecking) return;
    isChecking = true;

    // Force open if minimized
    overlayUI.overlay.classList.remove('minimized');
    
    overlayUI.dashboard.style.display = 'none';
    overlayUI.iframe.style.display = 'block';
    overlayUI.headerTitle.innerText = 'Verification In Progress...';
    overlayUI.headerTitle.style.color = '#3b82f6';

    // Forward the command to the isolated iframe engine
    overlayUI.iframe.contentWindow.postMessage({
      type: 'START_VERIFICATION',
      payload: { challengeCount: 2, nonce: message.nonce }
    }, '*');
  } else if (message.type === 'TRUST_LEVEL_UPDATED') {
    overlayUI.statusTxt.innerText = `Trust Level: ${message.payload.level}`;
  }
});

// Listen for messages FROM the iframe engine
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'VERIFICATION_RESULT') {
    isChecking = false;
    overlayUI.dashboard.style.display = 'flex';
    overlayUI.iframe.style.display = 'none';
    overlayUI.headerTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Expression Lock`;
    overlayUI.headerTitle.style.color = '#f59e0b';
    
    // Relay to background
    chrome.runtime.sendMessage({
      type: 'VERIFICATION_COMPLETE',
      payload: event.data.payload
    });
  } else if (event.data && event.data.type === 'VERIFICATION_ERROR') {
    isChecking = false;
    overlayUI.dashboard.style.display = 'flex';
    overlayUI.iframe.style.display = 'none';
    overlayUI.headerTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Expression Lock`;
    overlayUI.headerTitle.style.color = '#f59e0b';
    console.error('Liveness Check Failed:', event.data.payload);
  }
});

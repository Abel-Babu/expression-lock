// src/content/index.js - Google Meet Overlay Injector

let isChecking = false;
let meetingId = window.location.pathname.replace('/', '') || 'test-meeting';
let participantId = 'user-' + Math.floor(Math.random() * 10000); // Mock participant ID
let isHost = true; // For demo purposes, pretend we are the host
let verificationResults = [];

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
  container.style.width = '320px';
  container.style.height = '420px';
  container.style.zIndex = '999999';
  container.style.transition = 'width 0.3s, height 0.3s';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    .overlay {
      width: 100%;
      height: 100%;
      background: rgba(23, 23, 23, 0.95);
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
    }
    .header { 
      padding: 14px 16px; 
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.02)); 
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      cursor: grab;
    }
    .header:active { cursor: grabbing; }
    .header-title {
      font-weight: 600; 
      font-size: 14px;
      color: #f59e0b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-controls { display: flex; gap: 4px; }
    .control-btn {
      background: none; border: none; color: #a3a3a3; cursor: pointer;
      font-size: 16px; padding: 4px; line-height: 1; border-radius: 4px; transition: all 0.2s;
    }
    .control-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }
    
    .instruction-bar {
      display: none;
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: 600;
      font-size: 15px;
      animation: slideDown 0.3s ease-out;
    }
    @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    iframe { flex: 1; border: none; display: none; background: #000; width: 100%; height: 100%; }
    
    .dashboard, .results-view { padding: 20px; display: flex; flex-direction: column; gap: 16px; flex: 1; overflow-y: auto; }
    .results-view { display: none; }
    
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
    
    .result-item {
      background: rgba(255,255,255,0.05);
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .result-item.success { border-left: 4px solid #10b981; }
    .result-item.fail { border-left: 4px solid #ef4444; }
    
    .overlay.minimized .dashboard, .overlay.minimized .results-view, .overlay.minimized iframe, .overlay.minimized .instruction-bar { display: none !important; }
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
  minBtn.title = 'Minimize';
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

  const closeBtn = document.createElement('button');
  closeBtn.className = 'control-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.title = 'Close (Background)';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    container.style.display = 'none';
  };

  headerControls.appendChild(minBtn);
  headerControls.appendChild(closeBtn);
  header.appendChild(headerControls);
  overlay.appendChild(header);

  // Draggable Header Logic
  let isDragging = false;
  let dragStartX, dragStartY;
  let initialLeft, initialTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.control-btn')) return; // Ignore buttons
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Switch from right/bottom to left/top to avoid layout jumping
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.left = initialLeft + 'px';
    container.style.top = initialTop + 'px';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    container.style.left = (initialLeft + dx) + 'px';
    container.style.top = (initialTop + dy) + 'px';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Instruction Bar
  const instructionBar = document.createElement('div');
  instructionBar.className = 'instruction-bar';
  overlay.appendChild(instructionBar);

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
  statusTxt.innerText = 'Standing By';
  statusCard.appendChild(statusTxt);
  
  dashboard.appendChild(statusCard);

  const actionGroup = document.createElement('div');
  actionGroup.className = 'action-group';

  const manualBtn = document.createElement('button');
  manualBtn.className = 'primary-btn';
  manualBtn.innerText = 'Start Verification Check';
  manualBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'MANUAL_CHECK_REQ' });
  };
  actionGroup.appendChild(manualBtn);

  const resultsBtn = document.createElement('button');
  resultsBtn.className = 'secondary-btn';
  resultsBtn.innerText = 'View Results';
  resultsBtn.onclick = () => {
    dashboard.style.display = 'none';
    resultsView.style.display = 'flex';
  };
  actionGroup.appendChild(resultsBtn);
  
  dashboard.appendChild(actionGroup);
  overlay.appendChild(dashboard);

  // Results View
  const resultsView = document.createElement('div');
  resultsView.className = 'results-view';
  
  const resultsList = document.createElement('div');
  resultsList.style.flex = '1';
  resultsList.style.overflowY = 'auto';
  resultsList.innerHTML = '<div style="color:#a3a3a3;text-align:center;margin-top:20px;">No checks run yet</div>';
  resultsView.appendChild(resultsList);

  const backBtn = document.createElement('button');
  backBtn.className = 'secondary-btn';
  backBtn.innerText = 'Back to Dashboard';
  backBtn.onclick = () => {
    resultsView.style.display = 'none';
    dashboard.style.display = 'flex';
  };
  resultsView.appendChild(backBtn);
  
  overlay.appendChild(resultsView);

  // Inject Engine Sandbox
  const iframeContainer = document.createElement('div');
  iframeContainer.style.flex = '1';
  iframeContainer.style.position = 'relative';
  iframeContainer.style.display = 'none';

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/engine/engine.html');
  iframe.allow = 'camera';
  iframeContainer.appendChild(iframe);
  overlay.appendChild(iframeContainer);

  shadow.appendChild(overlay);

  return { container, overlay, iframeContainer, iframe, headerTitle, dashboard, resultsView, resultsList, statusTxt, instructionBar };
}

// Global state
let overlayUI = injectOverlay();

function updateResultsList() {
  if (verificationResults.length === 0) {
    overlayUI.resultsList.innerHTML = '<div style="color:#a3a3a3;text-align:center;margin-top:20px;">No checks run yet</div>';
    return;
  }
  overlayUI.resultsList.innerHTML = '';
  verificationResults.forEach((res, i) => {
    const d = document.createElement('div');
    d.className = 'result-item ' + (res.status === 'VERIFIED' ? 'success' : 'fail');
    d.innerHTML = `<strong>Check #${i + 1}</strong>: ${res.status}<br><span style="color:#a3a3a3;font-size:11px;">${new Date(res.time).toLocaleTimeString()}</span>`;
    overlayUI.resultsList.prepend(d);
  });
}

// Listen for messages from the Service Worker (Background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_OVERLAY') {
    overlayUI.container.style.display = overlayUI.container.style.display === 'none' ? 'block' : 'none';
  } else if (message.type === 'TRIGGER_VERIFICATION') {
    if (isChecking) return;
    isChecking = true;

    // Force open if minimized or hidden
    overlayUI.overlay.classList.remove('minimized');
    overlayUI.container.style.display = 'block';
    
    overlayUI.dashboard.style.display = 'none';
    overlayUI.resultsView.style.display = 'none';
    overlayUI.iframeContainer.style.display = 'block';
    overlayUI.iframe.style.display = 'block';
    
    overlayUI.instructionBar.style.display = 'block';
    overlayUI.instructionBar.innerText = 'Initializing Camera...';

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
  if (event.data && event.data.type === 'CHALLENGE_UPDATED') {
    const payload = event.data.payload;
    overlayUI.instructionBar.style.background = '#3b82f6'; // Reset to blue
    overlayUI.instructionBar.innerText = `(${payload.index + 1}/${payload.total}) ${payload.instructions}`;
  } else if (event.data && event.data.type === 'EXPRESSION_PASSED') {
    overlayUI.instructionBar.style.background = '#10b981'; // Turn green!
    overlayUI.instructionBar.innerText = 'Action Detected! Extracting Identity...';
  } else if (event.data && event.data.type === 'VERIFICATION_RESULT') {
    isChecking = false;
    overlayUI.dashboard.style.display = 'flex';
    overlayUI.iframeContainer.style.display = 'none';
    overlayUI.instructionBar.style.display = 'none';
    overlayUI.headerTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Expression Lock`;
    overlayUI.headerTitle.style.color = '#f59e0b';
    
    verificationResults.push({ status: event.data.payload.status, time: Date.now() });
    updateResultsList();

    // Relay to background
    chrome.runtime.sendMessage({
      type: 'VERIFICATION_COMPLETE',
      payload: event.data.payload
    });
  } else if (event.data && event.data.type === 'VERIFICATION_ERROR') {
    isChecking = false;
    overlayUI.dashboard.style.display = 'flex';
    overlayUI.iframeContainer.style.display = 'none';
    overlayUI.instructionBar.style.display = 'none';
    overlayUI.headerTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Expression Lock`;
    overlayUI.headerTitle.style.color = '#ef4444'; // Red header
    
    // Show error on dashboard
    overlayUI.statusTxt.innerText = 'Error: ' + event.data.payload;
    overlayUI.statusTxt.style.color = '#ef4444';
    
    verificationResults.push({ status: 'FAILED: ' + event.data.payload, time: Date.now() });
    updateResultsList();
    
    console.error('Liveness Check Failed:', event.data.payload);
  }
});

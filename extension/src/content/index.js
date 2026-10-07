import { TabSyncManager } from './tabSync.js';

let shadowRoot = null;
let container = null;
let meetingCode = '';

// UI Elements
let idlePill, hostPanel, participantCard, challengeView, resultsView;
let wsStateStr = 'DISCONNECTED';
let amIHost = false;
let myMemberId = 'dummy-id'; // Replaced by actual token in Phase 6

function injectShadowDOM() {
  const host = document.createElement('div');
  host.id = 'expression-lock-host';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '100%';
  host.style.pointerEvents = 'none'; // Click through by default
  host.style.zIndex = '999999';
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'closed' });
  
  const style = document.createElement('style');
  style.textContent = `
    .panel { pointer-events: auto; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; padding: 16px; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .hidden { display: none !important; }
    .offscreen { position: absolute !important; opacity: 0 !important; pointer-events: none !important; z-index: -100 !important; }
    button { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px; }
    button:hover { background: #2563eb; }
    .btn-danger { background: #ef4444; }
    #idle-pill { position: fixed; top: 16px; left: 16px; width: auto; padding: 8px 16px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    #host-panel { position: fixed; top: 60px; left: 16px; width: 300px; }
    #participant-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; text-align: center; }
    #challenge-view { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 680px; text-align: center; }
    #results-view { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; }
    
    .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .bg-green { background: #10b981; }
    .bg-red { background: #ef4444; }
    .bg-yellow { background: #f59e0b; }
    .bg-gray { background: #64748b; }
    
    iframe { width: 640px; height: 480px; border: none; border-radius: 8px; background: black; }
  `;
  shadowRoot.appendChild(style);

  // 1. Idle Pill
  idlePill = document.createElement('div');
  idlePill.id = 'idle-pill';
  idlePill.className = 'panel';
  idlePill.innerHTML = `<strong>Expression Lock</strong> <span id="ws-badge" class="status-badge bg-gray">Connecting...</span>`;
  idlePill.onclick = () => {
    if (hostPanel.classList.contains('hidden')) hostPanel.classList.remove('hidden');
    else hostPanel.classList.add('hidden');
  };
  shadowRoot.appendChild(idlePill);

  // 2. Host Panel
  hostPanel = document.createElement('div');
  hostPanel.id = 'host-panel';
  hostPanel.className = 'panel hidden';
  hostPanel.innerHTML = `
    <h3>Host Panel</h3>
    <button id="btn-claim-host">Claim Host</button>
    <div id="host-controls" class="hidden">
      <button id="btn-start-standard">Start Standard Check (2)</button>
      <button id="btn-start-strict">Start Strict Check (3)</button>
    </div>
    <h4>Participants</h4>
    <div id="participant-list"></div>
  `;
  shadowRoot.appendChild(hostPanel);

  // 3. Participant Card
  participantCard = document.createElement('div');
  participantCard.id = 'participant-card';
  participantCard.className = 'panel hidden';
  participantCard.innerHTML = `
    <h2>Verification Requested</h2>
    <p>The host has requested a biometric verification.</p>
    <button id="btn-begin-attempt">Begin (45s)</button>
  `;
  shadowRoot.appendChild(participantCard);

  // 4. Challenge View (Contains engine iframe)
  challengeView = document.createElement('div');
  challengeView.id = 'challenge-view';
  challengeView.className = 'panel offscreen';
  challengeView.innerHTML = `
    <h2 id="cv-title">Get Ready</h2>
    <p id="cv-inst">Looking for face...</p>
    <iframe id="engine-iframe" src="${chrome.runtime.getURL('src/engine/engine.html')}" allow="camera *; microphone *"></iframe>
  `;
  shadowRoot.appendChild(challengeView);

  // 5. Results View
  resultsView = document.createElement('div');
  resultsView.id = 'results-view';
  resultsView.className = 'panel hidden';
  resultsView.innerHTML = `
    <h2>Round Results</h2>
    <div id="rv-list"></div>
    <button id="btn-close-results">Close</button>
  `;
  shadowRoot.appendChild(resultsView);

  bindEvents();
}

function bindEvents() {
  shadowRoot.getElementById('btn-claim-host').onclick = () => {
    sendToEngine('WS_SEND', { type: 'CLAIM_HOST' });
  };
  shadowRoot.getElementById('btn-start-standard').onclick = () => {
    sendToEngine('WS_SEND', { type: 'START_ROUND', payload: { type: 'STANDARD' } });
  };
  shadowRoot.getElementById('btn-start-strict').onclick = () => {
    sendToEngine('WS_SEND', { type: 'START_ROUND', payload: { type: 'STRICT' } });
  };
  shadowRoot.getElementById('btn-begin-attempt').onclick = () => {
    participantCard.classList.add('hidden');
    challengeView.classList.remove('offscreen');
    sendToEngine('WARM_UP_CAMERA', {});
  };
  shadowRoot.getElementById('btn-close-results').onclick = () => {
    resultsView.classList.add('hidden');
  };
}

function sendToEngine(type, payload) {
  const iframe = shadowRoot.getElementById('engine-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type, payload }, '*');
  }
}

// Extract meeting ID from Meet URL
function getMeetingCode() {
  const path = window.location.pathname;
  if (path && path.length > 1) {
    return path.substring(1).split('?')[0]; // e.g. "abc-defg-hij"
  }
  return 'test-meeting';
}

function init() {
  meetingCode = getMeetingCode();
  injectShadowDOM();
  
  // Wait for iframe to load, then connect WS
  const iframe = shadowRoot.getElementById('engine-iframe');
  iframe.onload = () => {
    chrome.storage.local.get(['serverUrl', 'memberToken'], (res) => {
      const url = res.serverUrl || 'ws://localhost:3000';
      myMemberId = res.memberToken || 'dummy-id-' + Math.floor(Math.random()*10000);
      sendToEngine('CONNECT_WS', { url, token: myMemberId, meetingCode });
    });
  };

  // Tab Sync to prevent duplicate WS connections
  new TabSyncManager(meetingCode, (state) => {
    if (state === 'PASSIVE') {
      idlePill.innerHTML = `<strong>Expression Lock</strong> <span class="status-badge bg-yellow">Passive Tab</span>`;
      sendToEngine('WS_SEND', { type: 'DISCONNECT' }); // Actually engine/index.js doesn't handle DISCONNECT yet, we just ignore for now
    }
  });
}

// Listen to messages from Engine
window.addEventListener('message', (event) => {
  if (!event.origin.startsWith('chrome-extension://')) return;
  const msg = event.data;
  
  if (msg.type === 'WS_STATE') {
    const badge = shadowRoot.getElementById('ws-badge');
    badge.innerText = msg.payload;
    if (msg.payload === 'CONNECTED') badge.className = 'status-badge bg-green';
    else badge.className = 'status-badge bg-red';
  }

  if (msg.type === 'CAMERA_READY') {
    // Camera is warmed up and permission is granted!
    // Now we can safely tell the server we are beginning the attempt.
    sendToEngine('WS_SEND', { type: 'BEGIN_ATTEMPT' });
  }

  if (msg.type === 'CAMERA_FAILED') {
    // Permission denied or camera broken
    participantCard.classList.remove('hidden');
    challengeView.classList.add('offscreen');
    participantCard.innerHTML = `
      <h2>Technical Error</h2>
      <p style="color:#ef4444">Camera Permission Denied.</p>
      <button id="btn-begin-attempt" class="btn-danger">Try Again</button>
    `;
    shadowRoot.getElementById('btn-begin-attempt').onclick = () => {
      participantCard.classList.add('hidden');
      challengeView.classList.remove('offscreen');
      sendToEngine('WARM_UP_CAMERA', {});
    };
  }
  
  if (msg.type === 'SERVER_EVENT') {
    handleServerEvent(msg.payload);
  }

  // Engine challenge updates
  if (msg.type === 'READINESS_STEP') {
    shadowRoot.getElementById('cv-title').innerText = 'Readiness Check';
    shadowRoot.getElementById('cv-inst').innerText = msg.payload.message;
  }
  if (msg.type === 'COUNTDOWN_START') {
    shadowRoot.getElementById('cv-title').innerText = 'Get Ready!';
    shadowRoot.getElementById('cv-inst').innerText = 'Starting in 3...';
  }
  if (msg.type === 'CHALLENGE_UPDATED') {
    shadowRoot.getElementById('cv-title').innerText = `Task ${msg.payload.index + 1} / ${msg.payload.total}`;
    shadowRoot.getElementById('cv-inst').innerText = msg.payload.instructions;
    shadowRoot.getElementById('cv-title').style.color = 'white';
  }
  if (msg.type === 'EXPRESSION_PASSED') {
    shadowRoot.getElementById('cv-title').innerText = `Success!`;
    shadowRoot.getElementById('cv-title').style.color = '#10b981';
    shadowRoot.getElementById('cv-inst').innerText = 'Extracting Identity...';
  }
});

function handleServerEvent(payload) {
  if (payload.type === 'MEETING_STATE') {
    amIHost = (payload.hostId === myMemberId);
    if (amIHost) {
      shadowRoot.getElementById('btn-claim-host').classList.add('hidden');
      shadowRoot.getElementById('host-controls').classList.remove('hidden');
    } else {
      shadowRoot.getElementById('btn-claim-host').classList.remove('hidden');
      shadowRoot.getElementById('host-controls').classList.add('hidden');
    }
    
    const list = shadowRoot.getElementById('participant-list');
    list.innerHTML = payload.participants.map(p => `<div>${p} ${p===payload.hostId ? '(Host)' : ''}</div>`).join('');
  }
  
  if (payload.type === 'ROUND_REQUEST') {
    hostPanel.classList.add('hidden'); if(true) {
      participantCard.classList.remove('hidden');
    }
    // Background notification
    if (document.visibilityState === 'hidden') {
      chrome.runtime.sendMessage({ type: 'SHOW_NOTIFICATION', message: `Verification requested by ${payload.hostName}` });
    }
  }
  
  if (payload.type === 'ATTEMPT_GRANTED') {
    participantCard.classList.add('hidden');
    challengeView.classList.remove('offscreen');
    // Tell engine to run attempt immediately, since camera is already warmed up
    sendToEngine('RUN_ATTEMPT', { challengeCount: 2, nonce: payload.nonce });
  }

  if (payload.type === 'ATTEMPT_RESULT') {
    challengeView.classList.add('offscreen');
    if (payload.status === 'RETRYING') {
      participantCard.classList.remove('hidden');
      participantCard.innerHTML = `
        <h2>Attempt Failed</h2>
        <p>${payload.reason}</p>
        <button id="btn-begin-attempt" class="btn-danger">Retry (${payload.attemptsLeft} left)</button>
      `;
      shadowRoot.getElementById('btn-begin-attempt').onclick = () => {
        participantCard.classList.add('hidden');
        challengeView.classList.remove('offscreen');
        sendToEngine('WARM_UP_CAMERA', {});
      };
    } else if (payload.status === 'FAILED') {
      participantCard.classList.remove('hidden');
      participantCard.innerHTML = `
        <h2>Verification Failed</h2>
        <p>No attempts remaining. The host has been notified.</p>
      `;
      setTimeout(() => participantCard.classList.add('hidden'), 5000);
    } else if (payload.status === 'VERIFIED') {
      participantCard.classList.remove('hidden');
      participantCard.innerHTML = `
        <h2 style="color:#10b981">Verified!</h2>
        <p>You may return to the meeting.</p>
      `;
      setTimeout(() => participantCard.classList.add('hidden'), 3000);
    } else if (payload.status === 'PENDING') {
      participantCard.classList.remove('hidden');
      participantCard.innerHTML = `
        <h2>Technical Error</h2>
        <p style="color:#ef4444">${payload.reason || 'Camera or Database failed to load.'}</p>
        <button id="btn-begin-attempt" class="btn-danger">Try Again</button>
      `;
      shadowRoot.getElementById('btn-begin-attempt').onclick = () => {
        participantCard.classList.add('hidden');
        challengeView.classList.remove('offscreen');
        sendToEngine('WARM_UP_CAMERA', {});
      };
    }
  }

  if (payload.type === 'ROUND_RESULTS') {
    resultsView.classList.remove('hidden');
    const rv = shadowRoot.getElementById('rv-list');
    rv.innerHTML = payload.summary.results.map(r => `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>${r.name}</span>
        <span class="status-badge ${r.status==='VERIFIED'?'bg-green':r.status==='FAILED'?'bg-red':'bg-gray'}">${r.status} (${r.attempts} tries)</span>
      </div>
    `).join('');
  }
  
  if (payload.type === 'ROUND_PROGRESS') {
    const list = shadowRoot.getElementById('participant-list');
    list.innerHTML = payload.progress.map(p => `
      <div style="display:flex; justify-content:space-between;">
        <span>${p.memberId}</span>
        <span>${p.status}</span>
      </div>
    `).join('');
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

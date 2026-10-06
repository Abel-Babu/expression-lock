// src/hostView.js - Host Panel
import { getUsers } from './orgStore.js';
import { sendSignal, onSignal } from './signal.js';

export async function renderHostPanel(container) {
  const users = await getUsers();
  const enrolledUsers = users.filter(u => u.enrolled);

  container.innerHTML = `
    <div class="org-console-container" style="max-width: 800px; margin: 0 auto;">
      <div class="org-header">
        <div class="org-title-group">
          <h2>Meeting Host Panel (Checkpoint 1)</h2>
          <p>Verify attendees via cryptographic liveness challenges.</p>
        </div>
      </div>
      
      <div class="panel">
        <h3>Select Participant to Verify</h3>
        <select id="host-participant-select" style="width: 100%; padding: 0.8rem; background: var(--bg-dark); color: var(--c-cream); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; margin-bottom: 1.5rem; font-size: 1rem;">
          <option value="">-- Select Enrolled User --</option>
          ${enrolledUsers.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('')}
        </select>
        
        <button id="btn-trigger-liveness" class="btn-action btn-ready" disabled>Trigger Remote Liveness Verification</button>
      </div>

      <div id="host-status-panel" class="panel" style="margin-top: 1.5rem; display: none;">
        <h3>Verification Status</h3>
        <div class="session-strip unverified" id="host-session-strip">
          <span>Waiting for participant...</span>
        </div>
        <ul style="color: var(--c-silver); margin-top: 1rem; line-height: 1.6;" id="host-log-list">
        </ul>
      </div>
    </div>
  `;

  const select = document.getElementById('host-participant-select');
  const btnTrigger = document.getElementById('btn-trigger-liveness');
  const statusPanel = document.getElementById('host-status-panel');
  const sessionStrip = document.getElementById('host-session-strip');
  const logList = document.getElementById('host-log-list');

  function addLog(msg) {
    const li = document.createElement('li');
    li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logList.prepend(li);
  }

  select.addEventListener('change', () => {
    btnTrigger.disabled = !select.value;
  });

  btnTrigger.addEventListener('click', () => {
    const userId = select.value;
    if (!userId) return;

    statusPanel.style.display = 'block';
    sessionStrip.className = 'session-strip unverified';
    sessionStrip.innerHTML = '<span><strong>Status:</strong> Challenge Sent...</span>';
    logList.innerHTML = '';
    
    addLog(`Sending liveness challenge trigger to participant ${userId}...`);
    
    sendSignal('LIVENESS_REQUEST', { userId });
  });

  onSignal((type, payload) => {
    if (type === 'LIVENESS_STARTED') {
      addLog('Participant acknowledged. Challenge sequence started.');
    } else if (type === 'LIVENESS_SUCCESS') {
      addLog(`Verification cryptographically signed by ${payload.userName}.`);
      sessionStrip.className = 'session-strip verified';
      sessionStrip.innerHTML = `<span><strong>Status:</strong> Verified - ${payload.userName}</span>`;
    } else if (type === 'LIVENESS_FAILED') {
      addLog(`Verification failed: ${payload.reason}`);
      sessionStrip.className = 'session-strip unverified';
      sessionStrip.innerHTML = `<span><strong>Status:</strong> FAILED - ${payload.reason}</span>`;
    }
  });
}

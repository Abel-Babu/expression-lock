import { openModal } from './modal.js';

export function renderPortal(container) {
  container.innerHTML = `
    <div class="panel">
      <div class="portal-header">
        <h1>Arup Global Treasury & Clearing Portal</h1>
      </div>
      
      <div class="tx-card">
        <!-- Session Strip -->
        <div class="session-strip unverified" id="portal-session-strip">
          <span><strong>Session Status:</strong> No verified meeting session</span>
          <span>--:--</span>
        </div>

        <div class="tx-details">
          <div class="tx-row">
            <span>Recipient</span>
            <span>Offshore Capital Reserve Ltd.</span>
          </div>
          <div class="tx-row">
            <span>Amount</span>
            <span style="color: var(--amber); font-size: 1.1rem;">$25,000,000 USD</span>
          </div>
          <div class="tx-row">
            <span>Status</span>
            <span>Awaiting Biometric Executive Sign-off</span>
          </div>
          <div class="tx-row">
            <span>Required Approver</span>
            <span>Chief Financial Officer (CFO)</span>
          </div>

          <h2 style="text-align: center; margin-top: 2rem;">$25,000,000 USD</h2>

          <!-- Action Button -->
          <button id="tx-action-btn" class="btn-action btn-ready">
            [ Authorize & Sign Wire Transfer ]
          </button>
        </div>
      </div>

      <!-- Security Audit Log -->
      <details class="audit-log">
        <summary>Security Audit Log</summary>
        <div class="audit-content" id="audit-log-list">
          <p><em>No events logged yet.</em></p>
        </div>
      </details>

      <!-- Debug Controls (Phase 1 preview requirement) -->
      <div class="debug-controls">
        <h4>Demo State Preview (Phase 1)</h4>
        <label><input type="radio" name="btn-state" value="locked"> Locked (No Session)</label>
        <label><input type="radio" name="btn-state" value="ready" checked> Ready</label>
        <label><input type="radio" name="btn-state" value="frozen"> Frozen (Alert)</label>
        <label><input type="radio" name="btn-state" value="authorized"> Authorized</label>
      </div>
    </div>
  `;

  const btn = document.getElementById('tx-action-btn');
  const strip = document.getElementById('portal-session-strip');

  // Handle the action button click
  btn.addEventListener('click', () => {
    // Only open the modal if the button is in the 'ready' state
    if (btn.classList.contains('btn-ready')) {
      openModal();
    }
  });

  // Handle the debug radio buttons to preview states
  document.querySelectorAll('input[name="btn-state"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const state = e.target.value;
      
      // Reset button classes
      btn.className = 'btn-action';
      
      if (state === 'locked') {
        btn.classList.add('btn-locked');
        btn.textContent = 'Locked: verified meeting session required';
        strip.className = 'session-strip unverified';
        strip.innerHTML = '<span><strong>Session Status:</strong> No verified meeting session</span><span>--:--</span>';
      } 
      else if (state === 'ready') {
        btn.classList.add('btn-ready');
        btn.textContent = '[ Authorize & Sign Wire Transfer ]';
        strip.className = 'session-strip verified';
        strip.innerHTML = '<span><strong>Session Status:</strong> Verified (CFO present)</span><span>29:45</span>';
      }
      else if (state === 'frozen') {
        btn.classList.add('btn-frozen');
        btn.textContent = 'TRANSACTION FROZEN - SECURITY ESCALATION TRIGGERED';
      }
      else if (state === 'authorized') {
        btn.classList.add('btn-authorized');
        btn.textContent = 'Transfer Authorized & Executed';
      }
    });
  });
}

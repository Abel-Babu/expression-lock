import { openModal } from './modal.js';

export function renderPortal(container) {
  container.innerHTML = `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <div class="logo">A</div>
          <span>Arup Treasury</span>
        </div>
        <ul class="nav-links">
          <li class="active">Pending Approvals <span class="badge error">1</span></li>
          <li>Accounts</li>
          <li>Wire Transfers</li>
          <li>Audit Logs</li>
          <li>Settings</li>
        </ul>
      </aside>

      <!-- Main Content -->
      <div class="dashboard-main">
        <!-- Top Header -->
        <header class="top-header">
          <h2>Clearing & Settlements</h2>
          <div class="user-profile">
            <div class="avatar">CFO</div>
            <div class="user-info">
              <strong>Chief Financial Officer</strong>
              <small>Enterprise Admin</small>
            </div>
          </div>
        </header>

        <div class="dashboard-content">
          <!-- The $25M Action Card -->
          <div class="tx-card">
            <div class="session-strip unverified" id="portal-session-strip">
              <span><strong>Session Status:</strong> No verified meeting session found</span>
              <span>--:--</span>
            </div>

            <div class="tx-details">
              <div class="tx-header">
                <h3>URGENT: Outbound Wire Transfer</h3>
                <span class="tx-id">TX-2026-0001</span>
              </div>
              
              <h2 class="tx-amount">$25,000,000 USD</h2>

              <div class="tx-row">
                <span>Beneficiary Account</span>
                <span>Offshore Capital Reserve Ltd. (Acct: ****8992)</span>
              </div>
              <div class="tx-row">
                <span>Originating Account</span>
                <span>Arup Global Operating (Acct: ****1104)</span>
              </div>
              <div class="tx-row">
                <span>Required Biometric Approver</span>
                <span style="color: var(--cyan);">Chief Financial Officer</span>
              </div>

              <!-- Action Button -->
              <button id="tx-action-btn" class="btn-action btn-ready" style="margin-top: 1.5rem;">
                [ Authorize & Sign Wire Transfer ]
              </button>
            </div>
          </div>

          <!-- Fake Transaction History -->
          <div class="history-panel">
            <h3>Recent Transactions</h3>
            <table class="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ID</th>
                  <th>Beneficiary</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Today, 10:14 AM</td>
                  <td>TX-0099</td>
                  <td>AWS Cloud Services</td>
                  <td>$142,500.00</td>
                  <td><span class="badge success">Cleared</span></td>
                </tr>
                <tr>
                  <td>Yesterday</td>
                  <td>TX-0098</td>
                  <td>Payroll Funding</td>
                  <td>$1,200,000.00</td>
                  <td><span class="badge success">Cleared</span></td>
                </tr>
                <tr>
                  <td>Oct 02, 2026</td>
                  <td>TX-0097</td>
                  <td>Legal Retainer</td>
                  <td>$50,000.00</td>
                  <td><span class="badge success">Cleared</span></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>

    <!-- Debug Controls (Phase 1 preview requirement) -->
    <div class="debug-controls" style="position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); z-index: 100;">
      <h4>Security State (Demo)</h4>
      <label><input type="radio" name="btn-state" value="locked"> Locked</label>
      <label><input type="radio" name="btn-state" value="ready" checked> Ready</label>
      <label><input type="radio" name="btn-state" value="frozen"> Frozen</label>
      <label><input type="radio" name="btn-state" value="authorized"> Authorized</label>
    </div>
  `;

  const btn = document.getElementById('tx-action-btn');
  const strip = document.getElementById('portal-session-strip');

  // Handle the action button click
  btn.addEventListener('click', () => {
    if (btn.classList.contains('btn-ready')) {
      openModal();
    }
  });

  // Handle the debug radio buttons to preview states
  document.querySelectorAll('input[name="btn-state"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const state = e.target.value;
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
        strip.innerHTML = '<span><strong>Session Status:</strong> Verified (Host: CTO)</span><span>29:45</span>';
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

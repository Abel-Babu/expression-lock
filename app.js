import { renderPortal } from './src/portal.js';
import './src/modal.js';

const views = {
  '#/org': '<h2>Org Console</h2><p>Roster, policies, and enrollment go here.</p>',
  '#/host': '<h2>Host Panel (Checkpoint 1)</h2><p>Meeting verification controls go here.</p>',
  '#/participant': '<h2>Participant View</h2><p>Local tile that runs challenges when requested.</p>',
  '#/engine': `
    <div class="panel">
      <h2>Engine Status Check</h2>
      <ul class="status-list" id="engine-status-list">
        <li><span>Camera Access</span> <span class="badge pending" id="status-cam">Pending</span></li>
        <li><span>Face Landmarker (MediaPipe)</span> <span class="badge pending" id="status-face">Pending</span></li>
        <li><span>Hand Landmarker (MediaPipe)</span> <span class="badge pending" id="status-hand">Pending</span></li>
        <li><span>Identity Model (face-api)</span> <span class="badge pending" id="status-id">Pending</span></li>
      </ul>
    </div>
  `
};

function renderView() {
  const hash = window.location.hash || '#/portal';
  const appView = document.getElementById('app-view');
  
  // Highlight nav
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const activeNav = document.querySelector(`nav a[href="${hash}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Render view
  if (hash === '#/portal') {
    renderPortal(appView);
  } else if (views[hash]) {
    appView.innerHTML = views[hash];
    if (hash === '#/engine') runEngineChecks();
  } else {
    appView.innerHTML = '<h2>404 - View Not Found</h2>';
  }
}

async function runEngineChecks() {
  const updateStatus = (id, success) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = success ? 'Ready' : 'Failed';
      el.className = success ? 'badge success' : 'badge error';
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    updateStatus('status-cam', true);
    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    updateStatus('status-cam', false);
  }

  try {
    const res = await fetch('./vendor/face_landmarker.task', { method: 'HEAD' });
    updateStatus('status-face', res.ok);
  } catch(e) { updateStatus('status-face', false); }

  try {
    const res = await fetch('./vendor/hand_landmarker.task', { method: 'HEAD' });
    updateStatus('status-hand', res.ok);
  } catch(e) { updateStatus('status-hand', false); }

  try {
    const res = await fetch('./models/tiny_face_detector_model-weights_manifest.json', { method: 'HEAD' });
    updateStatus('status-id', res.ok);
  } catch(e) { updateStatus('status-id', false); }
}

window.addEventListener('hashchange', renderView);
document.addEventListener('DOMContentLoaded', renderView);

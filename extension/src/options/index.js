import { initIdentityEngine, extractFaceEmbedding } from '../engine/identity.js';
import { saveIdentityTemplate } from '../engine/store.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authSection = document.getElementById('auth-section');
  const enrollSection = document.getElementById('enroll-section');
  const successSection = document.getElementById('success-section');

  let pendingToken = null;
  let videoStream = null;

  // Check if already enrolled
  chrome.storage.local.get(['memberToken', 'serverUrl'], (res) => {
    if (res.serverUrl) {
      document.getElementById('serverUrl').value = res.serverUrl;
    }
    if (res.memberToken) {
      showSection(successSection);
    }
  });

  function showSection(sec) {
    authSection.classList.add('hidden');
    enrollSection.classList.add('hidden');
    successSection.classList.add('hidden');
    sec.classList.remove('hidden');
  }

  // 1. Auth Step
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const inviteCode = document.getElementById('inviteCode').value.trim();
    let serverUrl = document.getElementById('serverUrl').value.trim();
    const status = document.getElementById('auth-status');

    if (!email || !inviteCode) {
      status.innerText = 'Please fill out all fields.';
      return;
    }

    status.innerText = 'Authenticating...';
    status.className = 'status';

    try {
      const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const res = await fetch(`${httpUrl}/api/auth/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      pendingToken = data.token;
      
      // Save server URL as WS url
      let wsUrl = serverUrl;
      if (serverUrl.startsWith('http://')) wsUrl = serverUrl.replace('http://', 'ws://');
      if (serverUrl.startsWith('https://')) wsUrl = serverUrl.replace('https://', 'wss://');
      
      await chrome.storage.local.set({ serverUrl: wsUrl });

      // Move to enroll
      startEnrollmentPhase();

    } catch (e) {
      status.innerText = e.message;
      status.className = 'status text-red';
    }
  });

  // 2. Enroll Step
  async function startEnrollmentPhase() {
    showSection(enrollSection);
    const btn = document.getElementById('btn-enroll');
    const status = document.getElementById('enroll-status');
    const video = document.getElementById('enroll-video');

    try {
      // Start camera
      videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      video.srcObject = videoStream;

      // Load AI
      await initIdentityEngine();

      btn.innerText = 'Scan & Register Face';
      btn.disabled = false;

      btn.onclick = async () => {
        btn.disabled = true;
        btn.innerText = 'Extracting Identity...';
        status.innerText = '';
        status.className = 'status';

        try {
          const result = await extractFaceEmbedding(video);
          if (!result) {
            throw new Error('No face detected. Please look clearly at the camera.');
          }

          // Save to IndexedDB
          await saveIdentityTemplate(result.descriptor);

          // Save token
          await chrome.storage.local.set({ memberToken: pendingToken });

          // Stop camera
          videoStream.getTracks().forEach(t => t.stop());

          showSection(successSection);
        } catch (e) {
          status.innerText = e.message;
          status.className = 'status text-red';
          btn.disabled = false;
          btn.innerText = 'Try Again';
        }
      };

    } catch (e) {
      status.innerText = 'Camera access denied or AI failed to load: ' + e.message;
      status.className = 'status text-red';
    }
  }

  // 3. Reset
  document.getElementById('btn-reset').addEventListener('click', async () => {
    await chrome.storage.local.clear();
    const { clearIdentityTemplate } = await import('../engine/store.js');
    await clearIdentityTemplate();
    window.location.reload();
  });

});

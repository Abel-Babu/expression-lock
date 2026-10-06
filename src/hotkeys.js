// src/hotkeys.js - Hackathon Demo Hotkeys & Attack Lab Simulator
import { sendSignal } from './signal.js';

export function initHotkeys() {
  document.addEventListener('keydown', (e) => {
    // Ignore hotkeys if typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();
    
    switch (key) {
      case 'P':
        // Simulate a complete Pass
        console.log('[Demo Hotkey] P: Simulating successful Liveness Pass');
        sendSignal('LIVENESS_SUCCESS', { userName: 'Demo User (Hotkey)' });
        break;
        
      case 'F':
        // Simulate a Failure (Deepfake / Sploofing attempt)
        console.log('[Demo Hotkey] F: Simulating Liveness Failure (Deepfake detected)');
        sendSignal('LIVENESS_FAILED', { reason: 'Deepfake Suspicion (Demo Hotkey)' });
        break;
        
      case 'O':
        // Simulate an Outsider identity mismatch
        console.log('[Demo Hotkey] O: Simulating Outsider (Identity Mismatch)');
        sendSignal('LIVENESS_FAILED', { reason: 'Identity Mismatch (Unrecognized Face)' });
        break;

      case 'R':
        // Reset Application State
        console.log('[Demo Hotkey] R: Resetting application state');
        const btn = document.getElementById('tx-action-btn');
        const strip = document.getElementById('portal-session-strip');
        if (btn && strip) {
          btn.className = 'btn-action btn-locked';
          btn.textContent = 'Locked: verified meeting session required';
          strip.className = 'session-strip unverified';
          strip.innerHTML = '<span><strong>Session Status:</strong> No verified meeting session</span><span>--:--</span>';
        }
        sendSignal('RESET_STATE');
        break;

      case 'V':
        // Simulate 'Verify Everyone' mixed results in Host Panel
        console.log('[Demo Hotkey] V: Simulating mixed Verify Everyone results');
        sendSignal('DEMO_VERIFY_EVERYONE');
        break;
    }
  });

  // Inject a small "Demo Hotkeys" legend widget into the bottom left of the screen
  const legend = document.createElement('div');
  legend.style.position = 'fixed';
  legend.style.bottom = '10px';
  legend.style.left = '10px';
  legend.style.background = 'rgba(0,0,0,0.7)';
  legend.style.color = '#888';
  legend.style.padding = '8px 12px';
  legend.style.borderRadius = '6px';
  legend.style.fontSize = '0.75rem';
  legend.style.fontFamily = 'monospace';
  legend.style.zIndex = '9999';
  legend.style.border = '1px solid rgba(255,255,255,0.1)';
  legend.innerHTML = `
    <strong>Demo Hotkeys</strong><br>
    <span style="color:#22c55e">P</span>: Pass &nbsp; 
    <span style="color:#ef4444">F</span>: Fail (Deepfake)<br>
    <span style="color:#f59e0b">O</span>: Outsider &nbsp;
    <span style="color:#64748b">R</span>: Reset
  `;
  document.body.appendChild(legend);
}

import { initIdentityEngine, extractFaceEmbedding, computeEuclideanDistance } from './identity.js';
import { initVisionEngine, startCameraAndTracking, stopCameraAndTracking } from './vision.js';
import { generateChallengeSequence, evaluateChallenge } from './liveness.js';
import { CONFIG } from '../../../shared/config.js';
import { loadIdentityTemplate } from './store.js';
import { ConnectionManager } from './ws.js';

let isBusy = false;
let wsManager = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure the UI updates
function notifyHost(type, payload) {
  window.parent.postMessage({ type, payload }, '*');
}

async function runAttempt({ challengeCount = 2, nonce = '' }) {
  if (isBusy) return { status: 'TECHNICAL_ISSUE', reason: 'EngineBusy' };
  isBusy = true;

  try {
    notifyHost('STATUS_UPDATE', { message: 'Loading AI Models...' });
    await initIdentityEngine();
    await initVisionEngine();
    
    // Load local enrolled face
    const targetEmbedding = await loadIdentityTemplate();
    if (!targetEmbedding) {
      return { status: 'FAILED', reason: 'IdentityMismatch', details: 'No face enrolled' };
    }
    
    // Create elements
    let video = document.getElementById('engine-video');
    let canvas = document.getElementById('engine-canvas');
    if (!video) {
      video = document.createElement('video');
      video.id = 'engine-video';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.width = 640;
      video.height = 480;
      document.body.appendChild(video);
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'engine-canvas';
      document.body.appendChild(canvas);
    }

    return new Promise((resolve) => {
      let phase = 'READINESS'; // READINESS -> GET_READY -> CHALLENGES
      let currentChallengeIndex = 0;
      let challengesToRun = generateChallengeSequence(challengeCount);
      let challengeStartTime = 0;
      let expressionPassed = false;
      let frameCount = 0;
      let isExtractingIdentity = false;
      let countdownStart = 0;

      notifyHost('READINESS_STEP', { message: 'Please look at the camera. Ensure good lighting.' });

      startCameraAndTracking(video, canvas, async (frameData) => {
        frameCount++;

        if (phase === 'READINESS') {
          if (frameData && frameData.landmarks && frameData.landmarks.length > 0) {
            phase = 'GET_READY';
            countdownStart = Date.now();
            notifyHost('COUNTDOWN_START', { seconds: 3 });
          }
          return;
        }

        if (phase === 'GET_READY') {
          const elapsed = Date.now() - countdownStart;
          if (elapsed >= 3000) {
            phase = 'CHALLENGES';
            challengeStartTime = Date.now();
            notifyHost('CHALLENGE_UPDATED', {
              index: currentChallengeIndex,
              total: challengeCount,
              instructions: challengesToRun[currentChallengeIndex].instructions
            });
          }
          return;
        }

        if (phase === 'CHALLENGES') {
          if (!frameData || !frameData.landmarks) {
            // Face lost logic
            // In a real app, give a 1-second grace period. Here we simplify.
          }

          if (Date.now() - challengeStartTime > CONFIG.CHALLENGE_TIME_MS) {
            stopCameraAndTracking();
            isBusy = false;
            resolve({ status: 'FAILED', reason: 'Timeout' });
            return;
          }

          let currentChallenge = challengesToRun[currentChallengeIndex];

          // 1. Evaluate Pose/Expression
          if (!expressionPassed && frameData) {
            if (evaluateChallenge(currentChallenge.id, frameData)) {
              expressionPassed = true;
              notifyHost('EXPRESSION_PASSED', { index: currentChallengeIndex });
            }
          }

          // 2. Check Identity
          if (expressionPassed && frameCount % 5 === 0 && !isExtractingIdentity) {
            isExtractingIdentity = true;
            try {
              const identityResult = await extractFaceEmbedding(video);
              if (identityResult) {
                let distance = 0;
                
                // Enforce Identity Match if enrolled
                if (targetEmbedding) {
                  distance = computeEuclideanDistance(targetEmbedding, identityResult.descriptor);
                  if (distance >= CONFIG.IDENTITY_MATCH_DISTANCE) {
                     stopCameraAndTracking();
                     isBusy = false;
                     resolve({ status: 'FAILED', reason: 'IdentityMismatch' });
                     return;
                  }
                }
                
                // Passed this stage
                currentChallengeIndex++;
                
                if (currentChallengeIndex >= challengeCount) {
                  stopCameraAndTracking();
                  isBusy = false;
                  const signature = await signResult(nonce, 'VERIFIED');
                  resolve({ status: 'VERIFIED', signature });
                } else {
                  challengeStartTime = Date.now();
                  expressionPassed = false;
                  notifyHost('CHALLENGE_UPDATED', {
                    index: currentChallengeIndex,
                    total: challengeCount,
                    instructions: challengesToRun[currentChallengeIndex].instructions
                  });
                }
              }
            } catch (err) {
              console.error('Extraction error:', err);
              stopCameraAndTracking();
              isBusy = false;
              resolve({ status: 'TECHNICAL_ISSUE', reason: err.message });
            } finally {
              isExtractingIdentity = false;
            }
          }
        }
      }).catch(err => {
        isBusy = false;
        resolve({ status: 'TECHNICAL_ISSUE', reason: err.message });
      });
    });
  } catch (err) {
    isBusy = false;
    return { status: 'TECHNICAL_ISSUE', reason: err.message };
  }
}

async function signResult(nonce, status) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const msg = new TextEncoder().encode(`${nonce}:${status}:${Date.now()}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Crypto error:', e);
  }
  return `fallback-sig-${nonce}-${Date.now()}`;
}

// Global listener for extension content script
window.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'RUN_ATTEMPT') {
    const result = await runAttempt(event.data.payload);
    // Submit result directly to WS
    if (wsManager) {
      wsManager.send({
        type: 'SUBMIT_RESULT',
        payload: { nonce: event.data.payload.nonce, result }
      });
    }
    // Also notify UI
    window.parent.postMessage({ type: 'ATTEMPT_RESULT', payload: result }, '*');
  } else if (event.data && event.data.type === 'CONNECT_WS') {
    const { url, token, meetingCode } = event.data.payload;
    if (wsManager) wsManager.disconnect();
    
    wsManager = new ConnectionManager(url, token, meetingCode, (msg) => {
      // Forward all server messages to UI
      window.parent.postMessage({ type: 'SERVER_EVENT', payload: msg }, '*');
    }, (state) => {
      window.parent.postMessage({ type: 'WS_STATE', payload: state }, '*');
    });
    wsManager.connect();
  } else if (event.data && event.data.type === 'WS_SEND') {
    if (wsManager) wsManager.send(event.data.payload);
  }
});

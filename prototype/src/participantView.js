// src/participantView.js - Participant View (Live Call Tile)
import { getUser } from './orgStore.js';
import { sendSignal, onSignal } from './signal.js';
import { initVisionEngine, startCameraAndTracking, stopCameraAndTracking } from './vision.js';
import { initIdentityEngine, extractFaceEmbedding, computeEuclideanDistance, distanceToConfidence } from './identity.js';
import { getRandomChallenge, evaluateChallenge } from './liveness.js';
import { CONFIG } from './config.js';

export function renderParticipantTile(container) {
  container.innerHTML = `
    <div class="org-console-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
      <div class="org-header">
        <h2>Participant Terminal</h2>
        <p>Waiting for secure meeting challenge from Host...</p>
      </div>
      
      <div class="tx-card" id="participant-video-container" style="display: none; padding: 0;">
        <div style="position: relative; width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 10px 10px 0 0; overflow: hidden;">
          <video id="p-video" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" playsinline muted></video>
          <canvas id="p-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
          
          <div id="p-overlay" style="position: absolute; bottom: 10%; left: 10%; right: 10%; background: rgba(0,0,0,0.8); padding: 1rem; border-radius: 8px; color: var(--c-cream); font-size: 1.1rem; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
            Initializing Engine...
          </div>
        </div>
        <div style="padding: 1.5rem; background: var(--bg-panel);">
          <h3 id="p-challenge-title" style="color: var(--primary-accent); margin-bottom: 0.5rem;">Authenticating...</h3>
          <div class="progress-bar" style="width: 100%; height: 8px; background: var(--bg-dark); border-radius: 4px; overflow: hidden; margin-top: 1rem;">
            <div id="p-progress" style="width: 0%; height: 100%; background: var(--primary-accent); transition: width 0.3s;"></div>
          </div>
        </div>
      </div>
      
      <div id="p-idle-state" class="panel" style="margin-top: 2rem;">
        <svg style="width: 64px; height: 64px; stroke: var(--c-silver); fill: none; stroke-width: 1.5;" viewBox="0 0 24 24">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <h3 style="margin-top: 1rem; color: var(--c-silver);">Standby</h3>
        <p style="color: rgba(255,255,255,0.4); font-size: 0.9rem;">No active verification requests.</p>
      </div>
    </div>
  `;

  const videoContainer = document.getElementById('participant-video-container');
  const idleState = document.getElementById('p-idle-state');
  const video = document.getElementById('p-video');
  const canvas = document.getElementById('p-canvas');
  const overlay = document.getElementById('p-overlay');
  const challengeTitle = document.getElementById('p-challenge-title');
  const progressBar = document.getElementById('p-progress');

  let isActive = false;
  let currentTargetUser = null;
  let currentChallenge = null;
  let challengeStartTime = 0;

  onSignal(async (type, payload) => {
    if (type === 'LIVENESS_REQUEST' && !isActive) {
      isActive = true;
      const user = await getUser(payload.userId);
      if (!user) {
        sendSignal('LIVENESS_FAILED', { reason: 'User not found in local IndexedDB' });
        isActive = false;
        return;
      }
      
      currentTargetUser = user;
      sendSignal('LIVENESS_STARTED', { userId: user.id });
      
      idleState.style.display = 'none';
      videoContainer.style.display = 'block';
      
      startChallengeSequence();
    }
  });

  async function startChallengeSequence() {
    overlay.textContent = 'Warming up MediaPipe & Face-API...';
    try {
      await initIdentityEngine();
      await initVisionEngine();
      
      const challengesToRun = [getRandomChallenge(), getRandomChallenge()];
      let currentChallengeIndex = 0;
      
      currentChallenge = challengesToRun[currentChallengeIndex];
      challengeTitle.textContent = `Challenge 1 of 2: ${currentChallenge.instructions}`;
      overlay.textContent = 'Please follow the challenge prompt.';
      challengeStartTime = Date.now();
      
      let expressionPassed = false;
      let frameCount = 0;
      let isExtractingIdentity = false;

      await startCameraAndTracking(video, canvas, async (frameData) => {
        if (!isActive) return;
        frameCount++;

        // Timeout using config
        if (Date.now() - challengeStartTime > CONFIG.CHALLENGE_TIME_MS) {
          failChallenge('Liveness Challenge Timeout');
          return;
        }

        // Pass frameData instead of just blendshapes for hand tracking
        if (!expressionPassed && frameData) {
          if (evaluateChallenge(currentChallenge.id, frameData)) {
            expressionPassed = true;
            overlay.textContent = 'Expression verified! Checking identity...';
            overlay.style.color = 'var(--c-cream)';
            progressBar.style.width = currentChallengeIndex === 0 ? '25%' : '75%';
          }
        }

        // Once expression is passed, check identity on the next frame
        if (expressionPassed && frameCount % 5 === 0 && !isExtractingIdentity) {
          isExtractingIdentity = true;
          try {
            const identityResult = await extractFaceEmbedding(video);
            if (identityResult) {
              const distance = computeEuclideanDistance(currentTargetUser.embedding, identityResult.descriptor);
              
              if (distance < CONFIG.IDENTITY_MATCH_DISTANCE) { 
                // Identity matches for this challenge
                if (currentChallengeIndex === 0) {
                  // Move to next challenge
                  currentChallengeIndex++;
                  currentChallenge = challengesToRun[currentChallengeIndex];
                  challengeTitle.textContent = `Challenge 2 of 2: ${currentChallenge.instructions}`;
                  overlay.textContent = 'Identity matched! Next challenge...';
                  challengeStartTime = Date.now(); // reset timer
                  expressionPassed = false;
                  progressBar.style.width = '50%';
                } else {
                  // Both challenges passed
                  passChallenge();
                }
              } else {
                overlay.textContent = `Identity mismatch (Dist: ${distance.toFixed(2)}). Trying again...`;
              }
            }
          } finally {
            isExtractingIdentity = false;
          }
        }
      });
      
    } catch (err) {
      failChallenge('Hardware or Model Error: ' + err.message);
    }
  }

  function passChallenge() {
    isActive = false;
    stopCameraAndTracking();
    progressBar.style.width = '100%';
    progressBar.style.background = '#10b981';
    overlay.textContent = 'Verification Complete!';
    challengeTitle.textContent = 'Verified successfully.';
    
    sendSignal('LIVENESS_SUCCESS', { userName: currentTargetUser.name, role: currentTargetUser.role });
    
    setTimeout(() => {
      videoContainer.style.display = 'none';
      idleState.style.display = 'block';
      progressBar.style.width = '0%';
      progressBar.style.background = 'var(--primary-accent)';
    }, 3000);
  }

  function failChallenge(reason) {
    isActive = false;
    stopCameraAndTracking();
    overlay.textContent = 'Failed: ' + reason;
    challengeTitle.textContent = 'Verification Failed';
    progressBar.style.background = '#ef4444';
    
    sendSignal('LIVENESS_FAILED', { reason });
    
    setTimeout(() => {
      videoContainer.style.display = 'none';
      idleState.style.display = 'block';
      progressBar.style.width = '0%';
      progressBar.style.background = 'var(--primary-accent)';
    }, 4000);
  }
}

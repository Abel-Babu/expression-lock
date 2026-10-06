import { initIdentityEngine, extractFaceEmbedding, computeEuclideanDistance } from './identity.js';
import { initVisionEngine, startCameraAndTracking, stopCameraAndTracking } from './vision.js';
import { generateChallengeSequence, evaluateChallenge } from './liveness.js';
import { CONFIG } from '../../../shared/config.js';

let isBusy = false;

export async function startVerification({ challengeCount = 2, targetEmbedding = null, nonce = '' }) {
  if (isBusy) throw new Error('Engine is already running a verification sequence');
  isBusy = true;

  try {
    await initIdentityEngine();
    await initVisionEngine();

    // Generate random sequence
    const challengesToRun = generateChallengeSequence(challengeCount);

    return new Promise((resolve, reject) => {
      let currentChallengeIndex = 0;
      let currentChallenge = challengesToRun[currentChallengeIndex];
      let challengeStartTime = Date.now();
      
      let expressionPassed = false;
      let frameCount = 0;
      let isExtractingIdentity = false;

      // Create a hidden video/canvas if they don't exist in the DOM
      let video = document.getElementById('engine-video');
      let canvas = document.getElementById('engine-canvas');
      
      if (!video) {
        video = document.createElement('video');
        video.id = 'engine-video';
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        document.body.appendChild(video);
      }
      
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'engine-canvas';
        document.body.appendChild(canvas);
      }

      // Notify host UI of first challenge
      notifyHost('CHALLENGE_UPDATED', {
        index: currentChallengeIndex,
        total: challengeCount,
        instructions: currentChallenge.instructions
      });

      startCameraAndTracking(video, canvas, async (frameData) => {
        frameCount++;

        if (frameCount === 1) {
          challengeStartTime = Date.now();
        }

        if (Date.now() - challengeStartTime > CONFIG.CHALLENGE_TIME_MS) {
          stopCameraAndTracking();
          isBusy = false;
          return reject(new Error('Liveness Challenge Timeout'));
        }

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
              if (targetEmbedding) {
                distance = computeEuclideanDistance(targetEmbedding, identityResult.descriptor);
              }
              
              if (!targetEmbedding || distance < CONFIG.IDENTITY_MATCH_DISTANCE) {
                // Passed this stage
                currentChallengeIndex++;
                
                if (currentChallengeIndex >= challengeCount) {
                  // ALL CHALLENGES PASSED
                  stopCameraAndTracking();
                  isBusy = false;
                  
                  // Cryptographically sign the result
                  const signature = await signResult(nonce, 'VERIFIED');
                  resolve({ status: 'VERIFIED', signature });
                  
                } else {
                  // Move to next challenge
                  currentChallenge = challengesToRun[currentChallengeIndex];
                  challengeStartTime = Date.now();
                  expressionPassed = false;
                  notifyHost('CHALLENGE_UPDATED', {
                    index: currentChallengeIndex,
                    total: challengeCount,
                    instructions: currentChallenge.instructions
                  });
                }
              }
            }
          } catch (err) {
            console.error('Extraction error:', err);
            // If the camera was stopped, we MUST resolve or reject to avoid hanging
            if (currentChallengeIndex >= challengeCount) {
               reject(err);
            }
          } finally {
            isExtractingIdentity = false;
          }
        }
      }).catch(err => {
        isBusy = false;
        reject(err);
      });
    });
  } catch (err) {
    isBusy = false;
    throw err;
  }
}

function notifyHost(type, payload) {
  // Post message to parent window (the content script)
  window.parent.postMessage({ type, payload }, '*');
}

// Mock signature generation for Phase 2
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
  if (event.data && event.data.type === 'START_VERIFICATION') {
    try {
      const result = await startVerification(event.data.payload);
      window.parent.postMessage({ type: 'VERIFICATION_RESULT', payload: result }, '*');
    } catch (err) {
      window.parent.postMessage({ type: 'VERIFICATION_ERROR', payload: err.message }, '*');
    }
  }
});

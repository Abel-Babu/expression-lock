import { initVisionEngine, startCameraAndTracking, stopCameraAndTracking } from './vision.js';

let isTrackingActive = false;

export async function openModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');
  const modalBody = document.getElementById('el-modal-body');

  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  }
  if (mainView) {
    mainView.classList.add('blurred');
  }

  // Render modal camera layout
  modalBody.innerHTML = `
    <div class="video-container" id="video-box">
      <video id="webcam" playsinline autoplay muted></video>
      <canvas id="face-canvas"></canvas>
    </div>
    <div id="status-pill" class="status-pill initializing">
      <span class="pulse-dot"></span>
      <span id="status-text">Initializing Zero-Trust Biometric Engine...</span>
    </div>
    <div id="modal-error-box" style="display: none; margin-top: 1rem; color: var(--crimson);">
      <p id="modal-error-msg"></p>
      <button id="modal-retry-btn" class="btn-action" style="margin-top: 0.5rem; max-width: 180px; padding: 0.5rem 1rem; font-size: 0.85rem; background: var(--primary-orange);">
        Retry Camera
      </button>
    </div>
  `;

  const videoEl = document.getElementById('webcam');
  const canvasEl = document.getElementById('face-canvas');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const errorBox = document.getElementById('modal-error-box');
  const errorMsg = document.getElementById('modal-error-msg');
  const retryBtn = document.getElementById('modal-retry-btn');

  const setStatus = (status, msg) => {
    statusPill.className = `status-pill ${status}`;
    if (status === 'initializing') {
      statusText.textContent = 'Initializing Zero-Trust Biometric Engine...';
    } else if (status === 'ready') {
      statusText.textContent = 'Zero-Trust Biometric Engine Initialized';
    } else if (status === 'error') {
      statusText.textContent = 'Biometric Engine Failure';
    }
  };

  const startVision = async () => {
    errorBox.style.display = 'none';
    setStatus('initializing');

    try {
      // 1. Initialize FaceLandmarker
      await initVisionEngine((state, err) => {
        if (state === 'ready') setStatus('ready');
        if (state === 'error') {
          setStatus('error');
          showError(err || 'Failed to load offline vision model.');
        }
      });

      // 2. Start Camera and Face Mesh
      await startCameraAndTracking(videoEl, canvasEl, (frameData) => {
        // Ready for challenge detection in Phase 5
      });

      setStatus('ready');
      isTrackingActive = true;
    } catch (err) {
      console.error('Vision startup error:', err);
      let friendlyError = 'Could not access camera. Please allow camera permissions.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyError = 'No camera found on this device.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyError = 'Camera access was denied. Please allow camera permissions in your browser bar.';
      }
      showError(friendlyError);
    }
  };

  const showError = (message) => {
    setStatus('error');
    errorBox.style.display = 'block';
    errorMsg.textContent = message;
    retryBtn.onclick = () => startVision();
  };

  // Launch camera & AI
  await startVision();
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const mainView = document.getElementById('app-view');

  // Stop camera tracks cleanly
  stopCameraAndTracking();
  isTrackingActive = false;

  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  if (mainView) {
    mainView.classList.remove('blurred');
  }
}

// Expose globally
window.closeModal = closeModal;
window.openModal = openModal;

function initModal() {
  const closeBtn = document.getElementById('close-modal-btn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    };
  }

  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModal);
} else {
  initModal();
}

// src/orgView.js - Interactive Enterprise Org Console & Face Enrollment UI
import {
  getUsers,
  getUser,
  saveEnrollment,
  deleteEnrollment,
  getSettings,
  updateSetting,
  resetDatabase,
  getAuditLogs
} from './orgStore.js';
import {
  initIdentityEngine,
  extractFaceEmbedding,
  computeEuclideanDistance,
  distanceToConfidence,
  averageEmbeddings
} from './identity.js';

let activeStream = null;
let enrollmentInProgress = false;
let capturedSamples = [];
let targetUser = null;
let testMatchInterval = null;

export async function renderOrgConsole(container) {
  const users = await getUsers();
  const settings = await getSettings();
  const auditLogs = await getAuditLogs();

  const enrolledCount = users.filter((u) => u.enrolled).length;
  const totalUsers = users.length;

  container.innerHTML = `
    <div class="org-console-container">
      <!-- Top Title & Stats Banner -->
      <div class="org-header">
        <div class="org-title-group">
          <h2>Enterprise Security & Biometric Directory</h2>
          <p>Enrolled facial vectors are stored locally in client IndexedDB. No raw images or biometric templates leave this browser.</p>
        </div>
        <div class="org-quick-actions">
          <button id="btn-reset-db" class="btn-sm btn-danger-outline">Reset Directory</button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="org-metrics-row">
        <div class="metric-card">
          <span class="metric-label">Enrolled Officers</span>
          <span class="metric-value">${enrolledCount} <small>/ ${totalUsers}</small></span>
          <div class="metric-progress">
            <div class="metric-bar" style="width: ${(enrolledCount / totalUsers) * 100}%"></div>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-label">Dual-Key Policy Gate</span>
          <span class="metric-value">$${(settings.minWireDualKeyAmount || 1000000).toLocaleString()} <small>USD</small></span>
          <span class="metric-subtext">Requires meeting + live face verification</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Local Match Strictness</span>
          <span class="metric-value">${settings.faceMatchThreshold || 0.55} <small>Euclidean</small></span>
          <span class="metric-subtext">Offline Face-API 128D Cosine Vector</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Storage Integrity</span>
          <span class="metric-value" style="color: var(--emerald);">ACTIVE</span>
          <span class="metric-subtext">IndexedDB Local Keyring</span>
        </div>
      </div>

      <!-- Main Roster Section -->
      <div class="org-section-card">
        <div class="section-card-header">
          <h3>Authorized Corporate Officers</h3>
          <span class="section-tag">${totalUsers} Keyholders Configured</span>
        </div>

        <table class="org-table">
          <thead>
            <tr>
              <th>Authorized Officer</th>
              <th>Department</th>
              <th>Biometric Status</th>
              <th>Approval Policy</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map((u) => {
                const isEnrolled = u.enrolled;
                return `
                <tr class="${isEnrolled ? 'row-enrolled' : ''}">
                  <td>
                    <div class="officer-cell">
                      <div class="officer-avatar ${isEnrolled ? 'avatar-active' : ''}">
                        ${u.role.substring(0, 3)}
                      </div>
                      <div class="officer-meta">
                        <strong>${u.name}</strong>
                        <small>${u.role}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="dept-tag">${u.department}</span>
                  </td>
                  <td>
                    ${
                      isEnrolled
                        ? `<span class="badge success">Enrolled (${u.sampleCount || 5} Vectors)</span>
                           <div class="enrolled-date"><small>${new Date(u.enrolledAt).toLocaleDateString()}</small></div>`
                        : `<span class="badge pending">Pending Enrollment</span>`
                    }
                  </td>
                  <td>
                    <div class="policy-details">
                      <strong>Threshold: $${(u.policy?.thresholdAmount || 1000000).toLocaleString()}</strong>
                      <small>${u.policy?.requireDualApproval ? 'Dual Approval Required' : 'Single Signer'}</small>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <div class="btn-group-cell">
                      ${
                        isEnrolled
                          ? `
                            <button class="btn-sm btn-primary-outline btn-test-match" data-userid="${u.id}">Test Match</button>
                            <button class="btn-sm btn-secondary btn-enroll" data-userid="${u.id}">Re-Enroll</button>
                            <button class="btn-sm btn-danger-outline btn-revoke" data-userid="${u.id}">Revoke</button>
                          `
                          : `
                            <button class="btn-sm btn-primary btn-enroll" data-userid="${u.id}">
                              Enroll Biometrics &rarr;
                            </button>
                          `
                      }
                    </div>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- Audit Log History -->
      <div class="org-section-card" style="margin-top: 2rem;">
        <div class="section-card-header">
          <h3>Security Audit Log (Client IndexedDB)</h3>
          <span class="section-tag">${auditLogs.length} Events Logged</span>
        </div>
        <div class="audit-log-container">
          ${
            auditLogs.length === 0
              ? `<p class="empty-state">No security events recorded yet.</p>`
              : `
              <table class="org-table audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Officer</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${auditLogs
                    .slice(0, 8)
                    .map(
                      (log) => `
                    <tr>
                      <td><small>${new Date(log.timestamp).toLocaleTimeString()}</small></td>
                      <td><span class="badge ${log.action.includes('REVOKE') ? 'error' : 'success'}">${log.action}</span></td>
                      <td><strong>${log.actor || 'System'}</strong></td>
                      <td><small>${log.details}</small></td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }
        </div>
      </div>
    </div>

    <!-- Enrollment & Testing Modal Dialog -->
    <div id="enrollment-modal" class="enrollment-modal-overlay hidden">
      <div class="enrollment-modal-content">
        <div class="enrollment-modal-header">
          <div class="modal-header-titles">
            <h3 id="enrollment-modal-title">Biometric Enrollment Wizard</h3>
            <span id="enrollment-officer-name">Target Officer</span>
          </div>
          <button id="close-enrollment-modal" class="close-btn">&times;</button>
        </div>

        <div class="enrollment-modal-body">
          <!-- Video Stream Container -->
          <div class="enroll-video-wrapper">
            <video id="enroll-video" autoplay playsinline muted></video>
            <canvas id="enroll-canvas"></canvas>
            
            <!-- Oval Guide Target -->
            <div class="face-target-guide" id="face-target-guide">
              <div class="guide-oval"></div>
              <div class="guide-crosshair"></div>
            </div>

            <!-- Real-time Status Overlay -->
            <div class="enroll-video-status" id="enroll-video-status">
              <span class="status-indicator"></span>
              <span id="enroll-status-text">Initializing local Face-API...</span>
            </div>
          </div>

          <!-- Interactive Control Sidebar -->
          <div class="enroll-controls-pane">
            <div id="enrollment-flow-view">
              <h4>Multi-Sample Quality Capture</h4>
              <p class="enroll-instruction" id="enroll-step-instruction">
                Position your face within the frame and click <strong>Capture Sample</strong>.
              </p>

              <!-- Progress Steps -->
              <div class="sample-progress-tracker">
                <div class="sample-step" id="sample-dot-0">1</div>
                <div class="sample-step" id="sample-dot-1">2</div>
                <div class="sample-step" id="sample-dot-2">3</div>
                <div class="sample-step" id="sample-dot-3">4</div>
                <div class="sample-step" id="sample-dot-4">5</div>
              </div>

              <!-- Quality Feedback Box -->
              <div class="quality-feedback-box" id="quality-feedback-box">
                <div class="quality-item" id="q-detection">
                  <span class="q-dot"></span> Face Detected
                </div>
                <div class="quality-item" id="q-lighting">
                  <span class="q-dot"></span> Good Illumination
                </div>
              </div>

              <div class="enroll-actions-row">
                <button id="btn-capture-sample" class="hub-btn">
                  Capture Sample (<span id="sample-count-num">0</span>/5)
                </button>
                <button id="btn-auto-burst" class="hub-btn secondary">
                  Auto Burst Capture
                </button>
              </div>
            </div>

            <!-- Test Match Mode View (Shown when testing or right after enrollment) -->
            <div id="test-match-flow-view" class="hidden">
              <h4>Live Identity Verification Test</h4>
              <p class="enroll-instruction">
                Compare your live camera stream against the stored 128D template.
              </p>

              <div class="match-score-card" id="match-score-card">
                <div class="match-percentage" id="match-percentage-val">--%</div>
                <div class="match-status-label" id="match-status-label">Awaiting face...</div>
                <div class="match-distance-detail" id="match-distance-detail">Euclidean distance: --</div>
              </div>

              <div class="enroll-actions-row" style="margin-top: 1.5rem;">
                <button id="btn-finish-enrollment" class="hub-btn">
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Handlers
  wireOrgEvents(container);
}

function wireOrgEvents(container) {
  // Reset Database
  container.querySelector('#btn-reset-db')?.addEventListener('click', async () => {
    if (confirm('Reset biometric directory to factory state? All enrolled templates will be purged.')) {
      await resetDatabase();
      renderOrgConsole(container);
    }
  });

  // Enroll Buttons
  container.querySelectorAll('.btn-enroll').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-userid');
      openEnrollmentWizard(userId, 'enroll');
    });
  });

  // Test Match Buttons
  container.querySelectorAll('.btn-test-match').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-userid');
      openEnrollmentWizard(userId, 'test');
    });
  });

  // Revoke Buttons
  container.querySelectorAll('.btn-revoke').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-userid');
      if (confirm('Revoke and purge biometric template for this officer?')) {
        await deleteEnrollment(userId);
        renderOrgConsole(container);
      }
    });
  });

  // Close Modal Button
  document.getElementById('close-enrollment-modal')?.addEventListener('click', () => {
    closeEnrollmentWizard();
  });
}

async function openEnrollmentWizard(userId, mode = 'enroll') {
  targetUser = await getUser(userId);
  if (!targetUser) return;

  const modal = document.getElementById('enrollment-modal');
  const officerNameEl = document.getElementById('enrollment-officer-name');
  const titleEl = document.getElementById('enrollment-modal-title');
  const enrollFlow = document.getElementById('enrollment-flow-view');
  const testFlow = document.getElementById('test-match-flow-view');

  officerNameEl.textContent = `${targetUser.name} (${targetUser.role})`;
  modal.classList.remove('hidden');

  capturedSamples = [];
  updateSampleTrackerUI();

  if (mode === 'test' && targetUser.enrolled && targetUser.embedding) {
    titleEl.textContent = 'Live Identity Test & Matching';
    enrollFlow.classList.add('hidden');
    testFlow.classList.remove('hidden');
  } else {
    titleEl.textContent = 'Biometric Enrollment Wizard (5 Samples)';
    enrollFlow.classList.remove('hidden');
    testFlow.classList.add('hidden');
  }

  // Start Camera and Detection Loop
  await startEnrollmentCamera();

  if (mode === 'test') {
    startTestMatchLoop();
  }

  // Wire Modal Buttons
  const captureBtn = document.getElementById('btn-capture-sample');
  const autoBurstBtn = document.getElementById('btn-auto-burst');
  const finishBtn = document.getElementById('btn-finish-enrollment');

  captureBtn.onclick = async () => {
    await captureOneSample();
  };

  autoBurstBtn.onclick = async () => {
    autoBurstBtn.disabled = true;
    for (let i = capturedSamples.length; i < 5; i++) {
      await captureOneSample();
      await new Promise((r) => setTimeout(r, 600));
    }
    autoBurstBtn.disabled = false;
  };

  finishBtn.onclick = () => {
    closeEnrollmentWizard();
    const appView = document.getElementById('app-view');
    if (appView) renderOrgConsole(appView);
  };
}

async function startEnrollmentCamera() {
  const video = document.getElementById('enroll-video');
  const statusText = document.getElementById('enroll-status-text');
  const qDetection = document.getElementById('q-detection');

  try {
    statusText.textContent = 'Starting camera...';
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    video.srcObject = activeStream;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    statusText.textContent = 'Loading Face-API models offline...';
    await initIdentityEngine((msg) => {
      if (statusText) statusText.textContent = msg;
    });
    statusText.textContent = 'Engine Ready - Align face in guide';

    // Start Realtime Detection Feedback
    runLiveFaceFeedback(video);
  } catch (err) {
    console.error('Camera or model load failure:', err);
    statusText.textContent = 'Error: ' + err.message;
  }
}

let feedbackRunning = false;
async function runLiveFaceFeedback(video) {
  feedbackRunning = true;
  const statusText = document.getElementById('enroll-status-text');
  const qDetection = document.getElementById('q-detection');
  const targetGuide = document.getElementById('face-target-guide');

  const checkLoop = async () => {
    if (!feedbackRunning || !video || video.paused || video.ended) return;

    try {
      const res = await extractFaceEmbedding(video);
      if (res && res.descriptor) {
        if (qDetection) qDetection.classList.add('valid');
        if (targetGuide) targetGuide.classList.add('aligned');
        if (statusText) statusText.textContent = 'Face aligned & recognized';
      } else {
        if (qDetection) qDetection.classList.remove('valid');
        if (targetGuide) targetGuide.classList.remove('aligned');
        if (statusText) statusText.textContent = 'Position face in center oval';
      }
    } catch (e) {
      // Ignore individual frame extraction drops
    }

    if (feedbackRunning) {
      setTimeout(checkLoop, 200);
    }
  };

  checkLoop();
}

async function captureOneSample() {
  const video = document.getElementById('enroll-video');
  const statusText = document.getElementById('enroll-status-text');
  if (!video || capturedSamples.length >= 5) return;

  statusText.textContent = 'Extracting 128D facial vector...';
  const result = await extractFaceEmbedding(video);

  if (!result || !result.descriptor) {
    statusText.textContent = 'Capture failed: No face detected. Look directly at camera.';
    return;
  }

  capturedSamples.push(result.descriptor);
  updateSampleTrackerUI();

  statusText.textContent = `Sample ${capturedSamples.length} of 5 captured!`;

  if (capturedSamples.length === 5) {
    // Averaging and Saving
    statusText.textContent = 'Computing normalized biometric template...';
    const finalTemplate = averageEmbeddings(capturedSamples);

    await saveEnrollment(targetUser.id, finalTemplate, 5);
    targetUser = await getUser(targetUser.id);

    statusText.textContent = 'Biometrics successfully enrolled in IndexedDB!';

    // Transition to Test Match View
    setTimeout(() => {
      document.getElementById('enrollment-flow-view').classList.add('hidden');
      document.getElementById('test-match-flow-view').classList.remove('hidden');
      startTestMatchLoop();
    }, 800);
  }
}

function updateSampleTrackerUI() {
  for (let i = 0; i < 5; i++) {
    const dot = document.getElementById(`sample-dot-${i}`);
    if (dot) {
      if (i < capturedSamples.length) {
        dot.className = 'sample-step completed';
        dot.innerHTML = '&check;';
      } else {
        dot.className = 'sample-step';
        dot.textContent = `${i + 1}`;
      }
    }
  }

  const countNum = document.getElementById('sample-count-num');
  if (countNum) countNum.textContent = capturedSamples.length;
}

function startTestMatchLoop() {
  if (testMatchInterval) clearInterval(testMatchInterval);

  const video = document.getElementById('enroll-video');
  const matchPct = document.getElementById('match-percentage-val');
  const matchStatus = document.getElementById('match-status-label');
  const matchDistance = document.getElementById('match-distance-detail');
  const scoreCard = document.getElementById('match-score-card');

  testMatchInterval = setInterval(async () => {
    if (!video || video.paused || !targetUser?.embedding) return;

    try {
      const liveResult = await extractFaceEmbedding(video);
      if (liveResult && liveResult.descriptor) {
        const dist = computeEuclideanDistance(liveResult.descriptor, targetUser.embedding);
        const confidence = distanceToConfidence(dist, 0.55);
        const isMatch = dist < 0.55;

        if (matchPct) matchPct.textContent = `${confidence}%`;
        if (matchDistance) matchDistance.textContent = `Euclidean distance: ${dist.toFixed(3)} (Threshold: 0.55)`;

        if (isMatch) {
          if (matchStatus) matchStatus.textContent = `IDENTITY VERIFIED: ${targetUser.role}`;
          if (scoreCard) scoreCard.className = 'match-score-card verified';
        } else {
          if (matchStatus) matchStatus.textContent = 'MISMATCH / UNVERIFIED';
          if (scoreCard) scoreCard.className = 'match-score-card mismatch';
        }
      } else {
        if (matchStatus) matchStatus.textContent = 'Align face to verify';
      }
    } catch (err) {
      console.warn('Match loop frame skipped', err);
    }
  }, 350);
}

function closeEnrollmentWizard() {
  feedbackRunning = false;
  if (testMatchInterval) {
    clearInterval(testMatchInterval);
    testMatchInterval = null;
  }

  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }

  const modal = document.getElementById('enrollment-modal');
  if (modal) modal.classList.add('hidden');
}

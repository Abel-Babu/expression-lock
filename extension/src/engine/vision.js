// Vision Engine: MediaPipe FaceLandmarker + Camera + Landmark Overlay
let visionFileset = null;
let faceLandmarker = null;
let currentStream = null;
let animationFrameId = null;
let isInitializing = false;

// Dynamic import with CDN fallback
async function getVisionTasks() {
  try {
    return await import('../vendor/vision_bundle.mjs');
  } catch (err) {
    console.warn('Local vision bundle failed, falling back to CDN...', err);
    return await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs');
  }
}

export async function initVisionEngine(onStatusChange) {
  if (faceLandmarker) {
    if (onStatusChange) onStatusChange('ready');
    return faceLandmarker;
  }

  if (isInitializing) return;
  isInitializing = true;

  if (onStatusChange) onStatusChange('initializing');

  try {
    const { FilesetResolver, FaceLandmarker, HandLandmarker } = await getVisionTasks();
    
    // Resolve WASM loader
    try {
      visionFileset = await FilesetResolver.forVisionTasks('./vendor');
    } catch (e) {
      console.warn('Local WASM failed, falling back to CDN WASM...', e);
      visionFileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );
    }

    // Load FaceLandmarker with full blendshapes & transform matrices
    faceLandmarker = await FaceLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: './vendor/face_landmarker.task',
        delegate: 'GPU'
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1
    });

    // Load HandLandmarker
    try {
      window.handLandmarker = await HandLandmarker.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath: './vendor/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
    } catch (e) {
      console.error('HandLandmarker failed to load:', e);
    }

    isInitializing = false;
    if (onStatusChange) onStatusChange('ready');
    return faceLandmarker;
  } catch (err) {
    isInitializing = false;
    console.error('Failed to initialize FaceLandmarker:', err);
    if (onStatusChange) onStatusChange('error', err.message);
    throw err;
  }
}

export async function startCameraAndTracking(videoEl, canvasEl, onFrameCallback) {
  // Stop any existing tracks
  stopCameraAndTracking();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });

    currentStream = stream;
    videoEl.srcObject = stream;

    await new Promise((resolve) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play();
        resolve();
      };
    });

    // Sync canvas sizing with real video dimensions
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;

    const ctx = canvasEl.getContext('2d');
    let lastVideoTime = -1;

    function renderLoop() {
      if (!currentStream || videoEl.paused || videoEl.ended) return;

      if (videoEl.currentTime !== lastVideoTime && faceLandmarker) {
        lastVideoTime = videoEl.currentTime;
        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(videoEl, startTimeMs);
        
        let handResults = null;
        if (window.handLandmarker) {
          handResults = window.handLandmarker.detectForVideo(videoEl, startTimeMs);
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          drawMesh(ctx, landmarks, canvasEl.width, canvasEl.height);

          // If hands detected, draw a simple point on the palm
          if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
            ctx.fillStyle = '#f59e0b';
            for (const hand of handResults.landmarks) {
              const palm = hand[0];
              ctx.beginPath();
              ctx.arc(palm.x * canvasEl.width, palm.y * canvasEl.height, 5, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          if (onFrameCallback) {
            onFrameCallback({
              landmarks,
              blendshapes: results.faceBlendshapes ? results.faceBlendshapes[0] : null,
              matrixes: results.facialTransformationMatrixes ? results.facialTransformationMatrixes[0] : null,
              hands: handResults ? handResults.landmarks : null
            });
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    }

    renderLoop();
    return stream;
  } catch (err) {
    console.error('Camera access error:', err);
    throw err;
  }
}

export function stopCameraAndTracking() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
}

// Draw subtle, elegant green/cyan wireframe points for all 478 landmarks
function drawMesh(ctx, landmarks, width, height) {
  ctx.save();
  ctx.fillStyle = '#10b981'; // subtle emerald green

  // Key feature connectors or subtle points
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const x = pt.x * width;
    const y = pt.y * height;

    // Iris points (468, 473) drawn slightly brighter/cyan
    if (i >= 468 && i <= 477) {
      ctx.fillStyle = '#06b6d4'; // bright cyan for iris
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#10b981';
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Draw face contour outline
  ctx.restore();
}

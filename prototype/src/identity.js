// src/identity.js - Offline Face-API 128D Biometric Descriptor Engine
let faceApiLoaded = false;
let modelsLoaded = false;
let modelLoadPromise = null;

// Dynamically ensure face-api script is injected into document
export async function loadFaceApiScript() {
  if (window.faceapi) return window.faceapi;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="face-api"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.faceapi));
      if (window.faceapi) return resolve(window.faceapi);
      return;
    }

    const script = document.createElement('script');
    script.src = './vendor/face-api.min.js';
    script.async = true;
    script.onload = () => {
      console.log('Face-API script loaded locally');
      resolve(window.faceapi);
    };
    script.onerror = (err) => {
      console.error('Failed to load local face-api.min.js', err);
      reject(err);
    };
    document.head.appendChild(script);
  });
}

// Load Face-API offline weights from ./models
export async function initIdentityEngine(onProgress) {
  if (modelsLoaded) return window.faceapi;
  if (modelLoadPromise) {
    if (onProgress) onProgress('Waiting for models to load...');
    return modelLoadPromise;
  }

  modelLoadPromise = (async () => {
    if (onProgress) onProgress('Loading face recognition models...');
    const faceapi = await loadFaceApiScript();

    const MODEL_URI = './models';
    try {
      // Load models sequentially to avoid choking the local single-threaded Python server
      if (onProgress) onProgress('Loading Tiny Face Detector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI);
      
      if (onProgress) onProgress('Loading Landmark Detector...');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URI);
      
      if (onProgress) onProgress('Loading Recognition Model...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI);

      modelsLoaded = true;
      if (onProgress) onProgress('Models loaded successfully');
      return faceapi;
    } catch (err) {
      console.warn('Face-API local model load fallback:', err);
      try {
        if (onProgress) onProgress('Trying fallback models...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI);
        modelsLoaded = true;
        if (onProgress) onProgress('Fallback models loaded');
        return faceapi;
      } catch (e) {
        console.error('Fatal error loading identity models:', e);
        throw e;
      }
    }
  })();
  
  return modelLoadPromise;
}

// Extract a 128-dimensional Float32Array face embedding from a video or canvas element
export async function extractFaceEmbedding(inputElement) {
  const faceapi = await initIdentityEngine();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5
  });

  try {
    // Detect single face with tiny landmarks and 128D descriptor
    const detection = await faceapi
      .detectSingleFace(inputElement, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) return null;

    return {
      descriptor: Array.from(detection.descriptor),
      box: detection.detection.box,
      score: detection.detection.score
    };
  } catch (err) {
    console.warn('Extraction with tiny landmarks failed, attempting fallback...', err);
    const detection = await faceapi
      .detectSingleFace(inputElement, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    return {
      descriptor: Array.from(detection.descriptor),
      box: detection.detection.box,
      score: detection.detection.score
    };
  }
}

// Compute Euclidean distance between two 128D vectors (standard Face-API distance)
export function computeEuclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) return 1.0;
  if (descriptor1.length !== descriptor2.length) return 1.0;

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Convert distance to confidence match percentage (0.0 distance = 100%, 0.6 = ~60% threshold)
export function distanceToConfidence(distance, threshold = 0.55) {
  if (distance <= 0) return 100;
  if (distance >= 1.0) return 0;
  
  // Linear / sigmoid confidence mapping centered around threshold
  const normalized = Math.max(0, Math.min(100, Math.round((1 - (distance / (threshold * 1.5))) * 100)));
  return normalized;
}

// Average multiple 128D vectors into a robust multi-sample template
export function averageEmbeddings(embeddingsList) {
  if (!embeddingsList || embeddingsList.length === 0) return null;
  const len = embeddingsList[0].length;
  const avg = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (const emb of embeddingsList) {
      sum += emb[i];
    }
    avg[i] = sum / embeddingsList.length;
  }

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < len; i++) {
    norm += avg[i] * avg[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < len; i++) {
      avg[i] /= norm;
    }
  }

  return Array.from(avg);
}

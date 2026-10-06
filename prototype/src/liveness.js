// src/liveness.js - Liveness Challenge Engine
import { CONFIG } from './config.js';

export const HAND_CHALLENGES = [
  { id: 'touch_nose', label: 'Touch your nose', instructions: 'Touch your nose with your finger' },
  { id: 'cover_face', label: 'Cover your mouth', instructions: 'Cover your mouth with your hand' }
];

export const FACE_CHALLENGES = [
  { id: 'mar_mouth_open', label: 'Open your mouth wide', instructions: 'Open your mouth to test 3D Jaw Depth' },
  { id: 'ear_blink', label: 'Blink slowly', instructions: 'Blink to test 3D Eyelid Physics' },
  { id: 'big_turn_left', label: 'Turn your head 40° left', instructions: 'Deep turn left to expose 2D deepfake warps' },
  { id: 'big_turn_right', label: 'Turn your head 40° right', instructions: 'Deep turn right to expose 2D deepfake warps' },
  { id: 'nose_wiggle', label: 'Wiggle your nose', instructions: 'Move your nose side-to-side rapidly' }
];

// Fallback for single random challenge (if needed)
export function getRandomChallenge() {
  const all = [...HAND_CHALLENGES, ...FACE_CHALLENGES];
  return all[Math.floor(Math.random() * all.length)];
}

// Generate a sequence of challenges ensuring at least one involves the hand
export function generateChallengeSequence(count = 2) {
  const sequence = [];
  
  // Pick one random hand challenge
  const handChallenge = HAND_CHALLENGES[Math.floor(Math.random() * HAND_CHALLENGES.length)];
  // Pick random face challenges for the rest
  const faceChallenge = FACE_CHALLENGES[Math.floor(Math.random() * FACE_CHALLENGES.length)];
  
  // Randomize the order
  if (Math.random() > 0.5) {
    sequence.push(handChallenge, faceChallenge);
  } else {
    sequence.push(faceChallenge, handChallenge);
  }
  
  return sequence;
}

// Evaluate blendshapes and hands to see if they pass the target challenge
export function evaluateChallenge(challengeId, frameData) {
  const { blendshapes, hands, matrixes } = frameData;
  if (!blendshapes || !blendshapes.categories) return false;

  // Convert blendshapes array to a key-value map for easy lookup
  const scores = {};
  blendshapes.categories.forEach(b => {
    scores[b.categoryName] = b.score;
  });

  switch (challengeId) {
    case 'mar_mouth_open':
      if (!frameData.landmarks) return false;
      // MAR (Mouth Aspect Ratio) = height / width
      const lipTop = frameData.landmarks[13];
      const lipBot = frameData.landmarks[14];
      const mouthLeft = frameData.landmarks[61];
      const mouthRight = frameData.landmarks[291];
      const mHeight = Math.sqrt(Math.pow(lipBot.x - lipTop.x, 2) + Math.pow(lipBot.y - lipTop.y, 2));
      const mWidth = Math.sqrt(Math.pow(mouthRight.x - mouthLeft.x, 2) + Math.pow(mouthRight.y - mouthLeft.y, 2));
      return (mHeight / mWidth) > 0.6; // Deepfake 2D stretches usually max out around 0.4
      
    case 'ear_blink':
      if (!frameData.landmarks) return false;
      // EAR (Eye Aspect Ratio) = height / width
      const eyeTop = frameData.landmarks[159];
      const eyeBot = frameData.landmarks[145];
      const eyeLeft = frameData.landmarks[33];
      const eyeRight = frameData.landmarks[133];
      const eHeight = Math.sqrt(Math.pow(eyeBot.x - eyeTop.x, 2) + Math.pow(eyeBot.y - eyeTop.y, 2));
      const eWidth = Math.sqrt(Math.pow(eyeRight.x - eyeLeft.x, 2) + Math.pow(eyeRight.y - eyeLeft.y, 2));
      return (eHeight / eWidth) < 0.1; // Strict fully-closed eye check

    case 'big_turn_left':
    case 'big_turn_right':
      if (!matrixes) return false;
      // Extract Yaw from 4x4 facial transformation matrix
      // MediaPipe matrixes: m[0] and m[2] represent rotation for Yaw
      const yaw = Math.atan2(-matrixes[2], matrixes[0]) * (180 / Math.PI);
      
      // If camera is mirrored, right/left might be flipped visually, but mathematically:
      if (challengeId === 'big_turn_right') {
        return yaw > 40; // True 40-degree turn
      } else {
        return yaw < -40; // True 40-degree turn
      }
      
    case 'nose_wiggle':
      if (!frameData.landmarks) return false;
      const curNose = frameData.landmarks[1].x;
      // To measure wiggle, we track delta over time
      if (!window.lastNoseXs) window.lastNoseXs = [];
      window.lastNoseXs.push(curNose);
      if (window.lastNoseXs.length > 30) window.lastNoseXs.shift(); // keep last 30 frames
      
      const minNose = Math.min(...window.lastNoseXs);
      const maxNose = Math.max(...window.lastNoseXs);
      // Nose moved at least 15% of the screen horizontally within 30 frames
      if ((maxNose - minNose) > 0.15) {
        window.lastNoseXs = [];
        return true;
      }
      return false;

    case 'touch_nose':
    case 'cover_face':
      if (!hands || hands.length === 0) return false;
      
      const faceLandmarks = frameData.landmarks;
      if (!faceLandmarks) return false;
      
      // Nose tip is landmark 1
      const nose = faceLandmarks[1];
      // Mouth is roughly landmarks 13, 14
      const mouth = faceLandmarks[13];
      
      // Check each hand
      for (const hand of hands) {
        // Index finger tip is hand landmark 8
        const indexTip = hand[8];
        const palm = hand[0]; // Wrist/Palm
        
        // Calculate distance
        const distNose = Math.sqrt(Math.pow(indexTip.x - nose.x, 2) + Math.pow(indexTip.y - nose.y, 2));
        const distMouth = Math.sqrt(Math.pow(palm.x - mouth.x, 2) + Math.pow(palm.y - mouth.y, 2));
        
        if (challengeId === 'touch_nose' && distNose < 0.1) return true;
        if (challengeId === 'cover_face' && distMouth < 0.2) return true;
      }
      return false;

    default:
      return false;
  }
}

// src/liveness.js - Liveness Challenge Engine
import { CONFIG } from './config.js';

export const CHALLENGES = [
  { id: 'smile', label: 'Smile brightly', instructions: 'Please smile for the camera' },
  { id: 'mouth_open', label: 'Open your mouth', instructions: 'Open your mouth wide' },
  { id: 'blink_eyes', label: 'Blink your eyes', instructions: 'Blink both eyes slowly' },
  { id: 'eyebrows_up', label: 'Raise your eyebrows', instructions: 'Raise both eyebrows' },
  { id: 'pucker', label: 'Pucker your lips', instructions: 'Pucker your lips like a kiss' },
  { id: 'touch_nose', label: 'Touch your nose', instructions: 'Touch your nose with your finger' },
  { id: 'cover_face', label: 'Cover your mouth', instructions: 'Cover your mouth with your hand' },
  { id: 'turn_left', label: 'Turn your head left', instructions: 'Turn your head to the left' },
  { id: 'turn_right', label: 'Turn your head right', instructions: 'Turn your head to the right' }
];

export function getRandomChallenge() {
  const index = Math.floor(Math.random() * CHALLENGES.length);
  return CHALLENGES[index];
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
    case 'smile':
      return (scores['mouthSmileLeft'] > CONFIG.BLENDSHAPE_SMILE && scores['mouthSmileRight'] > CONFIG.BLENDSHAPE_SMILE);
      
    case 'mouth_open':
      return (scores['jawOpen'] > CONFIG.BLENDSHAPE_JAW_OPEN); 
      
    case 'blink_eyes':
      return (scores['eyeBlinkLeft'] > CONFIG.BLENDSHAPE_BLINK && scores['eyeBlinkRight'] > CONFIG.BLENDSHAPE_BLINK);
      
    case 'eyebrows_up':
      return (scores['browInnerUp'] > CONFIG.BLENDSHAPE_BROW_UP);
      
    case 'pucker':
      return (scores['mouthPucker'] > CONFIG.BLENDSHAPE_PUCKER);
      
    case 'turn_left':
    case 'turn_right':
      if (!matrixes) return false;
      // matrixes is a 4x4 array. Yaw is roughly Math.atan2(matrixes[8], matrixes[10]) or matrixes[0], matrixes[2] depending on format.
      // But we can approximate yaw from the blendshapes `eyeLookInLeft`, `eyeLookOutRight`, etc., 
      // or easier: just use the raw matrix. MediaPipe matrix: index 0,2 holds yaw info.
      // We will simplify and use eye look direction as a proxy for head turn in this basic logic if matrix is too complex.
      if (challengeId === 'turn_left') {
        return (scores['eyeLookOutLeft'] > 0.4 && scores['eyeLookInRight'] > 0.4);
      } else {
        return (scores['eyeLookInLeft'] > 0.4 && scores['eyeLookOutRight'] > 0.4);
      }

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

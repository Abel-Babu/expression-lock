// src/liveness.js - Liveness Challenge Engine
import { CONFIG } from '../../../shared/config.js';

export const HAND_CHALLENGES = [
  { id: 'touch_nose', label: 'Touch your nose', instructions: 'Touch your nose with your finger' },
  { id: 'cover_face', label: 'Cover your mouth', instructions: 'Cover your mouth with your hand' }
];

export const FACE_CHALLENGES = [
  { id: 'smile', label: 'Smile brightly', instructions: 'Please smile for the camera' },
  { id: 'mouth_open', label: 'Open your mouth', instructions: 'Open your mouth wide' },
  { id: 'blink_eyes', label: 'Blink your eyes', instructions: 'Blink both eyes slowly' },
  { id: 'eyebrows_up', label: 'Raise your eyebrows', instructions: 'Raise both eyebrows' },
  { id: 'pucker', label: 'Pucker your lips', instructions: 'Pucker your lips like a kiss' },
  { id: 'turn_left', label: 'Turn head LEFT', instructions: 'Look firmly to your left' },
  { id: 'turn_right', label: 'Turn head RIGHT', instructions: 'Look firmly to your right' }
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

// Cache the last known face landmarks so hand challenges work even if the hand temporarily obscures the face (dropping face tracking)
let lastKnownFaceLandmarks = null;

// Evaluate blendshapes and hands to see if they pass the target challenge
export function evaluateChallenge(challengeId, frameData) {
  const { blendshapes, hands, matrixes } = frameData;
  
  if (frameData.landmarks && frameData.landmarks.length > 0) {
    lastKnownFaceLandmarks = frameData.landmarks;
  }

  // Convert blendshapes array to a key-value map for easy lookup
  const scores = {};
  if (blendshapes && blendshapes.categories) {
    blendshapes.categories.forEach(b => {
      scores[b.categoryName] = b.score;
    });
  }

  switch (challengeId) {
    case 'smile':
      if (!blendshapes) return false;
      return (scores['mouthSmileLeft'] > CONFIG.BLENDSHAPE_SMILE && scores['mouthSmileRight'] > CONFIG.BLENDSHAPE_SMILE);
      
    case 'mouth_open':
      if (!blendshapes) return false;
      return (scores['jawOpen'] > CONFIG.BLENDSHAPE_JAW_OPEN); 
      
    case 'blink_eyes':
      if (!blendshapes) return false;
      return (scores['eyeBlinkLeft'] > CONFIG.BLENDSHAPE_BLINK && scores['eyeBlinkRight'] > CONFIG.BLENDSHAPE_BLINK);
      
    case 'eyebrows_up':
      if (!blendshapes) return false;
      return (scores['browInnerUp'] > CONFIG.BLENDSHAPE_BROW_UP);
      
    case 'pucker':
      if (!blendshapes) return false;
      return (scores['mouthPucker'] > CONFIG.BLENDSHAPE_PUCKER);

    case 'turn_left':
    case 'turn_right': {
      const faceLandmarks = frameData.landmarks || lastKnownFaceLandmarks;
      if (!faceLandmarks) return false;
      
      const nose = faceLandmarks[1];
      const leftCheek = faceLandmarks[234];
      const rightCheek = faceLandmarks[454];
      
      const distLeft = Math.abs(nose.x - leftCheek.x);
      const distRight = Math.abs(rightCheek.x - nose.x);
      
      // Because MediaPipe processes the unmirrored camera feed, the user's physical left turn 
      // appears as a right turn to the AI. Therefore, the logic is flipped.
      if (challengeId === 'turn_left') {
         return distRight < (distLeft * 0.35); // User turned physical left -> AI sees right turn
      } else {
         return distLeft < (distRight * 0.35); // User turned physical right -> AI sees left turn
      }
    }

    case 'touch_nose':
    case 'cover_face':
      if (!hands || hands.length === 0) return false;
      
      // Use cached face landmarks if current frame's face tracking is obscured
      const faceLandmarks = frameData.landmarks || lastKnownFaceLandmarks;
      if (!faceLandmarks) return false;
      
      // Nose tip is landmark 1
      const nose = faceLandmarks[1];
      // Mouth is roughly landmarks 13, 14
      const mouth = faceLandmarks[13];
      
      // Check each hand
      for (const hand of hands) {
        // Index finger tip is hand landmark 8
        const indexTip = hand[8];
        
        // Find the closest hand landmark to the mouth
        let minMouthDist = 1.0;
        for (const pt of hand) {
           const d = Math.sqrt(Math.pow(pt.x - mouth.x, 2) + Math.pow(pt.y - mouth.y, 2));
           if (d < minMouthDist) minMouthDist = d;
        }
        
        // Calculate nose distance to index finger tip
        const distNose = Math.sqrt(Math.pow(indexTip.x - nose.x, 2) + Math.pow(indexTip.y - nose.y, 2));
        
        if (challengeId === 'touch_nose' && distNose < 0.15) return true;
        // If ANY part of the hand is very close to the mouth, it counts as covered
        if (challengeId === 'cover_face' && minMouthDist < 0.15) return true;
      }
      return false;

    default:
      return false;
  }
}

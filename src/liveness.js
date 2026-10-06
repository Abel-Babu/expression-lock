// src/liveness.js - Liveness Challenge Engine
import { CONFIG } from './config.js';

export const CHALLENGES = [
  { id: 'smile', label: 'Smile brightly', instructions: 'Please smile for the camera' },
  { id: 'mouth_open', label: 'Open your mouth', instructions: 'Open your mouth wide' },
  { id: 'blink_eyes', label: 'Blink your eyes', instructions: 'Blink both eyes slowly' },
  { id: 'eyebrows_up', label: 'Raise your eyebrows', instructions: 'Raise both eyebrows' },
  { id: 'pucker', label: 'Pucker your lips', instructions: 'Pucker your lips like a kiss' }
];

export function getRandomChallenge() {
  const index = Math.floor(Math.random() * CHALLENGES.length);
  return CHALLENGES[index];
}

// Evaluate blendshapes to see if they pass the target challenge
export function evaluateChallenge(challengeId, blendshapes) {
  if (!blendshapes || !blendshapes.categories) return false;

  // Convert blendshapes array to a key-value map for easy lookup
  const scores = {};
  blendshapes.categories.forEach(b => {
    scores[b.categoryName] = b.score;
  });

  switch (challengeId) {
    case 'smile':
      // mouthSmileLeft and mouthSmileRight
      return (scores['mouthSmileLeft'] > CONFIG.BLENDSHAPE_SMILE && scores['mouthSmileRight'] > CONFIG.BLENDSHAPE_SMILE);
      
    case 'mouth_open':
      return (scores['jawOpen'] > CONFIG.BLENDSHAPE_JAW_OPEN); 
      
    case 'blink_eyes':
      // Blinking both eyes is much more reliable than winking
      return (scores['eyeBlinkLeft'] > CONFIG.BLENDSHAPE_BLINK && scores['eyeBlinkRight'] > CONFIG.BLENDSHAPE_BLINK);
      
    case 'eyebrows_up':
      // browInnerUp usually correlates strongly with raised eyebrows
      return (scores['browInnerUp'] > CONFIG.BLENDSHAPE_BROW_UP);
      
    case 'pucker':
      return (scores['mouthPucker'] > CONFIG.BLENDSHAPE_PUCKER);
      
    default:
      return false;
  }
}

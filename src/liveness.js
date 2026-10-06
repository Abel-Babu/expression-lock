// src/liveness.js - Liveness Challenge Engine
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
      return (scores['mouthSmileLeft'] > 0.4 && scores['mouthSmileRight'] > 0.4);
      
    case 'mouth_open':
      return (scores['jawOpen'] > 0.45); 
      
    case 'blink_eyes':
      // Blinking both eyes is much more reliable than winking
      return (scores['eyeBlinkLeft'] > 0.45 && scores['eyeBlinkRight'] > 0.45);
      
    case 'eyebrows_up':
      // browInnerUp usually correlates strongly with raised eyebrows
      return (scores['browInnerUp'] > 0.4);
      
    case 'pucker':
      return (scores['mouthPucker'] > 0.5);
      
    default:
      return false;
  }
}

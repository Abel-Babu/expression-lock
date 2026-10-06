// src/liveness.js - Liveness Challenge Engine
export const CHALLENGES = [
  { id: 'smile', label: 'Smile brightly', instructions: 'Please smile for the camera' },
  { id: 'mouth_open', label: 'Open your mouth', instructions: 'Open your mouth wide' },
  { id: 'blink_left', label: 'Wink your left eye', instructions: 'Wink or blink your left eye' },
  { id: 'blink_right', label: 'Wink your right eye', instructions: 'Wink or blink your right eye' },
  { id: 'eyebrows_up', label: 'Raise your eyebrows', instructions: 'Raise both eyebrows' }
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

  const THRESHOLD = 0.5; // Requires significant expression intensity

  switch (challengeId) {
    case 'smile':
      // mouthSmileLeft and mouthSmileRight
      return (scores['mouthSmileLeft'] > THRESHOLD && scores['mouthSmileRight'] > THRESHOLD);
      
    case 'mouth_open':
      return (scores['jawOpen'] > 0.6); // Slightly higher threshold to ensure it's wide open
      
    case 'blink_left':
      // Note: "Left" in MediaPipe refers to the user's left eye (often mirrored on screen)
      return (scores['eyeBlinkLeft'] > 0.6 && scores['eyeBlinkRight'] < 0.2);
      
    case 'blink_right':
      return (scores['eyeBlinkRight'] > 0.6 && scores['eyeBlinkLeft'] < 0.2);
      
    case 'eyebrows_up':
      return (scores['browInnerUp'] > 0.5);
      
    default:
      return false;
  }
}

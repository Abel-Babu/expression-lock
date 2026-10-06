import { evaluateChallenge } from './liveness.js';
import { CONFIG } from '../../../shared/config.js';

describe('Pose and Liveness Engine Math', () => {
  
  test('Smile challenge correctly evaluates blendshapes', () => {
    // Mock passing frame data
    const passingFrame = {
      blendshapes: {
        categories: [
          { categoryName: 'mouthSmileLeft', score: 0.6 },
          { categoryName: 'mouthSmileRight', score: 0.6 }
        ]
      }
    };
    expect(evaluateChallenge('smile', passingFrame)).toBe(true);

    // Mock failing frame data
    const failingFrame = {
      blendshapes: {
        categories: [
          { categoryName: 'mouthSmileLeft', score: 0.2 },
          { categoryName: 'mouthSmileRight', score: 0.2 }
        ]
      }
    };
    expect(evaluateChallenge('smile', failingFrame)).toBe(false);
  });

  test('Touch nose challenge correctly evaluates distances', () => {
    const noseLandmark = { x: 0.5, y: 0.5, z: 0 };
    const mouthLandmark = { x: 0.5, y: 0.6, z: 0 };
    
    // Create a mock frame where index finger (landmark 8) is very close to nose
    const passingFrame = {
      landmarks: { 1: noseLandmark, 13: mouthLandmark },
      hands: [
        { 
          0: { x: 0.2, y: 0.2, z: 0 }, // Palm far away
          8: { x: 0.51, y: 0.51, z: 0 } // Index finger exactly on nose (< 0.1)
        }
      ]
    };
    
    expect(evaluateChallenge('touch_nose', passingFrame)).toBe(true);

    // Create a mock frame where index finger is far
    const failingFrame = {
      landmarks: { 1: noseLandmark, 13: mouthLandmark },
      hands: [
        { 
          0: { x: 0.2, y: 0.2, z: 0 },
          8: { x: 0.9, y: 0.9, z: 0 } 
        }
      ]
    };
    
    expect(evaluateChallenge('touch_nose', failingFrame)).toBe(false);
  });
  
  test('Cover face challenge correctly evaluates palm distance to mouth', () => {
    const noseLandmark = { x: 0.5, y: 0.5, z: 0 };
    const mouthLandmark = { x: 0.5, y: 0.6, z: 0 };
    
    // Create a mock frame where palm (landmark 0) is close to mouth (< 0.2)
    const passingFrame = {
      landmarks: { 1: noseLandmark, 13: mouthLandmark },
      hands: [
        { 
          0: { x: 0.55, y: 0.65, z: 0 }, 
          8: { x: 0.2, y: 0.2, z: 0 } 
        }
      ]
    };
    
    expect(evaluateChallenge('cover_face', passingFrame)).toBe(true);
  });

});

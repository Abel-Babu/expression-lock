export const CONFIG = {
  CHALLENGE_COUNT: 3,
  PRESENCE_CHALLENGE_COUNT: 2,
  CHALLENGE_TIME_MS: 7000,
  SUCCESS_CLOSE_MS: 1500,

  YAW_TARGET_DEG: 28,        // design target
  YAW_TRIGGER_DEG: 20,       // actual trigger, held YAW_HOLD_MS
  YAW_HOLD_MS: 250,
  BIG_TURN_DEG: 40,
  PITCH_UP_DEG: 12,

  EAR_CLOSE_RATIO: 0.70,     // x baseline EAR
  EAR_OPEN_RATIO: 0.85,
  BLINK_MIN_MS: 60,
  BLINK_MAX_MS: 400,

  MAR_OPEN: 0.55,
  MAR_HOLD_MS: 500,
  HAND_MOUTH_HOLD_MS: 300,
  GAZE_SHIFT_RATIO: 0.18,
  GAZE_HOLD_MS: 400,
  GAZE_MAX_HEAD_YAW: 12,

  IDENTITY_MATCH_DISTANCE: 0.50,   // lower = stricter (balanced mode ~0.55)
  MIN_IDENTITY_CHECKS: 3,
  FRONTAL_YAW_MAX_FOR_ID: 15,

  FACE_LOSS_GRACE_MS: 500,
  OCCLUSION_GRACE_MS: 1200,
  MIN_DEPTH_RANGE: 0.03,           // heuristic; tune on your webcam
  ENROLL_SAMPLES: 5,

  // Company policy defaults
  MEETING_VERIFICATION_REQUIRED: true,
  PRESENCE_DEADLINE_MS: 60000,     // time for participants to respond
  SESSION_TTL_MIN: 30,             // Verified Session lifetime
  GUEST_POLICY: 'block_approval',  // or 'allow'
  AUTO_REQUEST_LATE_JOINERS: true,
  DUAL_CONTROL_THRESHOLD_USD: 1000000   // optional stretch
};

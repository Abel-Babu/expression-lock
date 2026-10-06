# Extension Audit

## What exists today
- **Manifest V3 Extension**: Found in `extension/`, containing a service worker (`background/index.js`), content script (`content/index.js`), and isolated engine (`engine/`).
- **Engine**: Fully functional MediaPipe/face-api on-device engine (`vision.js`, `identity.js`, `liveness.js`) housed inside an extension-origin iframe to bypass CSP.
- **Server**: A rudimentary Node.js WebSocket server (`server/server.js`) providing basic meeting participant maps.

## How a meeting is detected
The content script is injected into `*://meet.google.com/*`. It extracts the meeting ID from `window.location.pathname` and generates a randomized string for the `participantId`. It currently blindly connects to the server assuming everyone is authenticated.

## How checks run
Checks are triggered by the server (`SERVER_ROUND_START`) or manually (`REQUEST_MANUAL_CHECK`). The engine runs a loop measuring blendshapes/landmarks for liveness, and extracts a face embedding for the identity check. The result is returned to the server via the WebSocket.

## Identity Matching vs Liveness
Currently, **only liveness is enforced**. The engine accepts a `targetEmbedding`, but the content script never provides one, meaning the engine skips the 1:1 embedding comparison. Enrollment does not exist.

## What is reusable
- The core mathematical solvers in `liveness.js` (Phase 5).
- The `vision.js` / `identity.js` hardware delegation and WASM workers.
- The architectural boundary of isolating the engine in an extension-origin iframe.

## What will be replaced
- The current Server must be entirely rebuilt to support Rosters, Roles, Invites, and the Round Manager state machine.
- The random scheduler in the server will be removed in favor of Host-driven rounds.
- The UI in the content script will be completely replaced with the new Design System (Host panel, cards, history).
- The `participantId` generation will be replaced by authenticated member tokens.

## Current Liveness Failures
The "Liveness Challenge Timeout" results frequently occur because:
1. There is no "Readiness Step" (ensuring lighting/face is in frame before starting).
2. The UI doesn't provide visual step-by-step progress, so users fail to hold poses long enough.
3. The countdowns are client-driven and race against slow WASM initializations.
Fix: Add a readiness check, a "Get ready" countdown, and decouple the attempt timer to use the server clock.

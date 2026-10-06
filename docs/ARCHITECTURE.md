# Architecture & Migration Map

## 1. Prototype Inventory & Migration Map

The prototype was originally built as a single-page web app. For the Chrome Extension MV3 architecture, we must decouple the UI from the Biometric Engine and the Signaling.

| Prototype Module | Current Purpose | Target Destination | Refactor Notes |
|---|---|---|---|
| `app.js` | Main URL router and view container | `N/A` | Will be replaced by React/Vanilla logic inside the content script and extension popups. |
| `src/orgStore.js` | IndexedDB logic for face templates | `extension/src/engine/store.js` | Templates MUST stay strictly on the client extension. |
| `src/vision.js` | MediaPipe Face/Hand wrappers | `extension/src/engine/` | Will run in a sandboxed extension-origin page (iframe/offscreen) to avoid page CSP issues. |
| `src/identity.js` | Face-API wrapper | `extension/src/engine/` | Move alongside `vision.js`. |
| `src/liveness.js` | Math for physical challenges | `shared/` or `extension/src/engine/` | The challenge definitions and logic move to the engine. |
| `src/signal.js` | `BroadcastChannel` simulator | `server/` and `extension/src/background/` | Will be replaced by WebSockets talking to the Node.js Session Server. |
| `src/portal.js` | The "victim" treasury app | `N/A` | Out of scope for the extension (transaction APIs are future roadmap). |
| `src/hostView.js` | Meeting trigger UI | `extension/src/content/overlay.js` | Becomes the host controls in the content script overlay. |
| `src/participantView.js`| Meeting participant UI | `extension/src/content/overlay.js` | Becomes the check prompt and transparency log in the content script. |
| `src/orgView.js` | Enrollment and policy UI | `extension/src/options/` | Becomes the MV3 Options page for onboarding and policy. |
| `vendor/` & `models/` | Offline WASM & NN weights | `extension/public/` | Must be bundled directly into the extension. |

## 2. Tooling Decision

**Decision:** Vite with `@crxjs/vite-plugin`.
**Justification:** Manifest V3 requires bundling all dependencies (no remote code execution). Vite provides exceptionally fast hot-module replacement (HMR), and the `@crxjs` plugin handles the complexities of MV3 manifest parsing, service worker injection, and content-script hot-reloading seamlessly. Esbuild is faster but requires manual MV3 scaffolding which adds unnecessary overhead.

## 3. `BroadcastChannel` and Global State Deprecation

Currently, the prototype uses `BroadcastChannel` in `signal.js` to simulate WebRTC across tabs.
*   **Deprecation:** This will be completely removed in the extension build.
*   **Replacement:** The extension Background Service Worker will hold a persistent WebSocket connection to the Node `server/`. Messages will flow: `Content Script` <-> `Service Worker` <-> `Node.js Session Server`.

## 4. Message Protocol Outline (Client <-> Server)

*   `CLIENT_REGISTER`: Client joins (memberId, meetingCode, displayName).
*   `SERVER_ROUND_START`: Server initiates a check (roundId, deadline, nonce).
*   `CLIENT_ROUND_RESULT`: Client returns the outcome (roundId, signed result, hash).
*   `SERVER_LOG_BROADCAST`: Server broadcasts the transparency log to all clients in the meeting.

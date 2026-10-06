# Expression Lock V4 Plan

## Phase 0: Audit & Plan
- [x] Write `docs/AUDIT.md`.
- [x] Write `docs/PLAN.md`.

## Phase 1: Session Server Foundation
- Rebuild `server/` with Express/WS using robust state management.
- Add domains, rosters (email/role), meeting state, host claim, and WebSocket typed events.
- Implement Host Handover and Host-only `START_ROUND` validation.

## Phase 2: Engine Integration & Identity
- Expose a clean `runAttempt` API from the engine.
- Integrate IndexedDB for persistent face templates (`targetEmbedding`).
- Implement the "Readiness Step" and "Get Ready" countdown.
- Return structured attempt reasons (Timeout, IdentityMismatch, etc).

## Phase 3: Round Manager
- Build the Round Manager on the Server.
- Enforce host-only start, per-attempt nonces, and the strict 2-attempt limit.
- Manage deadlines using the server clock.
- Broadcast `ROUND_PROGRESS` to the Host and `ROUND_RESULTS` to the room.

## Phase 4: Extension Connectivity
- Update Service Worker to hold the `wss://` connection.
- Implement exponential backoff, reconnect, heartbeat, and tab-syncing.
- Add server-time sync for attempt countdowns.

## Phase 5: Meet Overlay, Host Panel & Participant Flow
- Replace the raw prototype UI with Shadow DOM overlays.
- Build the Host Panel (Claim Host, Start Round, Handover).
- Build the Participant Popup (Begin, Countdown, Retry 1/2).
- Build the Results/History table.

## Phase 6: Company Onboarding (Email Preset)
- Build the Admin Options page (CSV Import, Invites).
- Build the Member Onboarding Wizard (Email, Invite Code, Face Enrollment).
- Restrict Extension usage to enrolled members.

## Phase 7: Professional UI Pass
- Centralize UI components into a Design System (`ui/`).
- Add light/dark modes, accessible ARIA tags, and bundled fonts/icons.
- Capture Playwright screenshots.

## Phase 8: Hardening, Testing & Docs
- Implement Playwright End-to-End mock testing.
- Write extensive deployment documentation (`README.md`, `PROTOCOL.md`).
- Load test with 25 simulated clients.

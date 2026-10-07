# Expression Lock: Zero-Trust Biometric Meeting Verification

**Expression Lock** is a robust, privacy-first biometric verification system designed to eradicate real-time deepfakes and prevent unauthorized access in enterprise video calls (currently integrated with Google Meet).

By combining randomized physical liveness challenges with rigorous on-device neural network identity extraction, Expression Lock ensures that every participant is exactly who they claim to be—and that they are physically present behind the camera.

## Features

* **Real-time Liveness Challenges:** Forces users to perform randomized tasks (e.g., "Smile", "Look firmly left", "Raise your eyebrows") to prove they are a live, 3D human, defeating static photos and simple 2D deepfakes.
* **Continuous Identity Verification:** Uses a ResNet-34 neural network to extract a 128-dimensional mathematical embedding of the participant's face and matches it against an enrolled biometric baseline.
* **On-Device AI Engine:** All computer vision processing happens completely offline inside your browser. **No video or images are ever sent over the internet.**
* **Cryptographic Security:** Every verification round is signed with a unique, server-generated cryptographic nonce to prevent replay attacks.
* **Invisible Pre-warming:** AI models are invisibly cached and WebGL shaders are pre-compiled the moment you open a meeting tab, resulting in a zero-lag biometric check when requested.

## Architecture

* **`/extension`**: A Manifest V3 Chrome Extension built with Vite. It injects an isolated Shadow DOM overlay into Google Meet. A sandboxed `iframe` safely runs `@mediapipe/tasks-vision` and `face-api.js` on the GPU.
* **`/server`**: A Node.js WebSocket server that manages meeting states, enforces strict timeouts (60s deadlines), and orchestrates continuous verification checks.
* **`/shared`**: Centralized configuration and cryptographic constants shared between the client and server.

## Installation & Setup

### 1. Start the WebSocket Server
The server manages the sync between the Host and the Participants.
```bash
cd server
npm install
npm start
```
*The server will run on `ws://localhost:3000`.*

### 2. Build & Install the Chrome Extension
```bash
cd extension
npm install
npm run build
```
1. Open Google Chrome and go to `chrome://extensions`.
2. Toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the newly created `extension/dist` folder.

### 3. Enroll Your Identity
1. Click the **Expression Lock** puzzle piece icon in your Chrome toolbar.
2. In the Options page, enter your name.
3. Click **Enroll My Face**. The system will securely extract and save your 128-dimensional facial embedding directly to your browser's local storage.

### 4. Run a Verification Check
1. Join a Google Meet call (`https://meet.google.com/...`).
2. Click the floating **Expression Lock** pill in the top-left corner.
3. One participant must click **Claim Host**.
4. The Host can now click **Start Check** to instantly push a mandatory verification challenge to everyone in the meeting.
5. Participants must hold the requested expressions for 600ms, followed by an automatic identity extraction check.
6. The Host receives a live scoreboard of who passed and who failed.

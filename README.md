# Expression Lock: Meeting Verification

This repository contains the architecture for **Expression Lock**, a Zero-Trust biometric meeting verification system designed to stop real-time deepfakes in enterprise video calls.

## Repository Structure

*   `/prototype` - The original v0 single-page web app. This demonstrates the core biometric engine, Action Gate (Treasury Portal), and simulated WebRTC signaling.
*   `/extension` - The Manifest V3 Chrome Extension. (WIP)
*   `/server` - The Node.js Session Server for managing meeting checks and transparency logs. (WIP)
*   `/shared` - Shared types, protocols, and configuration. (WIP)
*   `/docs` - Architecture and security documentation.

## How to Run the Prototype

To test the core AI and the Action Gate simulation, run the prototype offline:

1. Navigate to the prototype directory:
   ```bash
   cd prototype
   ```
2. Start the local server:
   ```bash
   python server.py
   ```
3. Open `http://localhost:8080` in your browser.

## Roadmap

The current goal is migrating the prototype engine into a secure, sandboxed Manifest V3 Chrome Extension that integrates natively with Google Meet, backed by a Node.js session server for secure scheduling and cryptographic validation.

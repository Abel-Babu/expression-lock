# Expression Lock

Verified Presence for High-Stakes Video Conferences.

## How to Run (Offline)

1. **Download models (Run once):**
   \`\`\`bash
   python download_models.py
   \`\`\`
2. **Start the local server:**
   \`\`\`bash
   python -m http.server 8000
   \`\`\`
   *(Or use \`npx serve .\`)*
3. **Open in browser:**
   Navigate to [http://localhost:8000](http://localhost:8000). (Camera access requires localhost or HTTPS).

## Checkpoints & Demo

This Proof of Concept demonstrates the **Two-Checkpoint Company Policy**:
1. **Meeting Checkpoint:** Host verifies the room and generates a Verified Session.
2. **Transaction Checkpoint:** The action checks for a valid session, then runs a fresh physical Action Gate check.

(Phases 1-11 are currently being built.)

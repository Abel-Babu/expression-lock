import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const meetings = new Map(); // meetingId -> { participants: Map, status, logs }

wss.on('connection', (ws) => {
  let currentMeetingId = null;
  let currentParticipantId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_MEETING':
          currentMeetingId = data.meetingId;
          currentParticipantId = data.participantId;
          
          if (!meetings.has(currentMeetingId)) {
            meetings.set(currentMeetingId, {
              participants: new Map(),
              trustLevel: 'UNKNOWN',
              logs: []
            });
          }
          
          const meeting = meetings.get(currentMeetingId);
          meeting.participants.set(currentParticipantId, { ws, status: 'PENDING' });
          
          console.log(`[Server] Participant ${currentParticipantId} joined ${currentMeetingId}`);
          break;
          
        case 'VERIFICATION_RESULT':
          // In a real app, this validates the ECDSA signature
          console.log(`[Server] Received result from ${currentParticipantId}:`, data.payload);
          const m = meetings.get(currentMeetingId);
          if (m) {
            const p = m.participants.get(currentParticipantId);
            if (p) p.status = data.payload.status === 'VERIFIED' ? 'VERIFIED' : 'FAILED';
            
            // Recompute trust level
            let allVerified = true;
            m.participants.forEach(participant => {
              if (participant.status !== 'VERIFIED') allVerified = false;
            });
            m.trustLevel = allVerified ? 'VERIFIED' : 'ALERT';
            
            // Broadcast new trust level
            const logEntry = {
              type: 'TRUST_LEVEL_UPDATED',
              level: m.trustLevel,
              participant: currentParticipantId,
              status: p.status
            };
            m.logs.push(logEntry);
            
            m.participants.forEach(participant => {
              participant.ws.send(JSON.stringify(logEntry));
            });
          }
          break;
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentMeetingId) {
      const m = meetings.get(currentMeetingId);
      if (m) {
        m.participants.delete(currentParticipantId);
        console.log(`[Server] Participant ${currentParticipantId} left ${currentMeetingId}`);
      }
    }
  });
});

// Admin REST endpoints
app.get('/api/meetings/:id', (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  
  res.json({
    trustLevel: m.trustLevel,
    participantCount: m.participants.size,
    logs: m.logs
  });
});

// Helper for generating crypto nonces
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[Server] Session Server running on http://localhost:${PORT}`);
});

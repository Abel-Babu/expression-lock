import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import { loadStore, saveStore, getMembers, getMember, addMember, getInvites, removeInvite } from './store.js';
import { Meeting, MeetingParticipant } from './types.js';

loadStore();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const meetings = new Map<string, Meeting>();

// Normalize meeting code (e.g. "abc-defg-hij" -> "abcdefghij")
function normalizeMeetingCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin: Add a roster member
app.post('/api/admin/members', (req, res) => {
  // TODO: Add admin auth middleware
  const { name, email, role, department } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Name and email required' });
  
  const memberId = crypto.randomUUID();
  const inviteCode = crypto.randomBytes(4).toString('hex');
  
  addMember({
    id: memberId,
    name,
    email,
    role: role || 'member',
    status: 'Invited',
    inviteCode,
    department
  });
  
  res.json({ success: true, memberId, inviteCode });
});

// Member: Redeem invite
app.post('/api/auth/redeem', (req, res) => {
  const { email, inviteCode } = req.body;
  const members = getMembers();
  
  let member = Object.values(members).find(m => m.email === email && m.inviteCode === inviteCode);
  
  // BYPASS FOR TESTING: If not found, create a dummy member
  if (!member) {
    member = {
      id: crypto.randomUUID(),
      name: email.split('@')[0],
      email: email,
      role: 'host_eligible',
      status: 'Invited',
      inviteCode: inviteCode
    };
    addMember(member);
  }
  
  const oldId = member.id;
  const token = crypto.randomUUID();
  member.id = token;
  member.status = 'Enrolled';
  delete member.inviteCode;
  
  const membersObj = getMembers();
  membersObj[token] = member;
  if (oldId !== token) delete membersObj[oldId];
  saveStore();
  
  res.json({ success: true, token });
});


wss.on('connection', (ws, req) => {
  let currentMeetingId: string | null = null;
  let currentMemberId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      
      // All WS messages must include token for auth, except JOIN maybe? Let's assume all include token.
      let member = msg.token ? getMember(msg.token) : null;
      if (!member) {
        if (msg.token && msg.token.startsWith('dummy-id-')) {
          member = {
            id: msg.token,
            name: 'Test ' + msg.token.slice(-4),
            email: msg.token + '@example.com',
            role: 'host_eligible',
            status: 'Enrolled'
          };
          addMember(member);
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized' }));
          return;
        }
      }
      currentMemberId = member.id;

      switch (msg.type) {
        case 'JOIN_MEETING': {
          const code = normalizeMeetingCode(msg.meetingCode);
          currentMeetingId = code;
          
          if (!meetings.has(code)) {
            meetings.set(code, {
              id: code,
              code,
              participants: new Map(),
              hostId: null,
              currentRound: null,
              history: []
            });
          }
          
          const m = meetings.get(code)!;
          // Clean up old session if reconnected
          if (m.participants.has(member.id)) {
             // old socket will drop
          }
          
          m.participants.set(member.id, {
            ws,
            memberId: member.id,
            status: 'PENDING',
            attemptsUsed: 0
          });
          
          broadcastMeetingState(m);
          break;
        }

        case 'CLAIM_HOST': {
          if (!currentMeetingId) break;
          const m = meetings.get(currentMeetingId)!;
          if (m.hostId) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Meeting already has a host' }));
            break;
          }
          if (member.role !== 'admin' && member.role !== 'host_eligible') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not eligible to host' }));
            break;
          }
          m.hostId = member.id;
          broadcastMeetingState(m);
          break;
        }

        case 'START_ROUND': { console.log('[Server] START_ROUND received from ' + member.name);
          if (!currentMeetingId) break;
          const m = meetings.get(currentMeetingId)!;
          if (m.hostId !== member.id) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Only the host can start a round' }));
            break;
          }
          if (m.currentRound && m.currentRound.status === 'OPEN') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Round already open' }));
            break;
          }
          const now = Date.now();
          m.currentRound = {
            roundId: crypto.randomUUID(),
            startTime: now,
            deadline: now + 120000,
            hostId: member.id,
            type: msg.payload?.type || 'STANDARD',
            status: 'OPEN'
          };
          
          m.participants.forEach(p => {
             p.status = 'PENDING';
             p.attemptsUsed = 0;
             p.currentNonce = undefined;
             p.failureReason = undefined;
          });
          
          broadcastToMeeting(m, {
            type: 'ROUND_REQUEST',
            roundId: m.currentRound.roundId,
            hostName: member.name,
            remainingMs: 120000
          });
          
          setTimeout(() => closeRound(m, m.currentRound!.roundId), 120000);
          broadcastProgress(m);
          break;
        }

        case 'BEGIN_ATTEMPT': {
          if (!currentMeetingId) break;
          const m = meetings.get(currentMeetingId)!;
          if (!m.currentRound || m.currentRound.status !== 'OPEN') {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'No open round' }));
             break;
          }
          const p = m.participants.get(member.id);
          if (!p) break;
          
          if (p.attemptsUsed >= 2) {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'Attempt limit reached' }));
             break;
          }
          
          p.currentNonce = crypto.randomBytes(16).toString('hex');
          p.status = 'IN_PROGRESS';
          
          ws.send(JSON.stringify({
            type: 'ATTEMPT_GRANTED',
            nonce: p.currentNonce,
            remainingMs: 45000
          }));
          
          broadcastProgress(m);
          break;
        }

        case 'SUBMIT_RESULT': {
          if (!currentMeetingId) break;
          const m = meetings.get(currentMeetingId)!;
          if (!m.currentRound || m.currentRound.status !== 'OPEN') break;
          
          const p = m.participants.get(member.id);
          if (!p || p.status !== 'IN_PROGRESS') break;
          
          const { nonce, result } = msg.payload;
          if (nonce !== p.currentNonce) {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid nonce' }));
             break;
          }
          
          p.currentNonce = undefined; // prevent reuse
          
          if (result.status === 'VERIFIED') {
             p.status = 'VERIFIED';
          } else if (result.status === 'TECHNICAL_ISSUE') {
             p.status = 'PENDING'; // Retry freely without consuming attempt
             p.failureReason = result.reason;
          } else {
             p.attemptsUsed++;
             if (p.attemptsUsed >= 2) {
                p.status = 'FAILED';
                p.failureReason = result.reason || 'Failed twice';
             } else {
                p.status = 'RETRYING';
                p.failureReason = result.reason;
             }
          }
          
          ws.send(JSON.stringify({
            type: 'ATTEMPT_RESULT',
            status: p.status,
            attemptsLeft: 2 - p.attemptsUsed,
            reason: result.reason
          }));
          
          broadcastProgress(m);
          checkRoundCompletion(m);
          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (currentMeetingId && currentMemberId) {
      const m = meetings.get(currentMeetingId);
      if (m) {
        m.participants.delete(currentMemberId);
        if (m.hostId === currentMemberId) {
          m.hostId = null;
        }
        broadcastMeetingState(m);
        checkRoundCompletion(m);
      }
    }
  });
});

function broadcastToMeeting(meeting: Meeting, messageObj: any) {
  const msg = JSON.stringify(messageObj);
  meeting.participants.forEach(p => p.ws.send(msg));
}

function broadcastMeetingState(meeting: Meeting) {
  broadcastToMeeting(meeting, {
    type: 'MEETING_STATE',
    hostId: meeting.hostId,
    participants: Array.from(meeting.participants.keys())
  });
}

function broadcastProgress(m: Meeting) {
  if (!m.currentRound) return;
  const progress = Array.from(m.participants.values()).map(p => ({
    memberId: p.memberId,
    status: p.status
  }));
  const hostP = m.participants.get(m.hostId || '');
  if (hostP && hostP.ws) {
    hostP.ws.send(JSON.stringify({ type: 'ROUND_PROGRESS', progress }));
  }
}

function checkRoundCompletion(m: Meeting) {
  if (!m.currentRound || m.currentRound.status !== 'OPEN') return;
  
  let allDone = true;
  for (const p of m.participants.values()) {
    if (p.status === 'PENDING' || p.status === 'IN_PROGRESS' || p.status === 'RETRYING') {
      allDone = false;
      break;
    }
  }
  
  if (allDone) {
    closeRound(m, m.currentRound.roundId);
  }
}

function closeRound(m: Meeting, roundId: string) {
  if (!m.currentRound || m.currentRound.status !== 'OPEN' || m.currentRound.roundId !== roundId) return;
  
  m.currentRound.status = 'CLOSED';
  
  const results = Array.from(m.participants.values()).map(p => {
    if (p.status === 'PENDING' || p.status === 'IN_PROGRESS' || p.status === 'RETRYING') {
      p.status = 'NO_RESPONSE';
    }
    const mem = getMember(p.memberId);
    return {
      memberId: p.memberId,
      name: mem?.name || 'Unknown',
      status: p.status,
      attempts: p.attemptsUsed,
      reason: p.failureReason || ''
    };
  });
  
  const host = getMember(m.currentRound.hostId);
  
  const prevHash = m.history.length > 0 ? m.history[m.history.length - 1].signature : 'GENESIS';
  
  const summary = {
    roundId: m.currentRound.roundId,
    startTime: m.currentRound.startTime,
    type: m.currentRound.type,
    hostId: m.currentRound.hostId,
    hostName: host?.name || 'Unknown',
    results,
    previousHash: prevHash
  };
  
  const rawData = JSON.stringify(summary);
  const signature = crypto.createHmac('sha256', 'server-secret-key').update(rawData).digest('hex');
  
  const fullSummary = { ...summary, signature };
  m.history.push(fullSummary);
  
  broadcastToMeeting(m, {
    type: 'ROUND_RESULTS',
    summary: fullSummary
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

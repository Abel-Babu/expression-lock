import WebSocket from 'ws';

async function runTests() {
  console.log('Running Phase 3 tests...');
  
  // 1. Create two members
  const r1 = await fetch('http://localhost:3000/api/admin/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Host', email: 'host@example.com', role: 'host_eligible' }) });
  const d1 = await r1.json();
  const r1t = await fetch('http://localhost:3000/api/auth/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'host@example.com', inviteCode: d1.inviteCode }) });
  const hostToken = (await r1t.json()).token;

  const r2 = await fetch('http://localhost:3000/api/admin/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'User', email: 'user@example.com', role: 'member' }) });
  const d2 = await r2.json();
  const r2t = await fetch('http://localhost:3000/api/auth/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com', inviteCode: d2.inviteCode }) });
  const userToken = (await r2t.json()).token;

  let currentNonce = '';
  let secondAttempt = false;

  const hostWs = new WebSocket('ws://localhost:3000');
  const userWs = new WebSocket('ws://localhost:3000');

  const meetingCode = 'phase3-' + Date.now();
  hostWs.on('open', () => hostWs.send(JSON.stringify({ type: 'JOIN_MEETING', token: hostToken, meetingCode })));
  userWs.on('open', () => userWs.send(JSON.stringify({ type: 'JOIN_MEETING', token: userToken, meetingCode })));

  let userReceivedRound = false;

  hostWs.on('message', (msg) => {
    const parsed = JSON.parse(msg.toString());
    if (parsed.type === 'MEETING_STATE') {
      if (!parsed.hostId) {
        hostWs.send(JSON.stringify({ type: 'CLAIM_HOST', token: hostToken }));
      } else if (parsed.hostId && !userReceivedRound) {
        hostWs.send(JSON.stringify({ type: 'START_ROUND', token: hostToken }));
        userReceivedRound = true; // prevent double trigger
      }
    }
  });

  userWs.on('message', (msg) => {
    const parsed = JSON.parse(msg.toString());
    console.log('[USER]', parsed.type, parsed);
    
    if (parsed.type === 'ROUND_REQUEST') {
      userWs.send(JSON.stringify({ type: 'BEGIN_ATTEMPT', token: userToken }));
    } else if (parsed.type === 'ATTEMPT_GRANTED') {
      currentNonce = parsed.nonce;
      if (!secondAttempt) {
        secondAttempt = true;
        userWs.send(JSON.stringify({ type: 'SUBMIT_RESULT', token: userToken, payload: { nonce: currentNonce, result: { status: 'FAILED', reason: 'Timeout' } } }));
      } else {
        userWs.send(JSON.stringify({ type: 'SUBMIT_RESULT', token: userToken, payload: { nonce: currentNonce, result: { status: 'VERIFIED' } } }));
      }
    } else if (parsed.type === 'ATTEMPT_RESULT') {
      if (parsed.status === 'RETRYING') {
        userWs.send(JSON.stringify({ type: 'BEGIN_ATTEMPT', token: userToken }));
      }
    } else if (parsed.type === 'ROUND_RESULTS') {
      console.log('Summary:', JSON.stringify(parsed.summary, null, 2));
      console.log('Phase 3 Tests Passed!');
      process.exit(0);
    }
  });
  
  hostWs.on('message', (msg) => {
    const parsed = JSON.parse(msg.toString());
    if (parsed.type === 'MEETING_STATE') {
      if (!parsed.hostId) {
        hostWs.send(JSON.stringify({ type: 'CLAIM_HOST', token: hostToken }));
      } else if (parsed.hostId && !userReceivedRound) {
        hostWs.send(JSON.stringify({ type: 'START_ROUND', token: hostToken }));
        userReceivedRound = true; // prevent double trigger
      }
    } else if (parsed.type === 'ROUND_REQUEST') {
      hostWs.send(JSON.stringify({ type: 'BEGIN_ATTEMPT', token: hostToken }));
    } else if (parsed.type === 'ATTEMPT_GRANTED') {
      hostWs.send(JSON.stringify({ type: 'SUBMIT_RESULT', token: hostToken, payload: { nonce: parsed.nonce, result: { status: 'VERIFIED' } } }));
    } else if (parsed.type === 'ROUND_RESULTS') {
      // Host receives it too
    }
  });
}

runTests();

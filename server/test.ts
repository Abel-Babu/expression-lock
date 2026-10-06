import WebSocket from 'ws';

async function runTests() {
  console.log('Running tests...');
  
  // 1. Create a member via REST
  const res = await fetch('http://localhost:3000/api/admin/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice', email: 'alice@example.com', role: 'host_eligible' })
  });
  const data = await res.json();
  
  // 2. Redeem invite
  const res2 = await fetch('http://localhost:3000/api/auth/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@example.com', inviteCode: data.inviteCode })
  });
  const data2 = await res2.json();
  const token = data2.token;

  // 3. Connect WS
  const ws = new WebSocket('ws://localhost:3000');
  
  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'JOIN_MEETING', token, meetingCode: 'test-meeting' }));
  });

  ws.on('message', (msg) => {
    const parsed = JSON.parse(msg.toString());
    console.log('Received:', parsed);
    
    if (parsed.type === 'MEETING_STATE') {
      if (!parsed.hostId) {
        console.log('Claiming host...');
        ws.send(JSON.stringify({ type: 'CLAIM_HOST', token }));
      } else {
        console.log('Host is', parsed.hostId);
        console.log('Phase 1 Tests Passed!');
        process.exit(0);
      }
    }
  });
}

runTests();

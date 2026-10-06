// src/background/index.js - Service Worker
let socket = null;
let currentMeetingId = null;
let currentParticipantId = null;

function connectToServer() {
  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => {
    console.log('[Background] Connected to Session Server');
    if (currentMeetingId && currentParticipantId) {
      socket.send(JSON.stringify({
        type: 'JOIN_MEETING',
        meetingId: currentMeetingId,
        participantId: currentParticipantId,
        isHost: true // Simplified for demo
      }));
    }
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('[Background] Received from server:', data);
    
    if (data.type === 'SERVER_ROUND_START') {
      // Ping content script to start a check
      chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TRIGGER_VERIFICATION',
            nonce: data.nonce
          });
        });
      });
    } else if (data.type === 'MEETING_ARMED') {
      chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'MEETING_ARMED' }));
      });
    } else if (data.type === 'TRUST_LEVEL_UPDATED') {
      chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'TRUST_LEVEL_UPDATED', payload: data }));
      });
    }
  };

  socket.onclose = () => {
    console.log('[Background] Disconnected. Reconnecting in 3s...');
    setTimeout(connectToServer, 3000);
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
});

// Start connection
connectToServer();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOIN_MEETING_REQ') {
    currentMeetingId = message.meetingId;
    currentParticipantId = message.participantId;
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'JOIN_MEETING',
        meetingId: currentMeetingId,
        participantId: currentParticipantId,
        isHost: message.isHost
      }));
    }
  } else if (message.type === 'ARM_MEETING_REQ') {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ARM_MEETING' }));
    }
  } else if (message.type === 'MANUAL_CHECK_REQ') {
    // Manually trigger a check instantly
    chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TRIGGER_VERIFICATION',
          nonce: 'manual-nonce-' + Date.now()
        });
      });
    });
  } else if (message.type === 'VERIFICATION_COMPLETE') {
    console.log('[Background] Relaying verified signed result to server:', message.payload);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'VERIFICATION_RESULT',
        payload: message.payload
      }));
    }
  }
});

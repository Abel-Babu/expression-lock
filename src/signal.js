// src/signal.js - Local BroadcastChannel Router for Cross-Tab Communication
const channel = new BroadcastChannel('expression-lock-signaling');

export function sendSignal(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };
  channel.postMessage(message);
}

export function onSignal(callback) {
  channel.onmessage = (event) => {
    callback(event.data.type, event.data.payload, event.data.timestamp);
  };
}

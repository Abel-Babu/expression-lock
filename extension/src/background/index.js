// src/background/index.js - Service Worker

console.log('[Expression Lock] Service worker started.');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed.');
});

// Mock triggered verification for Phase 2 test
chrome.alarms.create('demo-trigger', { delayInMinutes: 0.1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'demo-trigger') {
    // Ping content script to start a check
    chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TRIGGER_VERIFICATION',
          nonce: 'mock-nonce-12345'
        });
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VERIFICATION_COMPLETE') {
    console.log('[Background] Received verified signed result:', message.payload);
  }
});

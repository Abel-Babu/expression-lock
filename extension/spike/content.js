console.log('[Spike] Content script injected into Meet.');

// Spike 5: Overlay Isolation (Closed Shadow DOM)
const container = document.createElement('div');
container.style.position = 'fixed';
container.style.top = '20px';
container.style.right = '20px';
container.style.width = '250px';
container.style.height = '300px';
container.style.zIndex = '999999';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'closed' });

// Spike 3: Embedding engine via web_accessible_resources
const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('engine.html');
iframe.allow = 'camera; microphone'; // Critical for cross-origin camera access
iframe.style.width = '100%';
iframe.style.height = '100%';
iframe.style.border = 'none';
iframe.style.borderRadius = '12px';
iframe.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
iframe.style.background = '#111';

shadow.appendChild(iframe);

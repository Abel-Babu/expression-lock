chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../options/icon128.png', // Fallback icon path
      title: 'Expression Lock',
      message: request.message,
      priority: 2
    });
    
    // Set badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    
    // Auto-clear badge after 2 minutes
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 120000);
  }
});

chrome.notifications.onClicked.addListener(() => {
  // Try to find the Meet tab and focus it
  chrome.tabs.query({ url: "*://meet.google.com/*" }, function(tabs) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    }
  });
});

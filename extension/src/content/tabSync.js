export class TabSyncManager {
  constructor(meetingCode, onStateChange) {
    this.channel = new BroadcastChannel(`expr-lock-${meetingCode}`);
    this.isActive = true;
    this.onStateChange = onStateChange;
    this.myTabId = Math.random().toString(36).substring(7);

    this.channel.onmessage = (event) => {
      const { type, tabId } = event.data;
      if (type === 'CLAIM_ACTIVE' && tabId !== this.myTabId) {
        if (this.isActive) {
          // I am being deposed
          this.isActive = false;
          this.onStateChange('PASSIVE');
        }
      }
    };

    // When we start up, claim active immediately
    this.claimActive();
    
    // Refresh claim every few seconds to override dead tabs
    this.interval = setInterval(() => {
      if (this.isActive) {
        this.claimActive();
      }
    }, 5000);
  }

  claimActive() {
    this.isActive = true;
    this.onStateChange('ACTIVE');
    this.channel.postMessage({ type: 'CLAIM_ACTIVE', tabId: this.myTabId });
  }

  destroy() {
    clearInterval(this.interval);
    this.channel.close();
  }
}

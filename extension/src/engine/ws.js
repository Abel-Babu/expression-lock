import { CONFIG } from '../../shared/config.js';

export class ConnectionManager {
  constructor(url, token, meetingCode, onMessageCallback, onStateChange) {
    this.url = url;
    this.token = token;
    this.meetingCode = meetingCode;
    this.onMessageCallback = onMessageCallback;
    this.onStateChange = onStateChange;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.intentionallyClosed = false;
    this.heartbeatInterval = null;
  }

  connect() {
    this.intentionallyClosed = false;
    this.onStateChange('CONNECTING');
    
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStateChange('CONNECTED');
      this.startHeartbeat();
      
      // Send JOIN_MEETING
      this.send({
        type: 'JOIN_MEETING',
        token: this.token,
        meetingCode: this.meetingCode
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onMessageCallback(msg);
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.intentionallyClosed) {
        this.onStateChange('DISCONNECTED');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('WS Error', err);
    };
  }

  send(msgObj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Inject token if not present
      if (!msgObj.token) msgObj.token = this.token;
      this.ws.send(JSON.stringify(msgObj));
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'HEARTBEAT' });
    }, CONFIG.HEARTBEAT_SEC * 1000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= CONFIG.RECONNECT_BACKOFF_MS.length) {
      this.reconnectAttempts = CONFIG.RECONNECT_BACKOFF_MS.length - 1; // cap
    }
    const backoffMs = CONFIG.RECONNECT_BACKOFF_MS[this.reconnectAttempts];
    this.reconnectAttempts++;
    
    console.log(`Reconnecting in ${backoffMs}ms...`);
    setTimeout(() => {
      if (!this.intentionallyClosed) {
        this.connect();
      }
    }, backoffMs);
  }

  disconnect() {
    this.intentionallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
    this.onStateChange('DISCONNECTED');
  }
}

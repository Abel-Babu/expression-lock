// src/orgStore.js - IndexedDB Storage Engine for Expression Lock
const DB_NAME = 'ExpressionLockDB';
const DB_VERSION = 1;

const DEFAULT_USERS = [
  {
    id: 'cfo-1',
    name: 'Chief Financial Officer',
    role: 'CFO',
    department: 'Global Treasury & Finance',
    enrolled: false,
    enrolledAt: null,
    sampleCount: 0,
    embedding: null,
    policy: {
      thresholdAmount: 1000000,
      requireDualApproval: true,
      livenessStrictness: 'high'
    }
  },
  {
    id: 'cto-1',
    name: 'Chief Technology Officer',
    role: 'CTO',
    department: 'Security & Infrastructure',
    enrolled: false,
    enrolledAt: null,
    sampleCount: 0,
    embedding: null,
    policy: {
      thresholdAmount: 5000000,
      requireDualApproval: true,
      livenessStrictness: 'high'
    }
  },
  {
    id: 'ceo-1',
    name: 'Chief Executive Officer',
    role: 'CEO',
    department: 'Executive Governance',
    enrolled: false,
    enrolledAt: null,
    sampleCount: 0,
    embedding: null,
    policy: {
      thresholdAmount: 10000000,
      requireDualApproval: true,
      livenessStrictness: 'strict'
    }
  },
  {
    id: 'treasurer-1',
    name: 'Alex Mercer (Treasury Lead)',
    role: 'Senior Treasury Specialist',
    department: 'Clearing & Settlements',
    enrolled: false,
    enrolledAt: null,
    sampleCount: 0,
    embedding: null,
    policy: {
      thresholdAmount: 250000,
      requireDualApproval: false,
      livenessStrictness: 'standard'
    }
  }
];

const DEFAULT_SETTINGS = {
  minWireDualKeyAmount: 1000000,
  faceMatchThreshold: 0.55,
  requireMeetingLiveness: true,
  offlineEnforcementMode: 'strict',
  orgName: 'Arup Global Infrastructure Ltd'
};

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('role', 'role', { unique: false });
        userStore.createIndex('enrolled', 'enrolled', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('auditLogs')) {
        const logStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      await seedInitialDataIfEmpty(dbInstance);
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function seedInitialDataIfEmpty(db) {
  const users = await getAllUsersFromDB(db);
  if (users.length === 0) {
    const tx = db.transaction(['users', 'settings'], 'readwrite');
    const userStore = tx.objectStore('users');
    const settingsStore = tx.objectStore('settings');

    DEFAULT_USERS.forEach((user) => userStore.put(user));
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      settingsStore.put({ key, value });
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }
}

function getAllUsersFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getUsers() {
  const db = await getDB();
  return getAllUsersFromDB(db);
}

export async function getUser(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveUser(user) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const request = store.put(user);
    request.onsuccess = () => resolve(user);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEnrollment(userId, embeddingArray, sampleCount = 5) {
  const user = await getUser(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  // Convert Float32Array to standard array for clean IndexedDB persistence
  const embedding = Array.isArray(embeddingArray) ? embeddingArray : Array.from(embeddingArray);

  user.enrolled = true;
  user.enrolledAt = new Date().toISOString();
  user.sampleCount = sampleCount;
  user.embedding = embedding;

  await saveUser(user);
  await addAuditLog({
    action: 'BIOMETRIC_ENROLLED',
    actor: user.name,
    userId: user.id,
    details: `Biometric template successfully enrolled with ${sampleCount} vector samples.`
  });

  return user;
}

export async function deleteEnrollment(userId) {
  const user = await getUser(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  user.enrolled = false;
  user.enrolledAt = null;
  user.sampleCount = 0;
  user.embedding = null;

  await saveUser(user);
  await addAuditLog({
    action: 'BIOMETRIC_REVOKED',
    actor: user.name,
    userId: user.id,
    details: 'Biometric template revoked and purged from local IndexedDB.'
  });

  return user;
}

export async function resetDatabase() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['users', 'settings', 'auditLogs'], 'readwrite');
    tx.objectStore('users').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('auditLogs').clear();

    DEFAULT_USERS.forEach((u) => tx.objectStore('users').put(u));
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      tx.objectStore('settings').put({ key, value });
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSettings() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.getAll();
    request.onsuccess = () => {
      const map = {};
      (request.result || []).forEach((row) => {
        map[row.key] = row.value;
      });
      resolve({ ...DEFAULT_SETTINGS, ...map });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateSetting(key, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key, value });
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

export async function addAuditLog(entry) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auditLogs', 'readwrite');
    const store = tx.objectStore('auditLogs');
    const record = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    const request = store.add(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export async function getAuditLogs() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auditLogs', 'readonly');
    const store = tx.objectStore('auditLogs');
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result || []).reverse());
    request.onerror = () => reject(request.error);
  });
}

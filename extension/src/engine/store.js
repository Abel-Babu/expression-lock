const DB_NAME = 'ExpressionLockDB';
const DB_VERSION = 1;
const STORE_NAME = 'IdentityStore';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// In a real app, this would use WebCrypto to encrypt/decrypt at rest
export async function saveIdentityTemplate(descriptor) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Overwrite the single 'me' identity
    const request = store.put({ id: 'me', descriptor: Array.from(descriptor) });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadIdentityTemplate() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('me');
    request.onsuccess = () => resolve(request.result ? new Float32Array(request.result.descriptor) : null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearIdentityTemplate() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete('me');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

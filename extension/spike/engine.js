console.log('[Spike] Engine iframe initialized on origin:', window.location.origin);
const status = document.getElementById('status');

async function testSpikes() {
  // Spike 1 & 2: Camera Access in Extension Origin
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById('cam').srcObject = stream;
    status.innerText = 'Camera PASS. Testing WASM...';
    
    // Spike 1: WASM CSP Check
    try {
      const wasmCode = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      const wasmModule = new WebAssembly.Module(wasmCode);
      status.innerText = 'Camera PASS. WASM CSP PASS.';
    } catch (e) {
      status.innerText = 'WASM CSP FAIL: ' + e.message;
    }
  } catch (err) {
    status.innerText = 'Camera FAIL: ' + err.message;
  }
}

testSpikes();

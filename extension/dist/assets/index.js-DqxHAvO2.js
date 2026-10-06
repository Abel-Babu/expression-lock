(function(){class E{constructor(n,i){this.channel=new BroadcastChannel(`expr-lock-${n}`),this.isActive=!0,this.onStateChange=i,this.myTabId=Math.random().toString(36).substring(7),this.channel.onmessage=g=>{const{type:b,tabId:u}=g.data;b==="CLAIM_ACTIVE"&&u!==this.myTabId&&this.isActive&&(this.isActive=!1,this.onStateChange("PASSIVE"))},this.claimActive(),this.interval=setInterval(()=>{this.isActive&&this.claimActive()},5e3)}claimActive(){this.isActive=!0,this.onStateChange("ACTIVE"),this.channel.postMessage({type:"CLAIM_ACTIVE",tabId:this.myTabId})}destroy(){clearInterval(this.interval),this.channel.close()}}let t=null,c="",o,a,s,l,r,p=!1,m="dummy-id";function y(){const e=document.createElement("div");e.id="expression-lock-host",e.style.position="fixed",e.style.top="0",e.style.left="0",e.style.width="100%",e.style.height="100%",e.style.pointerEvents="none",e.style.zIndex="999999",document.body.appendChild(e),t=e.attachShadow({mode:"closed"});const n=document.createElement("style");n.textContent=`
    .panel { pointer-events: auto; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; padding: 16px; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .hidden { display: none !important; }
    button { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px; }
    button:hover { background: #2563eb; }
    .btn-danger { background: #ef4444; }
    #idle-pill { position: fixed; top: 16px; left: 16px; width: auto; padding: 8px 16px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    #host-panel { position: fixed; top: 60px; left: 16px; width: 300px; }
    #participant-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; text-align: center; }
    #challenge-view { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 680px; text-align: center; }
    #results-view { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 500px; }
    
    .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .bg-green { background: #10b981; }
    .bg-red { background: #ef4444; }
    .bg-yellow { background: #f59e0b; }
    .bg-gray { background: #64748b; }
    
    iframe { width: 640px; height: 480px; border: none; border-radius: 8px; background: black; }
  `,t.appendChild(n),o=document.createElement("div"),o.id="idle-pill",o.className="panel",o.innerHTML='<strong>Expression Lock</strong> <span id="ws-badge" class="status-badge bg-gray">Connecting...</span>',o.onclick=()=>{a.classList.contains("hidden")?a.classList.remove("hidden"):a.classList.add("hidden")},t.appendChild(o),a=document.createElement("div"),a.id="host-panel",a.className="panel hidden",a.innerHTML=`
    <h3>Host Panel</h3>
    <button id="btn-claim-host">Claim Host</button>
    <div id="host-controls" class="hidden">
      <button id="btn-start-standard">Start Standard Check (2)</button>
      <button id="btn-start-strict">Start Strict Check (3)</button>
    </div>
    <h4>Participants</h4>
    <div id="participant-list"></div>
  `,t.appendChild(a),s=document.createElement("div"),s.id="participant-card",s.className="panel hidden",s.innerHTML=`
    <h2>Verification Requested</h2>
    <p>The host has requested a biometric verification.</p>
    <button id="btn-begin-attempt">Begin (45s)</button>
  `,t.appendChild(s),l=document.createElement("div"),l.id="challenge-view",l.className="panel hidden",l.innerHTML=`
    <h2 id="cv-title">Get Ready</h2>
    <p id="cv-inst">Looking for face...</p>
    <iframe id="engine-iframe" src="${chrome.runtime.getURL("src/engine/engine.html")}"></iframe>
  `,t.appendChild(l),r=document.createElement("div"),r.id="results-view",r.className="panel hidden",r.innerHTML=`
    <h2>Round Results</h2>
    <div id="rv-list"></div>
    <button id="btn-close-results">Close</button>
  `,t.appendChild(r),f()}function f(){t.getElementById("btn-claim-host").onclick=()=>{d("WS_SEND",{type:"CLAIM_HOST"})},t.getElementById("btn-start-standard").onclick=()=>{d("WS_SEND",{type:"START_ROUND",payload:{type:"STANDARD"}})},t.getElementById("btn-start-strict").onclick=()=>{d("WS_SEND",{type:"START_ROUND",payload:{type:"STRICT"}})},t.getElementById("btn-begin-attempt").onclick=()=>{d("WS_SEND",{type:"BEGIN_ATTEMPT"})},t.getElementById("btn-close-results").onclick=()=>{r.classList.add("hidden")}}function d(e,n){const i=t.getElementById("engine-iframe");i&&i.contentWindow&&i.contentWindow.postMessage({type:e,payload:n},"*")}function T(){const e=window.location.pathname;return e&&e.length>1?e.substring(1).split("?")[0]:"test-meeting"}function h(){c=T(),y();const e=t.getElementById("engine-iframe");e.onload=()=>{chrome.storage.local.get(["serverUrl","memberToken"],n=>{const i=n.serverUrl||"ws://localhost:3000";m=n.memberToken||"dummy-id-"+Math.floor(Math.random()*1e4),d("CONNECT_WS",{url:i,token:m,meetingCode:c})})},new E(c,n=>{n==="PASSIVE"&&(o.innerHTML='<strong>Expression Lock</strong> <span class="status-badge bg-yellow">Passive Tab</span>',d("WS_SEND",{type:"DISCONNECT"}))})}window.addEventListener("message",e=>{if(!e.origin.startsWith("chrome-extension://"))return;const n=e.data;if(n.type==="WS_STATE"){const i=t.getElementById("ws-badge");i.innerText=n.payload,n.payload==="CONNECTED"?i.className="status-badge bg-green":i.className="status-badge bg-red"}n.type==="SERVER_EVENT"&&v(n.payload),n.type==="READINESS_STEP"&&(t.getElementById("cv-title").innerText="Readiness Check",t.getElementById("cv-inst").innerText=n.payload.message),n.type==="COUNTDOWN_START"&&(t.getElementById("cv-title").innerText="Get Ready!",t.getElementById("cv-inst").innerText="Starting in 3..."),n.type==="CHALLENGE_UPDATED"&&(t.getElementById("cv-title").innerText=`Task ${n.payload.index+1} / ${n.payload.total}`,t.getElementById("cv-inst").innerText=n.payload.instructions,t.getElementById("cv-title").style.color="white"),n.type==="EXPRESSION_PASSED"&&(t.getElementById("cv-title").innerText="Success!",t.getElementById("cv-title").style.color="#10b981",t.getElementById("cv-inst").innerText="Extracting Identity...")});function v(e){if(e.type==="MEETING_STATE"){p=e.hostId===m,p?(t.getElementById("btn-claim-host").classList.add("hidden"),t.getElementById("host-controls").classList.remove("hidden")):(t.getElementById("btn-claim-host").classList.remove("hidden"),t.getElementById("host-controls").classList.add("hidden"));const n=t.getElementById("participant-list");n.innerHTML=e.participants.map(i=>`<div>${i} ${i===e.hostId?"(Host)":""}</div>`).join("")}if(e.type==="ROUND_REQUEST"&&(p||s.classList.remove("hidden"),document.visibilityState==="hidden"&&chrome.runtime.sendMessage({type:"SHOW_NOTIFICATION",message:`Verification requested by ${e.hostName}`})),e.type==="ATTEMPT_GRANTED"&&(s.classList.add("hidden"),l.classList.remove("hidden"),d("RUN_ATTEMPT",{challengeCount:2,nonce:e.nonce})),e.type==="ATTEMPT_RESULT"&&(l.classList.add("hidden"),e.status==="RETRYING"?(s.classList.remove("hidden"),s.innerHTML=`
        <h2>Attempt Failed</h2>
        <p>${e.reason}</p>
        <button id="btn-begin-attempt" class="btn-danger">Retry (${e.attemptsLeft} left)</button>
      `,t.getElementById("btn-begin-attempt").onclick=()=>{d("WS_SEND",{type:"BEGIN_ATTEMPT"})}):e.status==="FAILED"?(s.classList.remove("hidden"),s.innerHTML=`
        <h2>Verification Failed</h2>
        <p>No attempts remaining. The host has been notified.</p>
      `,setTimeout(()=>s.classList.add("hidden"),5e3)):e.status==="VERIFIED"&&(s.classList.remove("hidden"),s.innerHTML=`
        <h2 style="color:#10b981">Verified!</h2>
        <p>You may return to the meeting.</p>
      `,setTimeout(()=>s.classList.add("hidden"),3e3))),e.type==="ROUND_RESULTS"){r.classList.remove("hidden");const n=t.getElementById("rv-list");n.innerHTML=e.summary.results.map(i=>`
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span>${i.name}</span>
        <span class="status-badge ${i.status==="VERIFIED"?"bg-green":i.status==="FAILED"?"bg-red":"bg-gray"}">${i.status} (${i.attempts} tries)</span>
      </div>
    `).join("")}if(e.type==="ROUND_PROGRESS"){const n=t.getElementById("participant-list");n.innerHTML=e.progress.map(i=>`
      <div style="display:flex; justify-content:space-between;">
        <span>${i.memberId}</span>
        <span>${i.status}</span>
      </div>
    `).join("")}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",h):h();
})()

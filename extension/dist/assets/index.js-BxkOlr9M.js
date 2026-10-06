(function(){let r=!1;function l(){const e=document.createElement("div");e.id="expression-lock-container",e.style.position="fixed",e.style.top="20px",e.style.right="20px",e.style.width="300px",e.style.height="400px",e.style.zIndex="999999",e.style.display="none",document.body.appendChild(e);const d=e.attachShadow({mode:"closed"}),i=document.createElement("style");i.textContent=`
    .overlay {
      width: 100%;
      height: 100%;
      background: #1e1e1e;
      border: 2px solid #f59e0b;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      color: white;
      font-family: sans-serif;
    }
    .header { padding: 10px; background: #f59e0b; color: black; font-weight: bold; text-align: center; }
    iframe { flex: 1; border: none; }
  `,d.appendChild(i);const n=document.createElement("div");n.className="overlay";const a=document.createElement("div");a.className="header",a.innerText="Verification Check",n.appendChild(a);const o=document.createElement("iframe");return o.src=chrome.runtime.getURL("src/engine/engine.html"),o.allow="camera",n.appendChild(o),d.appendChild(n),{container:e,iframe:o,header:a}}let t=null;chrome.runtime.onMessage.addListener((e,d,i)=>{if(e.type==="TRIGGER_VERIFICATION"){if(r)return;r=!0,t||(t=l()),t.container.style.display="block",t.header.innerText="Verification Check...",t.iframe.contentWindow.postMessage({type:"START_VERIFICATION",payload:{challengeCount:2,nonce:e.nonce}},"*")}});window.addEventListener("message",e=>{e.data&&e.data.type==="VERIFICATION_RESULT"?(r=!1,t&&(t.header.innerText="VERIFIED",t.header.style.background="#10b981",setTimeout(()=>{t.container.style.display="none",t.header.style.background="#f59e0b"},3e3)),chrome.runtime.sendMessage({type:"VERIFICATION_COMPLETE",payload:e.data.payload})):e.data&&e.data.type==="CHALLENGE_UPDATED"&&t&&(t.header.innerText=`Challenge: ${e.data.payload.instructions}`)});
})()

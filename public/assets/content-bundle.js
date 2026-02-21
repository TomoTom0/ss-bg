(function(D){"use strict";function U(e){if(e.id)return`#${e.id}`;const n=e;if(n.name)return`input[name="${n.name}"]`;if(n.type){const o=e.closest("form");if(o){const a=Array.from(o.querySelectorAll(`input[type="${n.type}"]`)).indexOf(e);if(a>=0)return`form input[type="${n.type}"]:nth-of-type(${a+1})`}}const t=e.parentElement;if(t){const s=Array.from(t.children).indexOf(e);return`${t.tagName.toLowerCase()} > :nth-child(${s+1})`}return"input"}function A(e){const n=e.type.toLowerCase();if(n==="password")return"password";if(n==="email")return"email";if(n==="tel")return"tel";const t=e.name.toLowerCase(),o=["user","login","account","id","userid","username","loginid"],s=["email","mail"],a=["phone","tel","mobile"];if(o.some(l=>t.includes(l)))return"username";if(s.some(l=>t.includes(l)))return"email";if(a.some(l=>t.includes(l)))return"tel";const r=e.id.toLowerCase();if(o.some(l=>r.includes(l)))return"username";if(s.some(l=>r.includes(l)))return"email";if(a.some(l=>r.includes(l)))return"tel";const i=e.placeholder.toLowerCase();if(o.some(l=>i.includes(l)))return"username";if(s.some(l=>i.includes(l)))return"email";if(a.some(l=>i.includes(l)))return"tel";const u=e.autocomplete.toLowerCase();return u==="username"?"username":u==="email"?"email":u==="tel"?"tel":n==="text"||n===""?"text":"unknown"}function _(e){const n=Array.from(e.querySelectorAll("input")),t=[];for(const o of n){if(o.offsetParent===null||o.type==="hidden"||o.type==="submit"||o.type==="button")continue;const s=A(o),a=U(o);let r=50;o.type==="password"&&(r=100),o.type==="email"&&(r=90),o.name&&(r+=20),o.id&&(r+=10),t.push({element:o,type:s,confidence:Math.min(r,100),selector:a})}return t}function q(){const e=document.activeElement;return e&&e.tagName==="INPUT"?e:null}function R(e){const n=_(e),t=window.location.href;let o="",s="",a="",r="";const i=[];for(const c of n){const g=c.element.value;if(g)if(c.type==="password"&&!s)s=g,r=c.selector;else if(c.type==="username"&&!o)o=g,a=c.selector;else if(c.type==="email"&&!o)o=g,a=c.selector;else{const p=c.element.name||c.element.placeholder||`フィールド${i.length+1}`;i.push({name:p,value:g,selector:c.selector})}}return{title:new URL(t).hostname,urls:[t],username:o,password:s,usernameSelector:a,passwordSelector:r,additionalFields:i.length>0?i:void 0}}function j(){return Array.from(document.querySelectorAll("form"))}function G(e,n){if(n.length===0)return 0;let t;try{t=new URL(e)}catch{return 0}if(n.includes(e))return 2;for(const o of n)try{const s=new URL(o);if(t.hostname===s.hostname&&t.port===s.port)return 1}catch{continue}return 0}function X(e){const n=e.trim();if(!n)return"";try{const t=new URL(n);let o=t.hostname+t.pathname;return t.port&&!(t.protocol==="http:"&&t.port==="80"||t.protocol==="https:"&&t.port==="443")&&(o=t.hostname+":"+t.port+t.pathname),o.endsWith("/")&&(o=o.slice(0,-1)),o}catch{return n}}let b=null,d=null,f=null,v=null,S=null,F=[];const L="ss-bg-highlight-target";function Y(){V(),oe(),se(),K()}function V(){if(document.getElementById("ss-bg-highlight-styles"))return;const e=document.createElement("style");e.id="ss-bg-highlight-styles",e.textContent=`
    .${L} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `,document.head.appendChild(e)}function K(){document.addEventListener("keydown",e=>{e.key==="Escape"&&f&&h()}),document.addEventListener("focusin",e=>{const n=e.target;(n.tagName==="INPUT"||n.tagName==="TEXTAREA")&&(v&&v.contains(n)||(b=n))})}function J(e){const s=window.innerWidth,a=window.innerHeight;return s-e.right>=360?{left:e.right+10,top:Math.max(10,Math.min(e.top,a-300-10))}:e.left>=360?{left:e.left-350-10,top:Math.max(10,Math.min(e.top,a-300-10))}:a-e.bottom>=310?{left:Math.max(10,Math.min(e.left,s-350-10)),top:e.bottom+10}:{left:Math.max(10,Math.min(e.left,s-350-10)),top:Math.max(10,e.top-300-10)}}async function P(e,n){if(f)return;const t=b||document.activeElement;if(!t||t.tagName!=="INPUT"&&t.tagName!=="TEXTAREA"){const l=document.querySelector('input[type="password"], input[type="text"], input[type="email"]');if(!l)return;b=l}const o=(b||t).getBoundingClientRect(),s=J(o);f=document.createElement("div"),f.id="ss-bg-dialog-host",f.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,v=f.attachShadow({mode:"closed"});const a=document.createElement("style");a.textContent=`
    .ss-bg-dialog-content {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(2px);
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      max-width: 350px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
    }
    .ss-bg-empty-message {
      color: #999;
      text-align: center;
      padding: 12px;
      font-size: 13px;
    }
    .ss-bg-password-item {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
    }
    .ss-bg-password-item:hover {
      background: #f0f0f0;
    }
    .ss-bg-item-title {
      font-weight: 600;
      margin-bottom: 2px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-item-username {
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-cancel-btn {
      width: 100%;
      padding: 6px;
      margin-top: 4px;
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
    }
    .ss-bg-cancel-btn:hover {
      background: #e0e0e0;
    }
    .ss-bg-field-button {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-field-button:hover {
      background: #f0f0f0;
    }
    .ss-bg-instruction {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      font-size: 12px;
      color: #666;
      background: #f9f9f9;
      border-radius: 2px;
    }
    .ss-bg-fields-container {
      margin-bottom: 8px;
    }
    .ss-bg-field-row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
    }
    .ss-bg-name-input {
      flex: 1;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-value-input {
      flex: 2;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-selector-input {
      flex: 3;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 12px;
    }
    .ss-bg-remove-btn {
      padding: 4px 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    .ss-bg-remove-btn:hover {
      background: #d32f2f;
    }
    .ss-bg-save-btn {
      width: 100%;
      padding: 8px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }
    .ss-bg-save-btn:hover {
      background: #45a049;
    }
    .ss-bg-back-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: #666;
    }
    .ss-bg-back-btn:hover {
      background: #e0e0e0;
    }
    .ss-bg-title-bar {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ss-bg-title-text {
      font-weight: 600;
      font-size: 13px;
      color: #333;
    }
    .ss-bg-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #999;
      padding: 0 4px;
      line-height: 1;
    }
    .ss-bg-close-btn:hover {
      color: #333;
    }
  `,v.appendChild(a),d=document.createElement("div"),d.className="ss-bg-dialog-content",d.style.cssText=`
    position: absolute;
    top: ${s.top}px;
    left: ${s.left}px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(2px);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    width: 250px;
    max-width: 350px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
  `;const r=I("パスワードを選択",()=>h());if(d.appendChild(r),e.length===0){const l=document.createElement("div");l.textContent="候補が見つかりません",l.className="ss-bg-empty-message",d.appendChild(l)}else e.forEach(l=>{const c=document.createElement("button");c.className="ss-bg-password-item";const g=document.createElement("div");g.textContent=l.title,g.className="ss-bg-item-title";const p=document.createElement("div");p.textContent=l.username,p.className="ss-bg-item-username",c.appendChild(g),c.appendChild(p),c.addEventListener("click",async()=>{B(l)}),d.appendChild(c)});const i=document.createElement("button");i.textContent="キャンセル",i.className="ss-bg-cancel-btn",i.addEventListener("click",h),d.appendChild(i),v.appendChild(d),document.body.appendChild(f),document.body.classList.add("ss-bg-dialog-active");const u=new MutationObserver(()=>{f&&document.body.contains(f)});u.observe(document.body,{childList:!0}),setTimeout(()=>u.disconnect(),1e4)}function Q(e,n){if(!d)return;d.innerHTML="";const t=I(e.title,()=>h());d.appendChild(t);const o=document.createElement("div");o.textContent="追加フィールドを編集",o.className="ss-bg-instruction",d.appendChild(o);const s=document.createElement("div");s.className="ss-bg-fields-container",s.style.maxHeight="250px",s.style.overflowY="auto";const a=e.additionalFields||[],r=[];a.forEach((c,g)=>{const p=document.createElement("div");p.className="ss-bg-field-row",p.style.padding="8px",p.style.marginBottom="8px",p.style.background="#f9f9f9",p.style.borderRadius="4px";const m=document.createElement("input");m.type="text",m.value=c.name,m.placeholder="フィールド名",m.className="ss-bg-name-input";const x=document.createElement("input");x.type="text",x.value=c.value,x.placeholder="値",x.className="ss-bg-value-input";const w=document.createElement("input");w.type="text",w.value=c.selector||"",w.placeholder="セレクタ（省略可）",w.className="ss-bg-selector-input";const y=document.createElement("button");y.textContent="削除",y.className="ss-bg-remove-btn",y.style.alignSelf="flex-start",y.addEventListener("click",()=>{p.remove();const W=r.findIndex(le=>le.nameInput===m);W!==-1&&r.splice(W,1)}),p.appendChild(m),p.appendChild(x),p.appendChild(w),p.appendChild(y),s.appendChild(p),r.push({nameInput:m,valueInput:x,selectorInput:w})}),d.appendChild(s);const i=E("+ フィールドを追加",()=>{const c=document.createElement("div");c.className="ss-bg-field-row",c.style.padding="8px",c.style.marginBottom="8px",c.style.background="#f9f9f9",c.style.borderRadius="4px";const g=document.createElement("input");g.type="text",g.placeholder="フィールド名",g.className="ss-bg-name-input";const p=document.createElement("input");p.type="text",p.placeholder="値",p.className="ss-bg-value-input";const m=document.createElement("input");m.type="text",m.placeholder="セレクタ（省略可）",m.className="ss-bg-selector-input";const x=document.createElement("button");x.textContent="削除",x.className="ss-bg-remove-btn",x.style.alignSelf="flex-start",x.addEventListener("click",()=>{c.remove();const w=r.findIndex(y=>y.nameInput===g);w!==-1&&r.splice(w,1)}),c.appendChild(g),c.appendChild(p),c.appendChild(m),c.appendChild(x),s.appendChild(c),r.push({nameInput:g,valueInput:p,selectorInput:m})});i.style.background="#e3f2fd",i.style.color="#1976d2",d.appendChild(i);const u=document.createElement("button");u.textContent="保存",u.className="ss-bg-save-btn",u.addEventListener("click",async()=>{const c=r.map(m=>({name:m.nameInput.value.trim(),value:m.valueInput.value.trim(),selector:m.selectorInput.value.trim()})).filter(m=>m.name&&m.value),g={...e,additionalFields:c.length>0?c:void 0,updatedAt:Date.now()},p=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:g});if(p.success)B(g);else{const m=document.createElement("div");m.textContent="保存に失敗しました: "+(p.error||"不明なエラー"),m.style.cssText=`
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `,d.appendChild(m),setTimeout(()=>{m.remove()},3e3)}}),d.appendChild(u);const l=E("戻る",()=>{B(e)});l.className="ss-bg-back-btn",d.appendChild(l)}function I(e,n){const t=document.createElement("div");t.className="ss-bg-title-bar";const o=document.createElement("div");o.textContent=e,o.className="ss-bg-title-text";const s=document.createElement("button");return s.textContent="×",s.className="ss-bg-close-btn",s.addEventListener("click",a=>{a.stopPropagation(),n()}),t.appendChild(o),t.appendChild(s),Z(t,s),t}function Z(e,n){let t=!1,o=0,s=0,a=0,r=0;e.addEventListener("mousedown",i=>{if(i.target===n)return;t=!0,o=i.clientX,s=i.clientY;const u=d.getBoundingClientRect();a=u.left,r=u.top,i.preventDefault()}),document.addEventListener("mousemove",i=>{if(t&&d){const u=i.clientX-o,l=i.clientY-s;d.style.left=`${a+u}px`,d.style.top=`${r+l}px`}}),document.addEventListener("mouseup",()=>{t=!1})}function B(e,n){if(!d)return;d.innerHTML="";const t=I(e.title,()=>h());d.appendChild(t);const o=document.createElement("div");o.textContent="入力する項目を選択",o.className="ss-bg-instruction",d.appendChild(o);const s=E("✏️ フィールドを編集...",()=>{Q(e)});s.style.background="#fff3e0",s.style.color="#e65100",s.style.marginBottom="12px",d.appendChild(s);const a=E("すべて入力 (ユーザー名 + パスワード)",()=>{O(e),h()});if(a.addEventListener("mouseenter",()=>{te()}),a.addEventListener("mouseleave",()=>{k()}),d.appendChild(a),e.username){const i=E(`ユーザー名: ${e.username}`,()=>{N({value:e.username})});i.addEventListener("mouseenter",()=>{b&&C(b)}),i.addEventListener("mouseleave",()=>{k()}),d.appendChild(i)}if(e.password){const i=E("パスワード: ••••••••",()=>{N({value:e.password})});i.addEventListener("mouseenter",()=>{b&&C(b)}),i.addEventListener("mouseleave",()=>{k()}),d.appendChild(i)}e.additionalFields&&e.additionalFields.forEach(i=>{const u=E(`${i.name}: ${i.value}`,()=>{N({value:i.value})});u.addEventListener("mouseenter",()=>{b&&C(b)}),u.addEventListener("mouseleave",()=>{k()}),d.appendChild(u)});const r=document.createElement("button");r.textContent="戻る",r.className="ss-bg-back-btn",r.addEventListener("click",async()=>{const i=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(i.success&&i.data){const u=b;h(),b=u,await P(i.data)}else console.error("[SS-BG] Failed to get passwords for back button:",i.error),h()}),d.appendChild(r),b&&C(b)}function E(e,n){const t=document.createElement("button");return t.textContent=e,t.className="ss-bg-field-button",t.addEventListener("click",n),t}function h(){f&&f.parentNode&&f.parentNode.removeChild(f),document.body.classList.remove("ss-bg-dialog-active"),k(),d=null,f=null,v=null,S&&typeof S.focus=="function"&&(S.focus(),S=null)}function ee(e){e.classList.add(L)}function C(e){ee(e);const n=e.getBoundingClientRect(),t=document.createElement("div");t.style.cssText=`
    position: fixed;
    top: ${n.top}px;
    left: ${n.left}px;
    width: ${n.width}px;
    height: ${n.height}px;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
    background: rgba(76, 175, 80, 0.1);
  `,document.body.appendChild(t),F.push(t)}function te(e){k();const n=b?.closest("form")||document.querySelector("form");if(!n)return;const t=Array.from(n.querySelectorAll("input")),o=t.find(s=>s.type==="password"&&s.offsetParent!==null);if(o){C(o);const s=t.indexOf(o);for(let a=s-1;a>=0;a--){const r=t[a],i=A(r);if((i==="username"||i==="email"||i==="text")&&r.offsetParent!==null){C(r);break}}}}function k(){F.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),F=[],document.querySelectorAll(`.${L}`).forEach(e=>{e.classList.remove(L)})}function T(){f&&h()}function M(e){f=document.createElement("div"),f.id=e,f.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,v=f.attachShadow({mode:"closed"})}function $(e,n){const t=document.createElement("style");t.textContent=e,v.appendChild(t),v.appendChild(n),document.body.appendChild(f),S=document.activeElement;const o='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',s=n.querySelector(o);s&&s.focus();const a=n.querySelectorAll(o),r=a[0],i=a[a.length-1],u=l=>{l.key==="Tab"&&(l.shiftKey?document.activeElement===r&&(l.preventDefault(),i.focus()):document.activeElement===i&&(l.preventDefault(),r.focus()))};n.addEventListener("keydown",u)}function z(e){T(),M("ss-bg-error-dialog-host");const n=document.createElement("div");n.className="ss-bg-error-dialog-content",n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true");const t=document.createElement("div");t.className="ss-bg-error-title",t.id="ss-bg-error-dialog-title",t.textContent="エラー",n.setAttribute("aria-labelledby","ss-bg-error-dialog-title");const o=document.createElement("div");o.className="ss-bg-error-message",o.textContent=e;const s=document.createElement("button");s.className="ss-bg-error-close-btn",s.textContent="閉じる",s.onclick=h,n.appendChild(t),n.appendChild(o),n.appendChild(s),$(`
    .ss-bg-error-dialog-content {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      padding: 16px;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    }
    .ss-bg-error-title {
      color: #d32f2f;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .ss-bg-error-message {
      color: #333;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .ss-bg-error-close-btn {
      width: 100%;
      padding: 8px;
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: #333;
    }
    .ss-bg-error-close-btn:hover {
      background: #e0e0e0;
    }
  `,n)}function ne(e){return new Promise(n=>{T(),M("ss-bg-confirm-dialog-host");const t=document.createElement("div");t.className="ss-bg-confirm-dialog-content",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true");const o=document.createElement("div");o.className="ss-bg-confirm-title",o.id="ss-bg-confirm-dialog-title",o.textContent="確認",t.setAttribute("aria-labelledby","ss-bg-confirm-dialog-title");const s=document.createElement("div");s.className="ss-bg-confirm-message",s.textContent=e;const a=document.createElement("div");a.className="ss-bg-confirm-buttons";const r=document.createElement("button");r.className="ss-bg-confirm-btn ss-bg-confirm-cancel",r.textContent="キャンセル",r.onclick=()=>{h(),n(!1)};const i=document.createElement("button");i.className="ss-bg-confirm-btn ss-bg-confirm-ok",i.textContent="OK",i.onclick=()=>{h(),n(!0)},a.appendChild(r),a.appendChild(i),t.appendChild(o),t.appendChild(s),t.appendChild(a),$(`
      .ss-bg-confirm-dialog-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 16px;
        min-width: 300px;
        max-width: 450px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        pointer-events: auto;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      }
      .ss-bg-confirm-title {
        font-weight: 600;
        margin-bottom: 12px;
        font-size: 16px;
        color: #333;
      }
      .ss-bg-confirm-message {
        color: #333;
        line-height: 1.6;
        margin-bottom: 16px;
        white-space: pre-wrap;
      }
      .ss-bg-confirm-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .ss-bg-confirm-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: 13px;
      }
      .ss-bg-confirm-cancel {
        background: #f5f5f5;
        color: #333;
      }
      .ss-bg-confirm-cancel:hover {
        background: #e0e0e0;
      }
      .ss-bg-confirm-ok {
        background: #4CAF50;
        color: white;
      }
      .ss-bg-confirm-ok:hover {
        background: #45a049;
      }
    `,t)})}function oe(){document.addEventListener("contextmenu",e=>{const n=e.target;n.tagName==="INPUT"&&(b=n)})}function se(){chrome.runtime.onMessage.addListener((e,n,t)=>e.type==="PING"?(t({pong:!0}),!0):e.type==="FILL_PASSWORD"?(O(e.payload),t({success:!0}),!0):e.type==="FILL_FIELD"?(N(e.payload),t({success:!0}),!0):e.type==="SAVE_CURRENT_FORM"?(re(),t({success:!0}),!0):e.type==="SHOW_PASSWORD_DIALOG"?(P(e.payload.candidates,e.payload.tabId).then(()=>{t({success:!0})}).catch(o=>{t({success:!1,error:o.message})}),!0):!1)}async function O(e){if(!b?.closest("form")){z("対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。");return}if(e.usernameSelector&&e.username){const t=document.querySelector(e.usernameSelector);t&&(t.value=e.username,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})))}if(e.passwordSelector&&e.password){const t=document.querySelector(e.passwordSelector);t&&(t.value=e.password,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})))}if(e.additionalFields){for(const t of e.additionalFields)if(t.selector){const o=document.querySelector(t.selector);o&&(o.value=t.value,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})))}}(!e.usernameSelector||!e.passwordSelector)&&await ie(e),await ae(e)}async function ie(e){const n=b?.closest("form")||document.querySelector("form");if(!n)return;const t=Array.from(n.querySelectorAll("input")),o=t.find(s=>s.type==="password"&&s.offsetParent!==null);if(o&&e.password){o.value=e.password,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0}));const s=t.indexOf(o);for(let a=s-1;a>=0;a--){const r=t[a],i=A(r);if((i==="username"||i==="email"||i==="text")&&r.offsetParent!==null&&e.username){r.value=e.username,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0}));break}}}}async function N(e){const n=q()||b;n&&(n.value=e.value,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})))}async function re(){const e=j();if(e.length===0){z("フォームが見つかりません");return}const n=R(e[0]);if(!n.password){z("パスワードフィールドが見つかりませんでした");return}await chrome.storage.session.set({capturedFormData:n}),chrome.runtime.sendMessage({type:"OPEN_OPTIONS_WITH_FORM_DATA"})}async function ae(e){const n=window.location.href,t=X(n);if(G(n,e.urls)>0||!await ne(`このサイト (${t}) は「${e.title}」の登録URLに含まれていません。

URLを追加しますか？`))return;const a={...e,urls:[...e.urls,t],updatedAt:Date.now()};try{(await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:a})).success}catch(r){console.error("[SS-BG] Error adding URL:",r)}}function H(){console.log("[bg-ss] Content script injected and initialized");try{Y(),console.log("[bg-ss] Content script initialization complete")}catch(e){console.error("[bg-ss] Content script initialization failed:",e)}}console.log("[bg-ss] content-exports.js loaded"),H(),D.main=H,Object.defineProperty(D,Symbol.toStringTag,{value:"Module"})})(this.ContentScript=this.ContentScript||{});

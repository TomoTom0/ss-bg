(function(q){"use strict";function z(e){if(e.id)return`#${e.id}`;const r=e;if(r.name)return`input[name="${r.name}"]`;if(r.type){const o=e.closest("form");if(o){const s=Array.from(o.querySelectorAll(`input[type="${r.type}"]`)).indexOf(e);if(s>=0)return`form input[type="${r.type}"]:nth-of-type(${s+1})`}}const t=e.parentElement;if(t){const n=Array.from(t.children).indexOf(e);return`${t.tagName.toLowerCase()} > :nth-child(${n+1})`}return"input"}function $(e){const r=e.type.toLowerCase();if(r==="password")return"password";if(r==="email")return"email";if(r==="tel")return"tel";const t=e.name.toLowerCase(),o=["user","login","account","id","userid","username","loginid"],n=["email","mail"],s=["phone","tel","mobile"];if(o.some(c=>t.includes(c)))return"username";if(n.some(c=>t.includes(c)))return"email";if(s.some(c=>t.includes(c)))return"tel";const a=e.id.toLowerCase();if(o.some(c=>a.includes(c)))return"username";if(n.some(c=>a.includes(c)))return"email";if(s.some(c=>a.includes(c)))return"tel";const i=e.placeholder.toLowerCase();if(o.some(c=>i.includes(c)))return"username";if(n.some(c=>i.includes(c)))return"email";if(s.some(c=>i.includes(c)))return"tel";const p=e.autocomplete.toLowerCase();return p==="username"?"username":p==="email"?"email":p==="tel"?"tel":r==="text"||r===""?"text":"unknown"}function J(e){const r=Array.from(e.querySelectorAll("input")),t=[];for(const o of r){if(o.offsetParent===null||o.type==="hidden"||o.type==="submit"||o.type==="button")continue;const n=$(o),s=z(o);let a=50;o.type==="password"&&(a=100),o.type==="email"&&(a=90),o.name&&(a+=20),o.id&&(a+=10),t.push({element:o,type:n,confidence:Math.min(a,100),selector:s})}return t}function Q(){const e=document.activeElement;return e&&e.tagName==="INPUT"?e:null}function Z(e){const r=J(e),t=window.location.href;let o="",n="",s="",a="";const i=[];for(const m of r){const h=m.element.value;if(h)if(m.type==="password"&&!n)n=h,a=m.selector;else if(m.type==="username"&&!o)o=h,s=m.selector;else if(m.type==="email"&&!o)o=h,s=m.selector;else{const f=m.element.name||m.element.placeholder||`フィールド${i.length+1}`;i.push({name:f,value:h,selector:m.selector})}}return{title:new URL(t).hostname,urls:[t],username:o,password:n,usernameSelector:s,passwordSelector:a,additionalFields:i.length>0?i:void 0}}function ee(){return Array.from(document.querySelectorAll("form"))}function te(e,r){if(r.length===0)return 0;let t;try{t=new URL(e)}catch{return 0}if(r.includes(e))return 2;for(const o of r)try{const n=new URL(o);if(t.hostname===n.hostname&&t.port===n.port)return 1}catch{continue}return 0}function oe(e){const r=e.trim();if(!r)return"";try{const t=new URL(r);let o=t.hostname+t.pathname;return t.port&&!(t.protocol==="http:"&&t.port==="80"||t.protocol==="https:"&&t.port==="443")&&(o=t.hostname+":"+t.port+t.pathname),o.endsWith("/")&&(o=o.slice(0,-1)),o}catch{return r}}let x=null,l=null,y=null,S=null,B=null,O=[];const P="ss-bg-highlight-target";let C=null;async function re(){try{return(await chrome.storage.local.get("settings")).settings?.theme||"auto"}catch{return"auto"}}async function _(){const e=await re();return e==="light"?!1:e==="dark"?!0:window.matchMedia("(prefers-color-scheme: dark)").matches}function ne(){se(),ge(),ve(),ae()}function se(){if(document.getElementById("ss-bg-highlight-styles"))return;const e=document.createElement("style");e.id="ss-bg-highlight-styles",e.textContent=`
    .${P} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `,document.head.appendChild(e)}function ae(){document.addEventListener("keydown",e=>{e.key==="Escape"&&y&&w()}),document.addEventListener("focusin",e=>{const r=e.target;(r.tagName==="INPUT"||r.tagName==="TEXTAREA")&&(S&&S.contains(r)||(x=r))})}function ie(e){const n=window.innerWidth,s=window.innerHeight;return n-e.right>=360?{left:e.right+10,top:Math.max(10,Math.min(e.top,s-300-10))}:e.left>=360?{left:e.left-350-10,top:Math.max(10,Math.min(e.top,s-300-10))}:s-e.bottom>=310?{left:Math.max(10,Math.min(e.left,n-350-10)),top:e.bottom+10}:{left:Math.max(10,Math.min(e.left,n-350-10)),top:Math.max(10,e.top-300-10)}}function j(){return`
    :host {
      --color-bg-primary: #ffffff;
      --color-bg-secondary: #f9f9f9;
      --color-bg-tertiary: #f5f5f5;
      --color-bg-elevated: #ffffff;
      --color-bg-input: #ffffff;
      --color-text-primary: #333333;
      --color-text-secondary: #666666;
      --color-text-tertiary: #999999;
      --color-border-light: #eeeeee;
      --color-border-medium: #cccccc;
      --color-btn-primary: #4CAF50;
      --color-btn-primary-hover: #45a049;
      --color-btn-danger: #f44336;
      --color-btn-danger-hover: #d32f2f;
      --color-btn-default: #f5f5f5;
      --color-btn-default-hover: #e0e0e0;
      --color-dialog-bg: rgba(255, 255, 255, 0.95);
      --color-dialog-text: #333333;
      --color-dialog-border: #cccccc;
      --color-success-bg: #e8f5e9;
      --color-success-text: #2e7d32;
      --color-favorite-bg: #FFF8E1;
      --color-favorite-border: #FFB300;
      --color-favorite-text: #E65100;
      --color-favorite-hover-bg: #FFFDE7;
      --color-focus-ring: #4CAF50;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --color-bg-primary: #1e1e1e;
        --color-bg-secondary: #2d2d2d;
        --color-bg-tertiary: #252525;
        --color-bg-elevated: #333333;
        --color-bg-input: #2d2d2d;
        --color-text-primary: #e0e0e0;
        --color-text-secondary: #b0b0b0;
        --color-text-tertiary: #888888;
        --color-border-light: #333333;
        --color-border-medium: #444444;
        --color-btn-primary: #4CAF50;
        --color-btn-primary-hover: #66bb6a;
        --color-btn-danger: #f44336;
        --color-btn-danger-hover: #ef5350;
        --color-btn-default: #424242;
        --color-btn-default-hover: #616161;
        --color-dialog-bg: rgba(30, 30, 30, 0.95);
        --color-dialog-text: #e0e0e0;
        --color-dialog-border: #444444;
        --color-success-bg: #1b5e20;
        --color-success-text: #a5d6a7;
        --color-favorite-bg: #4e342e;
        --color-favorite-border: #FFB300;
        --color-favorite-text: #ffb74d;
        --color-favorite-hover-bg: #3e2723;
        --color-focus-ring: #4CAF50;
      }
    }

    .ss-bg-dialog-content {
      background: var(--color-dialog-bg);
      color: var(--color-dialog-text);
      backdrop-filter: blur(2px);
      border: 1px solid var(--color-dialog-border);
      border-radius: 4px;
      padding: 8px;
      max-width: 350px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      pointer-events: auto;
    }
    .ss-bg-empty-message {
      color: var(--color-text-tertiary);
      text-align: center;
      padding: 12px;
      font-size: 13px;
    }
    .ss-bg-password-item {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
    }
    .ss-bg-password-item:hover {
      background: var(--color-bg-tertiary);
    }
    .ss-bg-item-title {
      font-weight: 600;
      margin-bottom: 2px;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-item-username {
      font-size: 12px;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-cancel-btn {
      width: 100%;
      padding: 6px;
      margin-top: 4px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .ss-bg-cancel-btn:hover {
      background: var(--color-btn-default-hover);
    }
    .ss-bg-field-button {
      display: block;
      width: 100%;
      padding: 8px;
      margin-bottom: 2px;
      background: var(--color-bg-elevated);
      color: var(--color-text-primary);
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
      background: var(--color-bg-tertiary);
    }
    .ss-bg-instruction {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      font-size: 12px;
      color: var(--color-text-secondary);
      background: var(--color-bg-secondary);
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
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-value-input {
      flex: 2;
      padding: 4px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-selector-input {
      flex: 3;
      padding: 4px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 12px;
      background: var(--color-bg-input);
    }
    .ss-bg-remove-btn {
      padding: 4px 8px;
      background: var(--color-btn-danger);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    .ss-bg-remove-btn:hover {
      background: var(--color-btn-danger-hover);
    }
    .ss-bg-save-btn {
      width: 100%;
      padding: 8px;
      background: var(--color-btn-primary);
      color: var(--color-text-primary);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
    }
    .ss-bg-save-btn:hover {
      background: var(--color-btn-primary-hover);
    }
    .ss-bg-back-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: var(--color-text-secondary);
    }
    .ss-bg-back-btn:hover {
      background: var(--color-btn-default-hover);
    }
    .ss-bg-title-bar {
      margin: 0 0 8px 0;
      padding: 4px 8px;
      border-bottom: 1px solid var(--color-border-light);
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ss-bg-title-text {
      font-weight: 600;
      font-size: 13px;
      color: var(--color-text-primary);
    }
    .ss-bg-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: var(--color-text-tertiary);
      padding: 0 4px;
      line-height: 1;
    }
    .ss-bg-close-btn:hover {
      color: var(--color-text-primary);
    }
    .ss-bg-favorite-bar {
      display: flex;
      gap: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--color-border-light);
    }
    .ss-bg-favorite-star {
      width: 28px;
      height: 28px;
      background: none;
      border: 1px solid var(--color-border-medium);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
      color: var(--color-text-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-favorite-star:hover {
      border-color: var(--color-favorite-border);
      color: var(--color-favorite-border);
      background: var(--color-favorite-hover-bg);
    }
    .ss-bg-favorite-star.active {
      border-color: var(--color-favorite-border);
      background: var(--color-favorite-bg);
      color: var(--color-favorite-text);
    }
    .ss-bg-favorite-star.registered {
      border-color: var(--color-favorite-border);
      color: var(--color-favorite-border);
    }
    .ss-bg-favorite-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
      align-self: center;
      margin-left: 4px;
    }
    .ss-bg-favorite-register-indicator {
      padding: 4px 8px;
      margin-bottom: 4px;
      background: var(--color-favorite-bg);
      border: 1px solid var(--color-favorite-border);
      border-radius: 2px;
      font-size: 11px;
      color: var(--color-favorite-text);
      text-align: center;
    }
    .ss-bg-form-group {
      margin-bottom: 8px;
    }
    .ss-bg-form-label {
      display: block;
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }
    .ss-bg-form-input {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 13px;
      box-sizing: border-box;
      background: var(--color-bg-input);
    }
    .ss-bg-form-input:focus {
      outline: none;
      border-color: var(--color-focus-ring);
    }
    .ss-bg-form-textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid var(--color-border-medium);
      border-radius: 2px;
      color: var(--color-text-primary);
      font-size: 13px;
      box-sizing: border-box;
      resize: vertical;
      min-height: 40px;
      background: var(--color-bg-input);
    }
    .ss-bg-form-textarea:focus {
      outline: none;
      border-color: var(--color-focus-ring);
    }
    .ss-bg-password-item-row {
      display: flex;
      gap: 2px;
      margin-bottom: 2px;
      align-items: stretch;
    }
    .ss-bg-password-item-row .ss-bg-password-item {
      flex: 1;
      margin-bottom: 0;
    }
    .ss-bg-edit-btn {
      width: 32px;
      min-width: 32px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-edit-btn:hover {
      background: var(--color-btn-default-hover);
      color: var(--color-text-primary);
    }
    .ss-bg-success-message {
      color: var(--color-success-text);
      background: var(--color-success-bg);
      padding: 8px;
      border-radius: 2px;
      margin-top: 4px;
      font-size: 12px;
      text-align: center;
    }
  `}async function U(e,r){if(y)return;const t=x||document.activeElement;if(!t||t.tagName!=="INPUT"&&t.tagName!=="TEXTAREA"){const b=document.querySelector('input[type="password"], input[type="text"], input[type="email"]');if(!b)return;x=b}const o=(x||t).getBoundingClientRect(),n=ie(o);y=document.createElement("div"),y.id="ss-bg-dialog-host",y.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,S=y.attachShadow({mode:"closed"});const s=document.createElement("style");s.textContent=j(),S.appendChild(s),l=document.createElement("div"),l.className="ss-bg-dialog-content";const a=await _(),i=a?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",p=a?"#e0e0e0":"#333333",c=a?"#444444":"#cccccc";l.style.cssText=`
    position: absolute;
    top: ${n.top}px;
    left: ${n.left}px;
    background: ${i};
    color: ${p};
    backdrop-filter: blur(2px);
    border: 1px solid ${c};
    border-radius: 4px;
    padding: 8px;
    width: 250px;
    max-width: 350px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
  `;const m=T("パスワードを選択",()=>w());l.appendChild(m);const h=await le();if(l.appendChild(h),C!==null){const b=document.createElement("div");b.className="ss-bg-favorite-register-indicator",b.textContent=`お気に入り ${C} に登録します`,l.appendChild(b)}if(e.length===0){const b=document.createElement("div");b.textContent="候補が見つかりません",b.className="ss-bg-empty-message",l.appendChild(b)}else e.forEach(b=>{const v=document.createElement("div");v.className="ss-bg-password-item-row";const g=document.createElement("button");g.className="ss-bg-password-item";const E=document.createElement("div");E.textContent=b.title,E.className="ss-bg-item-title";const u=document.createElement("div");u.textContent=b.username,u.className="ss-bg-item-username",g.appendChild(E),g.appendChild(u),g.addEventListener("click",async()=>{D(b)});const k=document.createElement("button");k.className="ss-bg-edit-btn",k.textContent="✎",k.title="編集",k.addEventListener("click",L=>{L.stopPropagation(),we(b)}),v.appendChild(g),v.appendChild(k),l.appendChild(v)});const f=document.createElement("button");f.textContent="キャンセル",f.className="ss-bg-cancel-btn",f.addEventListener("click",w),l.appendChild(f),S.appendChild(l),document.body.appendChild(y),document.body.classList.add("ss-bg-dialog-active");const d=new MutationObserver(()=>{y&&document.body.contains(y)});d.observe(document.body,{childList:!0}),setTimeout(()=>d.disconnect(),1e4)}async function le(){const e=document.createElement("div");e.className="ss-bg-favorite-bar";const r=document.createElement("span");r.className="ss-bg-favorite-label",r.textContent="お気に入り:",e.appendChild(r);const t=window.location.hostname;let o=[];try{const n=await chrome.runtime.sendMessage({type:"GET_FAVORITES",payload:{domain:t}});n.success&&Array.isArray(n.data)&&(o=n.data.map(s=>s.slot))}catch{}for(let n=1;n<=3;n++){const s=n,a=document.createElement("button");a.className="ss-bg-favorite-star",o.includes(s)&&a.classList.add("registered"),C===s&&a.classList.add("active"),a.textContent=`${s}`,a.title=o.includes(s)?`お気に入り ${s} (登録済み) - クリックで登録モード切替`:`お気に入り ${s} - クリックで登録モード`,a.addEventListener("click",i=>{i.stopPropagation(),C===s?C=null:C=s,e.querySelectorAll(".ss-bg-favorite-star").forEach((c,m)=>{c.classList.toggle("active",m+1===C)}),ce()}),e.appendChild(a)}return e}function ce(){if(!l||!S)return;const e=l.querySelector(".ss-bg-favorite-register-indicator");if(e&&e.remove(),C!==null){const r=document.createElement("div");r.className="ss-bg-favorite-register-indicator",r.textContent=`お気に入り ${C} に登録します`;const t=l.querySelector(".ss-bg-favorite-bar");t&&t.nextSibling?l.insertBefore(r,t.nextSibling):l.appendChild(r)}}async function X(e,r,t){const o=window.location.hostname;try{return(await chrome.runtime.sendMessage({type:"SAVE_FAVORITE",payload:{slot:e,domain:o,entryId:r.id,mappings:t,createdAt:Date.now()}})).success}catch{return!1}}function de(e,r){for(const t of r){const o=document.querySelector(t.selector);if(!o)continue;let n;if(t.source==="username")n=e.username;else if(t.source==="password")n=e.password;else if(t.source.startsWith("additional:")){const s=parseInt(t.source.split(":")[1],10);n=e.additionalFields?.[s]?.value}n!==void 0&&(o.value=n,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})))}}function ue(e,r){if(!l)return;l.innerHTML="";const t=T(e.title,()=>w());l.appendChild(t);const o=document.createElement("div");o.textContent="追加フィールドを編集",o.className="ss-bg-instruction",l.appendChild(o);const n=document.createElement("div");n.className="ss-bg-fields-container",n.style.maxHeight="250px",n.style.overflowY="auto";const s=e.additionalFields||[],a=[];s.forEach((m,h)=>{const f=document.createElement("div");f.className="ss-bg-field-row",f.style.padding="8px",f.style.marginBottom="8px",f.style.background="#f9f9f9",f.style.borderRadius="4px";const d=document.createElement("input");d.type="text",d.value=m.name,d.placeholder="フィールド名",d.className="ss-bg-name-input";const b=document.createElement("input");b.type="text",b.value=m.value,b.placeholder="値",b.className="ss-bg-value-input";const v=document.createElement("input");v.type="text",v.value=m.selector||"",v.placeholder="セレクタ（省略可）",v.className="ss-bg-selector-input";const g=document.createElement("button");g.textContent="削除",g.className="ss-bg-remove-btn",g.style.alignSelf="flex-start",g.addEventListener("click",()=>{f.remove();const E=a.findIndex(u=>u.nameInput===d);E!==-1&&a.splice(E,1)}),f.appendChild(d),f.appendChild(b),f.appendChild(v),f.appendChild(g),n.appendChild(f),a.push({nameInput:d,valueInput:b,selectorInput:v})}),l.appendChild(n);const i=N("+ フィールドを追加",()=>{const m=document.createElement("div");m.className="ss-bg-field-row",m.style.padding="8px",m.style.marginBottom="8px",m.style.background="#f9f9f9",m.style.borderRadius="4px";const h=document.createElement("input");h.type="text",h.placeholder="フィールド名",h.className="ss-bg-name-input";const f=document.createElement("input");f.type="text",f.placeholder="値",f.className="ss-bg-value-input";const d=document.createElement("input");d.type="text",d.placeholder="セレクタ（省略可）",d.className="ss-bg-selector-input";const b=document.createElement("button");b.textContent="削除",b.className="ss-bg-remove-btn",b.style.alignSelf="flex-start",b.addEventListener("click",()=>{m.remove();const v=a.findIndex(g=>g.nameInput===h);v!==-1&&a.splice(v,1)}),m.appendChild(h),m.appendChild(f),m.appendChild(d),m.appendChild(b),n.appendChild(m),a.push({nameInput:h,valueInput:f,selectorInput:d})});i.style.background="#e3f2fd",i.style.color="#1976d2",l.appendChild(i);const p=document.createElement("button");p.textContent="保存",p.className="ss-bg-save-btn",p.addEventListener("click",async()=>{const m=a.map(d=>({name:d.nameInput.value.trim(),value:d.valueInput.value.trim(),selector:d.selectorInput.value.trim()})).filter(d=>d.name&&d.value),h={...e,additionalFields:m.length>0?m:void 0,updatedAt:Date.now()},f=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:h}});if(f.success)D(h);else{const d=document.createElement("div");d.textContent="保存に失敗しました: "+(f.error||"不明なエラー"),d.style.cssText=`
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `,l.appendChild(d),setTimeout(()=>{d.remove()},3e3)}}),l.appendChild(p);const c=N("戻る",()=>{D(e)});c.className="ss-bg-back-btn",l.appendChild(c)}function T(e,r){const t=document.createElement("div");t.className="ss-bg-title-bar";const o=document.createElement("div");o.textContent=e,o.className="ss-bg-title-text";const n=document.createElement("button");return n.textContent="×",n.className="ss-bg-close-btn",n.addEventListener("click",s=>{s.stopPropagation(),r()}),t.appendChild(o),t.appendChild(n),pe(t,n),t}function pe(e,r){let t=!1,o=0,n=0,s=0,a=0;e.addEventListener("mousedown",i=>{if(i.target===r)return;t=!0,o=i.clientX,n=i.clientY;const p=l.getBoundingClientRect();s=p.left,a=p.top,i.preventDefault()}),document.addEventListener("mousemove",i=>{if(t&&l){const p=i.clientX-o,c=i.clientY-n;l.style.left=`${s+p}px`,l.style.top=`${a+c}px`}}),document.addEventListener("mouseup",()=>{t=!1})}function D(e,r){if(!l)return;l.innerHTML="";const t=T(e.title,()=>w());l.appendChild(t);const o=document.createElement("div");o.textContent="入力する項目を選択",o.className="ss-bg-instruction",l.appendChild(o);const n=N("✏️ フィールドを編集...",()=>{ue(e)});n.style.background="#fff3e0",n.style.color="#e65100",n.style.marginBottom="12px",l.appendChild(n);const s=N("すべて入力 (ユーザー名 + パスワード)",async()=>{await V(e),w()});if(s.addEventListener("mouseenter",()=>{be()}),s.addEventListener("mouseleave",()=>{I()}),l.appendChild(s),e.username){const i=N(`ユーザー名: ${e.username}`,()=>{M({value:e.username},e,"username")});i.addEventListener("mouseenter",()=>{x&&A(x)}),i.addEventListener("mouseleave",()=>{I()}),l.appendChild(i)}if(e.password){const i=N("パスワード: ••••••••",()=>{M({value:e.password},e,"password")});i.addEventListener("mouseenter",()=>{x&&A(x)}),i.addEventListener("mouseleave",()=>{I()}),l.appendChild(i)}e.additionalFields&&e.additionalFields.forEach((i,p)=>{const c=N(`${i.name}: ${i.value}`,()=>{M({value:i.value},e,`additional:${p}`)});c.addEventListener("mouseenter",()=>{x&&A(x)}),c.addEventListener("mouseleave",()=>{I()}),l.appendChild(c)});const a=document.createElement("button");a.textContent="戻る",a.className="ss-bg-back-btn",a.addEventListener("click",async()=>{const i=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(i.success&&i.data){const p=x;w(),x=p,await U(i.data)}else console.error("[SS-BG] Failed to get passwords for back button:",i.error),w()}),l.appendChild(a),x&&A(x)}function N(e,r){const t=document.createElement("button");return t.textContent=e,t.className="ss-bg-field-button",t.addEventListener("click",r),t}function w(){y&&y.parentNode&&y.parentNode.removeChild(y),document.body.classList.remove("ss-bg-dialog-active"),I(),C=null,l=null,y=null,S=null,B&&typeof B.focus=="function"&&(B.focus(),B=null)}function me(e){e.classList.add(P)}function A(e){me(e);const r=e.getBoundingClientRect(),t=document.createElement("div");t.style.cssText=`
    position: fixed;
    top: ${r.top}px;
    left: ${r.left}px;
    width: ${r.width}px;
    height: ${r.height}px;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
    background: rgba(76, 175, 80, 0.1);
  `,document.body.appendChild(t),O.push(t)}function be(e){I();const r=x?.closest("form")||document.querySelector("form");if(!r)return;const t=Array.from(r.querySelectorAll("input")),o=t.find(n=>n.type==="password"&&n.offsetParent!==null);if(o){A(o);const n=t.indexOf(o);for(let s=n-1;s>=0;s--){const a=t[s],i=$(a);if((i==="username"||i==="email"||i==="text")&&a.offsetParent!==null){A(a);break}}}}function I(){O.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),O=[],document.querySelectorAll(`.${P}`).forEach(e=>{e.classList.remove(P)})}function H(){y&&w()}function R(e){y=document.createElement("div"),y.id=e,y.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,S=y.attachShadow({mode:"closed"})}function G(e,r){const t=document.createElement("style");t.textContent=e,S.appendChild(t),S.appendChild(r),document.body.appendChild(y),B=document.activeElement;const o='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',n=r.querySelector(o);n&&n.focus();const s=r.querySelectorAll(o),a=s[0],i=s[s.length-1],p=c=>{c.key==="Tab"&&(c.shiftKey?document.activeElement===a&&(c.preventDefault(),i.focus()):document.activeElement===i&&(c.preventDefault(),a.focus()))};r.addEventListener("keydown",p)}function W(e){H(),R("ss-bg-error-dialog-host");const r=document.createElement("div");r.className="ss-bg-error-dialog-content",r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true");const t=document.createElement("div");t.className="ss-bg-error-title",t.id="ss-bg-error-dialog-title",t.textContent="エラー",r.setAttribute("aria-labelledby","ss-bg-error-dialog-title");const o=document.createElement("div");o.className="ss-bg-error-message",o.textContent=e;const n=document.createElement("button");n.className="ss-bg-error-close-btn",n.textContent="閉じる",n.onclick=w,r.appendChild(t),r.appendChild(o),r.appendChild(n),G(`
    :host {
      --color-bg-elevated: #ffffff;
      --color-text-primary: #333333;
      --color-border-error: #d32f2f;
      --color-btn-default: #f5f5f5;
      --color-btn-default-hover: #e0e0e0;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --color-bg-elevated: #333333;
        --color-text-primary: #e0e0e0;
        --color-border-error: #d32f2f;
        --color-btn-default: #424242;
        --color-btn-default-hover: #616161;
      }
    }

    .ss-bg-error-dialog-content {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border-error);
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
      color: var(--color-border-error);
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .ss-bg-error-message {
      color: var(--color-text-primary);
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .ss-bg-error-close-btn {
      width: 100%;
      padding: 8px;
      background: var(--color-btn-default);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 13px;
      color: var(--color-text-primary);
    }
    .ss-bg-error-close-btn:hover {
      background: var(--color-btn-default-hover);
    }
  `,r)}function fe(e){return new Promise(r=>{H(),R("ss-bg-confirm-dialog-host");const t=document.createElement("div");t.className="ss-bg-confirm-dialog-content",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true");const o=document.createElement("div");o.className="ss-bg-confirm-title",o.id="ss-bg-confirm-dialog-title",o.textContent="確認",t.setAttribute("aria-labelledby","ss-bg-confirm-dialog-title");const n=document.createElement("div");n.className="ss-bg-confirm-message",n.textContent=e;const s=document.createElement("div");s.className="ss-bg-confirm-buttons";const a=document.createElement("button");a.className="ss-bg-confirm-btn ss-bg-confirm-cancel",a.textContent="キャンセル",a.onclick=()=>{w(),r(!1)};const i=document.createElement("button");i.className="ss-bg-confirm-btn ss-bg-confirm-ok",i.textContent="OK",i.onclick=()=>{w(),r(!0)},s.appendChild(a),s.appendChild(i),t.appendChild(o),t.appendChild(n),t.appendChild(s),G(`
      :host {
        --color-bg-elevated: #ffffff;
        --color-text-primary: #333333;
        --color-border-medium: #cccccc;
        --color-btn-default: #f5f5f5;
        --color-btn-default-hover: #e0e0e0;
        --color-btn-primary: #4CAF50;
        --color-btn-primary-hover: #45a049;
        --color-text-inverse: #ffffff;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --color-bg-elevated: #333333;
          --color-text-primary: #e0e0e0;
          --color-border-medium: #444444;
          --color-btn-default: #424242;
          --color-btn-default-hover: #616161;
          --color-btn-primary: #4CAF50;
          --color-btn-primary-hover: #66bb6a;
          --color-text-inverse: #ffffff;
        }
      }

      .ss-bg-confirm-dialog-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border-medium);
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
        color: var(--color-text-primary);
      }
      .ss-bg-confirm-message {
        color: var(--color-text-primary);
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
        background: var(--color-btn-default);
        color: var(--color-text-primary);
      }
      .ss-bg-confirm-cancel:hover {
        background: var(--color-btn-default-hover);
      }
      .ss-bg-confirm-ok {
        background: var(--color-btn-primary);
        color: var(--color-text-inverse);
      }
      .ss-bg-confirm-ok:hover {
        background: var(--color-btn-primary-hover);
      }
    `,t)})}function ge(){document.addEventListener("contextmenu",e=>{const r=e.target;r.tagName==="INPUT"&&(x=r)})}function ve(){chrome.runtime.onMessage.addListener((e,r,t)=>e.type==="PING"?(t({pong:!0}),!0):e.type==="FILL_PASSWORD"?(V(e.payload),t({success:!0}),!0):e.type==="FILL_FIELD"?(M(e.payload),t({success:!0}),!0):e.type==="SAVE_CURRENT_FORM"?(xe(),t({success:!0}),!0):e.type==="SHOW_PASSWORD_DIALOG"?(U(e.payload.candidates,e.payload.tabId).then(()=>{t({success:!0})}).catch(o=>{t({success:!1,error:o.message})}),!0):e.type==="EXECUTE_FAVORITE"?(de(e.payload.entry,e.payload.mappings),t({success:!0}),!0):!1)}async function V(e){if(!x?.closest("form")){W("対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。");return}const t=[];if(e.usernameSelector&&e.username){const o=document.querySelector(e.usernameSelector);o&&(o.value=e.username,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:e.usernameSelector,source:"username"}))}if(e.passwordSelector&&e.password){const o=document.querySelector(e.passwordSelector);o&&(o.value=e.password,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:e.passwordSelector,source:"password"}))}if(e.additionalFields&&e.additionalFields.forEach((o,n)=>{if(o.selector){const s=document.querySelector(o.selector);s&&(s.value=o.value,s.dispatchEvent(new Event("input",{bubbles:!0})),s.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:o.selector,source:`additional:${n}`}))}}),!e.usernameSelector||!e.passwordSelector){const o=await he(e);t.push(...o)}C!==null&&t.length>0&&(await X(C,e,t),C=null),await Ee(e)}async function he(e){const r=[],t=x?.closest("form")||document.querySelector("form");if(!t)return r;const o=Array.from(t.querySelectorAll("input")),n=o.find(s=>s.type==="password"&&s.offsetParent!==null);if(n&&e.password){n.value=e.password,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0}));const s=z(n);s&&r.push({selector:s,source:"password"});const a=o.indexOf(n);for(let i=a-1;i>=0;i--){const p=o[i],c=$(p);if((c==="username"||c==="email"||c==="text")&&p.offsetParent!==null&&e.username){p.value=e.username,p.dispatchEvent(new Event("input",{bubbles:!0})),p.dispatchEvent(new Event("change",{bubbles:!0}));const m=z(p);m&&r.push({selector:m,source:"username"});break}}}return r}async function M(e,r,t){const o=Q()||x;if(o&&(o.value=e.value,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})),C!==null&&r&&t)){const n=z(o);n&&(await X(C,r,[{selector:n,source:t}]),C=null)}}async function xe(){const e=ee();if(e.length===0){W("フォームが見つかりません");return}const r=Z(e[0]);if(!r.password){W("パスワードフィールドが見つかりませんでした");return}await ye(r)}async function ye(e){H(),R("ss-bg-save-form-dialog-host");const r=document.createElement("div");r.className="ss-bg-dialog-content";const t=await _(),o=t?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",n=t?"#e0e0e0":"#333333";r.style.cssText=`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-height: 80vh;
    background: ${o};
    color: ${n};
    overflow-y: auto;
    pointer-events: auto;
  `;const s=T("フォーム情報を保存",()=>w());r.appendChild(s);const a=F("タイトル",e.title||"");r.appendChild(a.group);const i=document.createElement("div");i.className="ss-bg-form-group";const p=document.createElement("label");p.className="ss-bg-form-label",p.textContent="URL";const c=document.createElement("textarea");c.className="ss-bg-form-textarea",c.value=e.urls?e.urls.join(`
`):"",c.rows=2,i.appendChild(p),i.appendChild(c),r.appendChild(i);const m=F("ユーザー名",e.username||"");r.appendChild(m.group);const h=F("パスワード",e.password||"","password");r.appendChild(h.group);const f=[];if(e.additionalFields&&e.additionalFields.length>0){const g=document.createElement("div");g.className="ss-bg-form-label",g.textContent="追加フィールド",g.style.marginBottom="4px",r.appendChild(g);for(const E of e.additionalFields){const u=document.createElement("div");u.className="ss-bg-field-row";const k=document.createElement("input");k.className="ss-bg-name-input",k.value=E.name,k.placeholder="名前";const L=document.createElement("input");L.className="ss-bg-value-input",L.value=E.value,L.placeholder="値",u.appendChild(k),u.appendChild(L),r.appendChild(u),f.push({nameInput:k,valueInput:L})}}const d=document.createElement("button");d.textContent="保存",d.className="ss-bg-save-btn",d.style.marginTop="8px",d.addEventListener("click",async()=>{const g={id:crypto.randomUUID(),title:a.input.value.trim()||e.title||"",urls:c.value.trim().split(`
`).map(u=>u.trim()).filter(Boolean),username:m.input.value,password:h.input.value,usernameSelector:e.usernameSelector,passwordSelector:e.passwordSelector,additionalFields:f.map((u,k)=>({name:u.nameInput.value.trim(),value:u.valueInput.value.trim(),selector:e.additionalFields?.[k]?.selector||""})).filter(u=>u.name&&u.value),createdAt:Date.now(),updatedAt:Date.now()};g.additionalFields&&g.additionalFields.length===0&&(g.additionalFields=void 0),d.disabled=!0,d.textContent="保存中...";const E=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:g});if(E.success){const u=document.createElement("div");u.className="ss-bg-success-message",u.textContent="保存しました",r.appendChild(u),setTimeout(()=>w(),1e3)}else{d.disabled=!1,d.textContent="保存";const u=document.createElement("div");u.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",u.textContent="保存に失敗しました: "+(E.error||"不明なエラー"),r.appendChild(u),setTimeout(()=>u.remove(),3e3)}}),r.appendChild(d);const b=document.createElement("button");b.textContent="キャンセル",b.className="ss-bg-cancel-btn",b.addEventListener("click",()=>w()),r.appendChild(b),l=r;const v=j();G(v,r)}function we(e,r){if(!l)return;l.innerHTML="",l.style.maxHeight="80vh";const t=T("エントリを編集",()=>w());l.appendChild(t);const o=F("タイトル",e.title);l.appendChild(o.group);const n=document.createElement("div");n.className="ss-bg-form-group";const s=document.createElement("label");s.className="ss-bg-form-label",s.textContent="URL (1行に1つ)";const a=document.createElement("textarea");a.className="ss-bg-form-textarea",a.value=e.urls.join(`
`),a.rows=2,n.appendChild(s),n.appendChild(a),l.appendChild(n);const i=F("ユーザー名",e.username);l.appendChild(i.group);const p=F("パスワード",e.password,"password");l.appendChild(p.group);const c=F("メモ",e.notes||"");l.appendChild(c.group);const m=[],h=document.createElement("div");if(h.className="ss-bg-fields-container",e.additionalFields&&e.additionalFields.length>0){const v=document.createElement("div");v.className="ss-bg-form-label",v.textContent="追加フィールド",v.style.marginBottom="4px",l.appendChild(v);for(const g of e.additionalFields){const{row:E,inputs:u}=Y(g.name,g.value,g.selector||"",m);h.appendChild(E),m.push(u)}}l.appendChild(h);const f=N("+ フィールドを追加",()=>{const{row:v,inputs:g}=Y("","","",m);h.appendChild(v),m.push(g)});f.style.background="#e3f2fd",f.style.color="#1976d2",l.appendChild(f);const d=document.createElement("button");d.textContent="保存",d.className="ss-bg-save-btn",d.style.marginTop="8px",d.addEventListener("click",async()=>{const v=m.map(u=>({name:u.nameInput.value.trim(),value:u.valueInput.value.trim(),selector:u.selectorInput.value.trim()})).filter(u=>u.name&&u.value),g={...e,title:o.input.value.trim()||e.title,urls:a.value.trim().split(`
`).map(u=>u.trim()).filter(Boolean),username:i.input.value,password:p.input.value,notes:c.input.value.trim()||void 0,additionalFields:v.length>0?v:void 0,updatedAt:Date.now()};d.disabled=!0,d.textContent="保存中...";const E=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:g}});if(E.success){const u=document.createElement("div");u.className="ss-bg-success-message",u.textContent="保存しました",l.appendChild(u),setTimeout(()=>{D(g)},800)}else{d.disabled=!1,d.textContent="保存";const u=document.createElement("div");u.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",u.textContent="保存に失敗: "+(E.error||"不明なエラー"),l.appendChild(u),setTimeout(()=>u.remove(),3e3)}}),l.appendChild(d);const b=document.createElement("button");b.textContent="戻る",b.className="ss-bg-back-btn",b.addEventListener("click",async()=>{const v=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(v.success&&v.data){const g=x;w(),x=g,await U(v.data)}else w()}),l.appendChild(b)}function Y(e,r,t,o,n){const s=document.createElement("div");s.className="ss-bg-field-row",s.style.padding="4px",s.style.marginBottom="4px",s.style.background="#f9f9f9",s.style.borderRadius="4px";const a=document.createElement("input");a.type="text",a.value=e,a.placeholder="名前",a.className="ss-bg-name-input";const i=document.createElement("input");i.type="text",i.value=r,i.placeholder="値",i.className="ss-bg-value-input";const p=document.createElement("input");p.type="text",p.value=t,p.placeholder="セレクタ",p.className="ss-bg-selector-input";const c=document.createElement("button");return c.textContent="削除",c.className="ss-bg-remove-btn",c.addEventListener("click",()=>{s.remove();const h=o.findIndex(f=>f.nameInput===a);h!==-1&&o.splice(h,1)}),s.appendChild(a),s.appendChild(i),s.appendChild(p),s.appendChild(c),{row:s,inputs:{nameInput:a,valueInput:i,selectorInput:p}}}function F(e,r,t="text"){const o=document.createElement("div");o.className="ss-bg-form-group";const n=document.createElement("label");n.className="ss-bg-form-label",n.textContent=e;const s=document.createElement("input");return s.className="ss-bg-form-input",s.type=t,s.value=r,o.appendChild(n),o.appendChild(s),{group:o,input:s}}async function Ee(e){const r=window.location.href,t=oe(r);if(te(r,e.urls)>0||!await fe(`このサイト (${t}) は「${e.title}」の登録URLに含まれていません。

URLを追加しますか？`))return;const s={...e,urls:[...e.urls,t],updatedAt:Date.now()};try{(await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:s}})).success}catch(a){console.error("[SS-BG] Error adding URL:",a)}}function K(){console.log("[bg-ss] Content script injected and initialized");try{ne(),console.log("[bg-ss] Content script initialization complete")}catch(e){console.error("[bg-ss] Content script initialization failed:",e)}}console.log("[bg-ss] content-exports.js loaded"),K(),q.main=K,Object.defineProperty(q,Symbol.toStringTag,{value:"Module"})})(this.ContentScript=this.ContentScript||{});

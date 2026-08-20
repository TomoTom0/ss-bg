(function(ee){"use strict";function P(e){if(e.id)return`#${e.id}`;const t=e;if(t.name)return`input[name="${t.name}"]`;if(t.type){const n=e.closest("form");if(n){const a=Array.from(n.querySelectorAll(`input[type="${t.type}"]`)).indexOf(e);if(a>=0)return`form input[type="${t.type}"]:nth-of-type(${a+1})`}}const o=e.parentElement;if(o){const r=Array.from(o.children).indexOf(e);return`${o.tagName.toLowerCase()} > :nth-child(${r+1})`}return"input"}function G(e){const t=e.type.toLowerCase();if(t==="password")return"password";if(t==="email")return"email";if(t==="tel")return"tel";const o=e.name.toLowerCase(),n=["user","login","account","id","userid","username","loginid"],r=["email","mail"],a=["phone","tel","mobile"];if(n.some(l=>o.includes(l)))return"username";if(r.some(l=>o.includes(l)))return"email";if(a.some(l=>o.includes(l)))return"tel";const s=e.id.toLowerCase();if(n.some(l=>s.includes(l)))return"username";if(r.some(l=>s.includes(l)))return"email";if(a.some(l=>s.includes(l)))return"tel";const i=e.placeholder.toLowerCase();if(n.some(l=>i.includes(l)))return"username";if(r.some(l=>i.includes(l)))return"email";if(a.some(l=>i.includes(l)))return"tel";const u=e.autocomplete.toLowerCase();return u==="username"?"username":u==="email"?"email":u==="tel"?"tel":t==="text"||t===""?"text":"unknown"}function le(e){const t=Array.from(e.querySelectorAll("input")),o=[];for(const n of t){if(n.offsetParent===null||n.type==="hidden"||n.type==="submit"||n.type==="button")continue;const r=G(n),a=P(n);let s=50;n.type==="password"&&(s=100),n.type==="email"&&(s=90),n.name&&(s+=20),n.id&&(s+=10),o.push({element:n,type:r,confidence:Math.min(s,100),selector:a})}return o}function ce(){const e=document.activeElement;return e&&e.tagName==="INPUT"?e:null}function de(e){const t=le(e),o=window.location.href;let n="",r="",a="",s="";const i=[];for(const m of t){const f=m.element.value;if(f)if(m.type==="password"&&!r)r=f,s=m.selector;else if(m.type==="username"&&!n)n=f,a=m.selector;else if(m.type==="email"&&!n)n=f,a=m.selector;else{const w=m.element.name||m.element.placeholder||`フィールド${i.length+1}`;i.push({name:w,value:f,selector:m.selector})}}return{title:new URL(o).hostname,urls:[o],username:n,password:r,usernameSelector:a,passwordSelector:s,additionalFields:i.length>0?i:void 0}}function ue(){return Array.from(document.querySelectorAll("form"))}function pe(e){try{const t=new URL(e);if(t.protocol==="http:"||t.protocol==="https:")return t}catch{}try{const t=new URL(`https://${e}`);if(t.protocol==="https:")return t}catch{}return null}function me(e,t){if(t.length===0)return 0;let o;try{o=new URL(e)}catch{return 0}const n=te(e);if(t.includes(e)||t.includes(n))return 2;for(const r of t){const a=pe(r);if(a&&o.hostname===a.hostname&&o.port===a.port)return 1}return 0}function te(e){const t=e.trim();if(!t)return"";try{const o=new URL(t);let n=o.hostname+o.pathname;return o.port&&!(o.protocol==="http:"&&o.port==="80"||o.protocol==="https:"&&o.port==="443")&&(n=o.hostname+":"+o.port+o.pathname),n.endsWith("/")&&(n=n.slice(0,-1)),n}catch{return t}}function be(e){try{const t=new URL(e);if(t.protocol==="http:"||t.protocol==="https:")return t}catch{}try{const t=new URL(`https://${e}`);if(t.protocol==="https:")return t}catch{}return null}function oe(e,t){try{const o=new URL(e);let n=0;for(const r of t.urls)try{const a=be(r);if(!a)continue;let s=0;if(o.href===a.href)s=1e3;else if(o.hostname===a.hostname)s=900;else{const i=re(o.hostname),u=re(a.hostname);i===u&&(s=800)}n=Math.max(n,s)}catch{}return n}catch{return 0}}function re(e){const t=e.split("."),o=["co.jp","com.au","co.uk","gov.uk","ac.jp","ne.jp"],n=t.slice(-2).join(".");return o.includes(n)?t.slice(-3).join("."):t.slice(-2).join(".")}const fe=800,ge=1440*60*1e3;function he(e,t,o=ge){return typeof e.lastUsedAt=="number"&&t-e.lastUsedAt<=o}function ve(e,t){const o=t.map(n=>({entry:n,score:oe(e,n)}));return o.sort((n,r)=>{if(r.score!==n.score)return r.score-n.score;const a=n.entry.lastUsedAt??0,s=r.entry.lastUsedAt??0;return s!==a?s-a:n.entry.title.localeCompare(r.entry.title)}),o.map(n=>n.entry)}const xe="••••••••",we=300*1e3,ye='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',Ee='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';let v=null,c=null,h=null,N=null,z=null,W=[];const $="ss-bg-highlight-target";let C=null;async function j(){try{return(await chrome.storage.local.get("settings")).settings?.theme||"auto"}catch{return"auto"}}async function Ce(){const e=await j();return e==="light"?!1:e==="dark"?!0:window.matchMedia("(prefers-color-scheme: dark)").matches}function ke(){Se(),Ue(),Pe(),Le()}function Se(){if(document.getElementById("ss-bg-highlight-styles"))return;const e=document.createElement("style");e.id="ss-bg-highlight-styles",e.textContent=`
    .${$} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `,document.head.appendChild(e)}function Le(){document.addEventListener("keydown",e=>{e.key==="Escape"&&h&&y()}),document.addEventListener("focusin",e=>{const t=e.target;(t.tagName==="INPUT"||t.tagName==="TEXTAREA")&&(N&&N.contains(t)||(v=t))})}function Ne(e){const r=window.innerWidth,a=window.innerHeight;return r-e.right>=360?{left:e.right+10,top:Math.max(10,Math.min(e.top,a-300-10))}:e.left>=360?{left:e.left-350-10,top:Math.max(10,Math.min(e.top,a-300-10))}:a-e.bottom>=310?{left:Math.max(10,Math.min(e.left,r-350-10)),top:e.bottom+10}:{left:Math.max(10,Math.min(e.left,r-350-10)),top:Math.max(10,e.top-300-10)}}function ne(){const e=`
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
    `;return`
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

    /* 明示的にダーク指定された場合 */
    :host[data-theme='dark'] {
      ${e.trim()}
    }

    /* auto（システム設定）の場合のみ、OS設定に従う */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme='light']):not([data-theme='dark']) {
        ${e.trim()}
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
    /* URL一致（このサイト）強調 */
    .ss-bg-password-item--url-match {
      background: var(--color-success-bg);
      box-shadow: inset 3px 0 0 var(--color-btn-primary);
    }
    /* 最近使用の控えめマーカー */
    .ss-bg-password-item--recent {
      box-shadow: inset 3px 0 0 var(--color-border-medium);
    }
    .ss-bg-item-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .ss-bg-item-title-text {
      flex: 1;
      min-width: 0;
      font-weight: 600;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ss-bg-item-badge {
      flex-shrink: 0;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .ss-bg-item-badge--url {
      background: var(--color-btn-primary);
      color: #ffffff;
    }
    .ss-bg-item-badge--recent {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-medium);
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
    .ss-bg-value-wrap {
      display: flex;
      gap: 4px;
      align-items: center;
      flex: 2;
      min-width: 0;
    }
    .ss-bg-value-wrap .ss-bg-value-input {
      flex: 1;
      min-width: 0;
    }
    .ss-bg-peek-btn {
      padding: 4px 6px;
      border: 1px solid var(--color-border-medium);
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      white-space: nowrap;
    }
    .ss-bg-peek-btn:hover {
      background: var(--color-border-medium);
    }
    .ss-bg-sensitive-label {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      color: var(--color-text-secondary);
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
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
  `}async function q(e,t){if(h)return;const o=v||document.activeElement;if(!o||o.tagName!=="INPUT"&&o.tagName!=="TEXTAREA"){const b=document.querySelector('input[type="password"], input[type="text"], input[type="email"]');if(!b)return;v=b}const n=(v||o).getBoundingClientRect(),r=Ne(n);h=document.createElement("div"),h.id="ss-bg-dialog-host",h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,N=h.attachShadow({mode:"closed"});const a=document.createElement("style");a.textContent=ne(),N.appendChild(a),c=document.createElement("div"),c.className="ss-bg-dialog-content";const s=await j();(s==="light"||s==="dark")&&h.setAttribute("data-theme",s);const i=s==="dark"||s==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches,u=i?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",l=i?"#e0e0e0":"#333333",m=i?"#444444":"#cccccc";c.style.cssText=`
    position: absolute;
    top: ${r.top}px;
    left: ${r.left}px;
    background: ${u};
    color: ${l};
    backdrop-filter: blur(2px);
    border: 1px solid ${m};
    border-radius: 4px;
    padding: 8px;
    width: 250px;
    max-width: 350px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
  `;const f=M("パスワードを選択",()=>y());c.appendChild(f);const w=await Fe();if(c.appendChild(w),C!==null){const b=document.createElement("div");b.className="ss-bg-favorite-register-indicator",b.textContent=`お気に入り ${C} に登録します`,c.appendChild(b)}if(e.length===0){const b=document.createElement("div");b.textContent="候補が見つかりません",b.className="ss-bg-empty-message",c.appendChild(b)}else{const b=window.location.href,g=ve(b,e),k=Date.now();g.forEach(d=>{const E=document.createElement("div");E.className="ss-bg-password-item-row";const S=document.createElement("button");S.className="ss-bg-password-item";const L=oe(b,d)>=fe,R=he(d,k);L?S.classList.add("ss-bg-password-item--url-match"):R&&S.classList.add("ss-bg-password-item--recent");const D=document.createElement("div");D.className="ss-bg-item-title";const Q=document.createElement("span");if(Q.className="ss-bg-item-title-text",Q.textContent=d.title,D.appendChild(Q),L){const F=document.createElement("span");F.className="ss-bg-item-badge ss-bg-item-badge--url",F.textContent="このサイト",D.appendChild(F)}else if(R){const F=document.createElement("span");F.className="ss-bg-item-badge ss-bg-item-badge--recent",F.textContent="最近",D.appendChild(F)}const Z=document.createElement("div");Z.textContent=d.username,Z.className="ss-bg-item-username",S.appendChild(D),S.appendChild(Z),S.addEventListener("click",async()=>{_(d)});const U=document.createElement("button");U.className="ss-bg-edit-btn",U.textContent="✎",U.title="編集",U.addEventListener("click",F=>{F.stopPropagation(),He(d)}),E.appendChild(S),E.appendChild(U),c.appendChild(E)})}const p=document.createElement("button");p.textContent="キャンセル",p.className="ss-bg-cancel-btn",p.addEventListener("click",y),c.appendChild(p),N.appendChild(c),document.body.appendChild(h),document.body.classList.add("ss-bg-dialog-active");const x=new MutationObserver(()=>{h&&document.body.contains(h)});x.observe(document.body,{childList:!0}),setTimeout(()=>x.disconnect(),1e4)}async function Fe(){const e=document.createElement("div");e.className="ss-bg-favorite-bar";const t=document.createElement("span");t.className="ss-bg-favorite-label",t.textContent="お気に入り:",e.appendChild(t);const o=window.location.hostname;let n=[];try{const r=await chrome.runtime.sendMessage({type:"GET_FAVORITES",payload:{domain:o}});r.success&&Array.isArray(r.data)&&(n=r.data.map(a=>a.slot))}catch{}for(let r=1;r<=3;r++){const a=r,s=document.createElement("button");s.className="ss-bg-favorite-star",n.includes(a)&&s.classList.add("registered"),C===a&&s.classList.add("active"),s.textContent=`${a}`,s.title=n.includes(a)?`お気に入り ${a} (登録済み) - クリックで登録モード切替`:`お気に入り ${a} - クリックで登録モード`,s.addEventListener("click",i=>{i.stopPropagation(),C===a?C=null:C=a,e.querySelectorAll(".ss-bg-favorite-star").forEach((l,m)=>{l.classList.toggle("active",m+1===C)}),Ae()}),e.appendChild(s)}return e}function Ae(){if(!c||!N)return;const e=c.querySelector(".ss-bg-favorite-register-indicator");if(e&&e.remove(),C!==null){const t=document.createElement("div");t.className="ss-bg-favorite-register-indicator",t.textContent=`お気に入り ${C} に登録します`;const o=c.querySelector(".ss-bg-favorite-bar");o&&o.nextSibling?c.insertBefore(t,o.nextSibling):c.appendChild(t)}}async function ae(e,t,o){const n=window.location.hostname;try{return(await chrome.runtime.sendMessage({type:"SAVE_FAVORITE",payload:{slot:e,domain:n,entryId:t.id,mappings:o,createdAt:Date.now()}})).success}catch{return!1}}function Te(e,t){for(const o of t){const n=document.querySelector(o.selector);if(!n)continue;let r;if(o.source==="username")r=e.username;else if(o.source==="password")r=e.password;else if(o.source.startsWith("additional:")){const a=parseInt(o.source.split(":")[1],10);r=e.additionalFields?.[a]?.value}r!==void 0&&(n.value=r,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})))}J(e)}function Ie(e,t){if(!c)return;c.innerHTML="";const o=M(e.title,()=>y());c.appendChild(o);const n=document.createElement("div");n.textContent="追加フィールドを編集",n.className="ss-bg-instruction",c.appendChild(n);const r=document.createElement("div");r.className="ss-bg-fields-container",r.style.maxHeight="250px",r.style.overflowY="auto";const a=e.additionalFields||[],s=[];a.forEach(m=>{const{row:f,inputs:w}=H(m.name,m.value,m.selector||"",m.sensitive===!0,s);r.appendChild(f),s.push(w)}),c.appendChild(r);const i=A("+ フィールドを追加",()=>{const{row:m,inputs:f}=H("","","",!1,s);r.appendChild(m),s.push(f)});i.style.background="#e3f2fd",i.style.color="#1976d2",c.appendChild(i);const u=document.createElement("button");u.textContent="保存",u.className="ss-bg-save-btn",u.addEventListener("click",async()=>{const m=s.map(p=>({name:p.nameInput.value.trim(),value:p.valueInput.value.trim(),selector:p.selectorInput.value.trim(),sensitive:p.sensitiveInput.checked})).filter(p=>p.name&&p.value),f={...e,additionalFields:m.length>0?m:void 0,updatedAt:Date.now()},w=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:f}});if(w.success)_(f);else{const p=document.createElement("div");p.textContent="保存に失敗しました: "+(w.error||"不明なエラー"),p.style.cssText=`
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `,c.appendChild(p),setTimeout(()=>{p.remove()},3e3)}}),c.appendChild(u);const l=A("戻る",()=>{_(e)});l.className="ss-bg-back-btn",c.appendChild(l)}function M(e,t){const o=document.createElement("div");o.className="ss-bg-title-bar";const n=document.createElement("div");n.textContent=e,n.className="ss-bg-title-text";const r=document.createElement("button");return r.textContent="×",r.className="ss-bg-close-btn",r.addEventListener("click",a=>{a.stopPropagation(),t()}),o.appendChild(n),o.appendChild(r),Be(o,r),o}function Be(e,t){let o=!1,n=0,r=0,a=0,s=0;e.addEventListener("mousedown",i=>{if(i.target===t)return;o=!0,n=i.clientX,r=i.clientY;const u=c.getBoundingClientRect();a=u.left,s=u.top,i.preventDefault()}),document.addEventListener("mousemove",i=>{if(o&&c){const u=i.clientX-n,l=i.clientY-r;c.style.left=`${a+u}px`,c.style.top=`${s+l}px`}}),document.addEventListener("mouseup",()=>{o=!1})}function _(e,t){if(!c)return;c.innerHTML="";const o=M(e.title,()=>y());c.appendChild(o);const n=document.createElement("div");n.textContent="入力する項目を選択",n.className="ss-bg-instruction",c.appendChild(n);const r=A("✏️ フィールドを編集...",()=>{Ie(e)});r.style.background="#fff3e0",r.style.color="#e65100",r.style.marginBottom="12px",c.appendChild(r);const a=A("すべて入力 (ユーザー名 + パスワード)",async()=>{await se(e),y()});if(a.addEventListener("mouseenter",()=>{Me()}),a.addEventListener("mouseleave",()=>{B()}),c.appendChild(a),e.username){const i=A(`ユーザー名: ${e.username}`,()=>{O({value:e.username},e,"username")});i.addEventListener("mouseenter",()=>{v&&I(v)}),i.addEventListener("mouseleave",()=>{B()}),c.appendChild(i)}if(e.password){const i=A("パスワード: ••••••••",()=>{O({value:e.password},e,"password")});i.addEventListener("mouseenter",()=>{v&&I(v)}),i.addEventListener("mouseleave",()=>{B()}),c.appendChild(i)}e.additionalFields&&e.additionalFields.forEach((i,u)=>{const l=A(`${i.name}: ${i.sensitive?xe:i.value}`,()=>{O({value:i.value},e,`additional:${u}`)});l.addEventListener("mouseenter",()=>{v&&I(v)}),l.addEventListener("mouseleave",()=>{B()}),c.appendChild(l)});const s=document.createElement("button");s.textContent="戻る",s.className="ss-bg-back-btn",s.addEventListener("click",async()=>{const i=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(i.success&&i.data){const u=v;y(),v=u,await q(i.data)}else console.error("[SS-BG] Failed to get passwords for back button:",i.error),y()}),c.appendChild(s),v&&I(v)}function A(e,t){const o=document.createElement("button");return o.textContent=e,o.className="ss-bg-field-button",o.addEventListener("click",t),o}function y(){h&&h.parentNode&&h.parentNode.removeChild(h),document.body.classList.remove("ss-bg-dialog-active"),B(),C=null,c=null,h=null,N=null,z&&typeof z.focus=="function"&&(z.focus(),z=null)}function ze(e){e.classList.add($)}function I(e){ze(e);const t=e.getBoundingClientRect(),o=document.createElement("div");o.style.cssText=`
    position: fixed;
    top: ${t.top}px;
    left: ${t.left}px;
    width: ${t.width}px;
    height: ${t.height}px;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
    background: rgba(76, 175, 80, 0.1);
  `,document.body.appendChild(o),W.push(o)}function Me(e){B();const t=v?.closest("form")||document.querySelector("form");if(!t)return;const o=Array.from(t.querySelectorAll("input")),n=o.find(r=>r.type==="password"&&r.offsetParent!==null);if(n){I(n);const r=o.indexOf(n);for(let a=r-1;a>=0;a--){const s=o[a],i=G(s);if((i==="username"||i==="email"||i==="text")&&s.offsetParent!==null){I(s);break}}}}function B(){W.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),W=[],document.querySelectorAll(`.${$}`).forEach(e=>{e.classList.remove($)})}function V(){h&&y()}async function X(e){h=document.createElement("div"),h.id=e;const t=await j();(t==="light"||t==="dark")&&h.setAttribute("data-theme",t),h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,N=h.attachShadow({mode:"closed"})}function Y(e,t){const o=document.createElement("style");o.textContent=e,N.appendChild(o),N.appendChild(t),document.body.appendChild(h),z=document.activeElement;const n='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',r=t.querySelector(n);r&&r.focus();const a=t.querySelectorAll(n),s=a[0],i=a[a.length-1],u=l=>{l.key==="Tab"&&(l.shiftKey?document.activeElement===s&&(l.preventDefault(),i.focus()):document.activeElement===i&&(l.preventDefault(),s.focus()))};t.addEventListener("keydown",u)}async function K(e){V(),await X("ss-bg-error-dialog-host");const t=document.createElement("div");t.className="ss-bg-error-dialog-content",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true");const o=document.createElement("div");o.className="ss-bg-error-title",o.id="ss-bg-error-dialog-title",o.textContent="エラー",t.setAttribute("aria-labelledby","ss-bg-error-dialog-title");const n=document.createElement("div");n.className="ss-bg-error-message",n.textContent=e;const r=document.createElement("button");r.className="ss-bg-error-close-btn",r.textContent="閉じる",r.onclick=y,t.appendChild(o),t.appendChild(n),t.appendChild(r),Y(`
    :host {
      --color-bg-elevated: #ffffff;
      --color-text-primary: #333333;
      --color-border-error: #d32f2f;
      --color-btn-default: #f5f5f5;
      --color-btn-default-hover: #e0e0e0;
    }

    /* 明示的にダーク指定された場合 */
    :host[data-theme='dark'] {
      --color-bg-elevated: #333333;
      --color-text-primary: #e0e0e0;
      --color-border-error: #d32f2f;
      --color-btn-default: #424242;
      --color-btn-default-hover: #616161;
    }

    /* auto（システム設定）の場合のみ、OS設定に従う */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme='light']):not([data-theme='dark']) {
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
  `,t)}async function De(e){return V(),await X("ss-bg-confirm-dialog-host"),new Promise(t=>{const o=document.createElement("div");o.className="ss-bg-confirm-dialog-content",o.setAttribute("role","dialog"),o.setAttribute("aria-modal","true");const n=document.createElement("div");n.className="ss-bg-confirm-title",n.id="ss-bg-confirm-dialog-title",n.textContent="確認",o.setAttribute("aria-labelledby","ss-bg-confirm-dialog-title");const r=document.createElement("div");r.className="ss-bg-confirm-message",r.textContent=e;const a=document.createElement("div");a.className="ss-bg-confirm-buttons";const s=document.createElement("button");s.className="ss-bg-confirm-btn ss-bg-confirm-cancel",s.textContent="キャンセル",s.onclick=()=>{y(),t(!1)};const i=document.createElement("button");i.className="ss-bg-confirm-btn ss-bg-confirm-ok",i.textContent="OK",i.onclick=()=>{y(),t(!0)},a.appendChild(s),a.appendChild(i),o.appendChild(n),o.appendChild(r),o.appendChild(a),Y(`
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

      /* 明示的にダーク指定された場合 */
      :host[data-theme='dark'] {
        --color-bg-elevated: #333333;
        --color-text-primary: #e0e0e0;
        --color-border-medium: #444444;
        --color-btn-default: #424242;
        --color-btn-default-hover: #616161;
        --color-btn-primary: #4CAF50;
        --color-btn-primary-hover: #66bb6a;
        --color-text-inverse: #ffffff;
      }

      /* auto（システム設定）の場合のみ、OS設定に従う */
      @media (prefers-color-scheme: dark) {
        :host:not([data-theme='light']):not([data-theme='dark']) {
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
    `,o)})}function Ue(){document.addEventListener("contextmenu",e=>{const t=e.target;t.tagName==="INPUT"&&(v=t)})}function Pe(){chrome.runtime.onMessage.addListener((e,t,o)=>e.type==="PING"?(o({pong:!0}),!0):e.type==="FILL_PASSWORD"?(se(e.payload),o({success:!0}),!0):e.type==="FILL_FIELD"?(O(e.payload),o({success:!0}),!0):e.type==="SAVE_CURRENT_FORM"?(_e(),o({success:!0}),!0):e.type==="SHOW_PASSWORD_DIALOG"?(q(e.payload.candidates,e.payload.tabId).then(()=>{o({success:!0})}).catch(n=>{o({success:!1,error:n.message})}),!0):e.type==="EXECUTE_FAVORITE"?(Te(e.payload.entry,e.payload.mappings),o({success:!0}),!0):!1)}function J(e){chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:{...e,lastUsedAt:Date.now()}}})}async function se(e){if(!v?.closest("form")){await K("対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。");return}const o=[];if(e.usernameSelector&&e.username){const r=document.querySelector(e.usernameSelector);r&&(r.value=e.username,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:e.usernameSelector,source:"username"}))}if(e.passwordSelector&&e.password){const r=document.querySelector(e.passwordSelector);r&&(r.value=e.password,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:e.passwordSelector,source:"password"}))}if(e.additionalFields&&e.additionalFields.forEach((r,a)=>{if(r.selector){const s=document.querySelector(r.selector);s&&(s.value=r.value,s.dispatchEvent(new Event("input",{bubbles:!0})),s.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:r.selector,source:`additional:${a}`}))}}),!e.usernameSelector||!e.passwordSelector){const r=await $e(e);o.push(...r)}C!==null&&o.length>0&&(await ae(C,e,o),C=null);const n=await Re(e);J(n??e)}async function $e(e){const t=[],o=v?.closest("form")||document.querySelector("form");if(!o)return t;const n=Array.from(o.querySelectorAll("input")),r=n.find(a=>a.type==="password"&&a.offsetParent!==null);if(r&&e.password){r.value=e.password,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0}));const a=P(r);a&&t.push({selector:a,source:"password"});const s=n.indexOf(r);for(let i=s-1;i>=0;i--){const u=n[i],l=G(u);if((l==="username"||l==="email"||l==="text")&&u.offsetParent!==null&&e.username){u.value=e.username,u.dispatchEvent(new Event("input",{bubbles:!0})),u.dispatchEvent(new Event("change",{bubbles:!0}));const m=P(u);m&&t.push({selector:m,source:"username"});break}}}return t}async function O(e,t,o){const n=ce()||v;if(n){if(n.value=e.value,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),C!==null&&t&&o){const r=P(n);r&&(await ae(C,t,[{selector:r,source:o}]),C=null)}t&&J(t)}}async function _e(){const e=ue();if(e.length===0){await K("フォームが見つかりません");return}const t=de(e[0]);if(!t.password){await K("パスワードフィールドが見つかりませんでした");return}await Oe(t)}async function Oe(e){V(),await X("ss-bg-save-form-dialog-host");const t=document.createElement("div");t.className="ss-bg-dialog-content";const o=await Ce(),n=o?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",r=o?"#e0e0e0":"#333333";t.style.cssText=`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-height: 80vh;
    background: ${n};
    color: ${r};
    overflow-y: auto;
    pointer-events: auto;
  `;const a=M("フォーム情報を保存",()=>y());t.appendChild(a);const s=T("タイトル",e.title||"");t.appendChild(s.group);const i=document.createElement("div");i.className="ss-bg-form-group";const u=document.createElement("label");u.className="ss-bg-form-label",u.textContent="URL";const l=document.createElement("textarea");l.className="ss-bg-form-textarea",l.value=e.urls?e.urls.join(`
`):"",l.rows=2,i.appendChild(u),i.appendChild(l),t.appendChild(i);const m=T("ユーザー名",e.username||"");t.appendChild(m.group);const f=T("パスワード",e.password||"","password");t.appendChild(f.group);const w=[];if(e.additionalFields&&e.additionalFields.length>0){const g=document.createElement("div");g.className="ss-bg-form-label",g.textContent="追加フィールド",g.style.marginBottom="4px",t.appendChild(g);for(const k of e.additionalFields){const d=document.createElement("div");d.className="ss-bg-field-row";const E=document.createElement("input");E.className="ss-bg-name-input",E.value=k.name,E.placeholder="名前";const S=document.createElement("input");S.className="ss-bg-value-input",S.value=k.value,S.placeholder="値",d.appendChild(E),d.appendChild(S),t.appendChild(d),w.push({nameInput:E,valueInput:S})}}const p=document.createElement("button");p.textContent="保存",p.className="ss-bg-save-btn",p.style.marginTop="8px",p.addEventListener("click",async()=>{const g={id:crypto.randomUUID(),title:s.input.value.trim()||e.title||"",urls:l.value.trim().split(`
`).map(d=>d.trim()).filter(Boolean),username:m.input.value,password:f.input.value,usernameSelector:e.usernameSelector,passwordSelector:e.passwordSelector,additionalFields:w.map((d,E)=>({name:d.nameInput.value.trim(),value:d.valueInput.value.trim(),selector:e.additionalFields?.[E]?.selector||""})).filter(d=>d.name&&d.value),createdAt:Date.now(),updatedAt:Date.now()};g.additionalFields&&g.additionalFields.length===0&&(g.additionalFields=void 0),p.disabled=!0,p.textContent="保存中...";const k=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:g});if(k.success){const d=document.createElement("div");d.className="ss-bg-success-message",d.textContent="保存しました",t.appendChild(d),setTimeout(()=>y(),1e3)}else{p.disabled=!1,p.textContent="保存";const d=document.createElement("div");d.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",d.textContent="保存に失敗しました: "+(k.error||"不明なエラー"),t.appendChild(d),setTimeout(()=>d.remove(),3e3)}}),t.appendChild(p);const x=document.createElement("button");x.textContent="キャンセル",x.className="ss-bg-cancel-btn",x.addEventListener("click",()=>y()),t.appendChild(x),c=t;const b=ne();Y(b,t)}function He(e,t){if(!c)return;c.innerHTML="",c.style.maxHeight="80vh";const o=M("エントリを編集",()=>y());c.appendChild(o);const n=T("タイトル",e.title);c.appendChild(n.group);const r=document.createElement("div");r.className="ss-bg-form-group";const a=document.createElement("label");a.className="ss-bg-form-label",a.textContent="URL (1行に1つ)";const s=document.createElement("textarea");s.className="ss-bg-form-textarea",s.value=e.urls.join(`
`),s.rows=2,r.appendChild(a),r.appendChild(s),c.appendChild(r);const i=T("ユーザー名",e.username);c.appendChild(i.group);const u=T("パスワード",e.password,"password");c.appendChild(u.group);const l=T("メモ",e.notes||"");c.appendChild(l.group);const m=[],f=document.createElement("div");if(f.className="ss-bg-fields-container",e.additionalFields&&e.additionalFields.length>0){const b=document.createElement("div");b.className="ss-bg-form-label",b.textContent="追加フィールド",b.style.marginBottom="4px",c.appendChild(b);for(const g of e.additionalFields){const{row:k,inputs:d}=H(g.name,g.value,g.selector||"",g.sensitive===!0,m);f.appendChild(k),m.push(d)}}c.appendChild(f);const w=A("+ フィールドを追加",()=>{const{row:b,inputs:g}=H("","","",!1,m);f.appendChild(b),m.push(g)});w.style.background="#e3f2fd",w.style.color="#1976d2",c.appendChild(w);const p=document.createElement("button");p.textContent="保存",p.className="ss-bg-save-btn",p.style.marginTop="8px",p.addEventListener("click",async()=>{const b=m.map(d=>({name:d.nameInput.value.trim(),value:d.valueInput.value.trim(),selector:d.selectorInput.value.trim(),sensitive:d.sensitiveInput.checked})).filter(d=>d.name&&d.value),g={...e,title:n.input.value.trim()||e.title,urls:s.value.trim().split(`
`).map(d=>d.trim()).filter(Boolean),username:i.input.value,password:u.input.value,notes:l.input.value.trim()||void 0,additionalFields:b.length>0?b:void 0,updatedAt:Date.now()};p.disabled=!0,p.textContent="保存中...";const k=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:g}});if(k.success){const d=document.createElement("div");d.className="ss-bg-success-message",d.textContent="保存しました",c.appendChild(d),setTimeout(()=>{_(g)},800)}else{p.disabled=!1,p.textContent="保存";const d=document.createElement("div");d.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",d.textContent="保存に失敗: "+(k.error||"不明なエラー"),c.appendChild(d),setTimeout(()=>d.remove(),3e3)}}),c.appendChild(p);const x=document.createElement("button");x.textContent="戻る",x.className="ss-bg-back-btn",x.addEventListener("click",async()=>{const b=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(b.success&&b.data){const g=v;y(),v=g,await q(b.data)}else y()}),c.appendChild(x)}function H(e,t,o,n,r,a){const s=document.createElement("div");s.className="ss-bg-field-row",s.style.padding="4px",s.style.marginBottom="4px",s.style.background="#f9f9f9",s.style.borderRadius="4px";const i=document.createElement("input");i.type="text",i.value=e,i.placeholder="名前",i.className="ss-bg-name-input";const u=document.createElement("input");u.type="text",u.value=t,u.placeholder="値",u.className="ss-bg-value-input";const l=document.createElement("input");l.type="checkbox",l.checked=n;const m=document.createElement("label");m.className="ss-bg-sensitive-label",m.appendChild(l),m.appendChild(document.createTextNode("secret"));const f=document.createElement("button");f.type="button",f.className="ss-bg-peek-btn";const w=document.createElement("div");w.className="ss-bg-value-wrap",w.appendChild(u),w.appendChild(f);let p=!1,x=null;function b(L){f.innerHTML=L?Ee:ye,f.setAttribute("aria-label",L?"隠す":"表示"),f.title=L?"隠す":"表示"}function g(){const L=l.checked;f.style.display=L?"":"none",u.type=L&&!p?"password":"text"}function k(){p=!1,b(!1),x&&(clearTimeout(x),x=null),g()}f.addEventListener("click",()=>{if(p){k();return}p=!0,b(!0),g(),x&&clearTimeout(x),x=setTimeout(()=>{p&&k()},we)}),b(!1),l.addEventListener("change",()=>{l.checked?g():k()}),g();const d=document.createElement("input");d.type="text",d.value=o,d.placeholder="セレクタ",d.className="ss-bg-selector-input";const E=document.createElement("button");return E.textContent="削除",E.className="ss-bg-remove-btn",E.addEventListener("click",()=>{x&&clearTimeout(x),s.remove();const L=r.findIndex(R=>R.nameInput===i);L!==-1&&r.splice(L,1)}),s.appendChild(i),s.appendChild(w),s.appendChild(m),s.appendChild(d),s.appendChild(E),{row:s,inputs:{nameInput:i,valueInput:u,selectorInput:d,sensitiveInput:l}}}function T(e,t,o="text"){const n=document.createElement("div");n.className="ss-bg-form-group";const r=document.createElement("label");r.className="ss-bg-form-label",r.textContent=e;const a=document.createElement("input");return a.className="ss-bg-form-input",a.type=o,a.value=t,n.appendChild(r),n.appendChild(a),{group:n,input:a}}async function Re(e){const t=window.location.href,o=te(t);if(me(t,e.urls)>0||!await De(`このサイト (${o}) は「${e.title}」の登録URLに含まれていません。

URLを追加しますか？`))return null;const a={...e,urls:[...e.urls,o],updatedAt:Date.now()};try{if((await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:a}})).success)return a}catch(s){console.error("[SS-BG] Error adding URL:",s)}return null}function ie(){console.log("[bg-ss] Content script injected and initialized");try{ke(),console.log("[bg-ss] Content script initialization complete")}catch(e){console.error("[bg-ss] Content script initialization failed:",e)}}console.log("[bg-ss] content-exports.js loaded"),ie(),ee.main=ie,Object.defineProperty(ee,Symbol.toStringTag,{value:"Module"})})(this.ContentScript=this.ContentScript||{});

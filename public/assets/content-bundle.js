(function(ee){"use strict";function U(e){if(e.id)return`#${e.id}`;const t=e;if(t.name)return`input[name="${t.name}"]`;if(t.type){const n=e.closest("form");if(n){const a=Array.from(n.querySelectorAll(`input[type="${t.type}"]`)).indexOf(e);if(a>=0)return`form input[type="${t.type}"]:nth-of-type(${a+1})`}}const o=e.parentElement;if(o){const r=Array.from(o.children).indexOf(e);return`${o.tagName.toLowerCase()} > :nth-child(${r+1})`}return"input"}function W(e){const t=e.type.toLowerCase();if(t==="password")return"password";if(t==="email")return"email";if(t==="tel")return"tel";const o=e.name.toLowerCase(),n=["user","login","account","id","userid","username","loginid"],r=["email","mail"],a=["phone","tel","mobile"];if(n.some(l=>o.includes(l)))return"username";if(r.some(l=>o.includes(l)))return"email";if(a.some(l=>o.includes(l)))return"tel";const s=e.id.toLowerCase();if(n.some(l=>s.includes(l)))return"username";if(r.some(l=>s.includes(l)))return"email";if(a.some(l=>s.includes(l)))return"tel";const i=e.placeholder.toLowerCase();if(n.some(l=>i.includes(l)))return"username";if(r.some(l=>i.includes(l)))return"email";if(a.some(l=>i.includes(l)))return"tel";const d=e.autocomplete.toLowerCase();return d==="username"?"username":d==="email"?"email":d==="tel"?"tel":t==="text"||t===""?"text":"unknown"}function ue(e){const t=Array.from(e.querySelectorAll("input")),o=[];for(const n of t){if(n.offsetParent===null||n.type==="hidden"||n.type==="submit"||n.type==="button")continue;const r=W(n),a=U(n);let s=50;n.type==="password"&&(s=100),n.type==="email"&&(s=90),n.name&&(s+=20),n.id&&(s+=10),o.push({element:n,type:r,confidence:Math.min(s,100),selector:a})}return o}function pe(){const e=document.activeElement;return e&&e.tagName==="INPUT"?e:null}function me(e){const t=ue(e),o=window.location.href;let n="",r="",a="",s="";const i=[];for(const m of t){const f=m.element.value;if(f)if(m.type==="password"&&!r)r=f,s=m.selector;else if(m.type==="username"&&!n)n=f,a=m.selector;else if(m.type==="email"&&!n)n=f,a=m.selector;else{const v=m.element.name||m.element.placeholder||`フィールド${i.length+1}`;i.push({name:v,value:f,selector:m.selector})}}return{title:new URL(o).hostname,urls:[o],username:n,password:r,usernameSelector:a,passwordSelector:s,additionalFields:i.length>0?i:void 0}}function fe(){return Array.from(document.querySelectorAll("form"))}function be(e){try{const t=new URL(e);if(t.protocol==="http:"||t.protocol==="https:")return t}catch{}try{const t=new URL(`https://${e}`);if(t.protocol==="https:")return t}catch{}return null}function ge(e,t){if(t.length===0)return 0;let o;try{o=new URL(e)}catch{return 0}const n=te(e);if(t.includes(e)||t.includes(n))return 2;for(const r of t){const a=be(r);if(a&&o.hostname===a.hostname&&o.port===a.port)return 1}return 0}function te(e){const t=e.trim();if(!t)return"";try{const o=new URL(t);let n=o.hostname+o.pathname;return o.port&&!(o.protocol==="http:"&&o.port==="80"||o.protocol==="https:"&&o.port==="443")&&(n=o.hostname+":"+o.port+o.pathname),n.endsWith("/")&&(n=n.slice(0,-1)),n}catch{return t}}function he(e){try{const t=new URL(e);if(t.protocol==="http:"||t.protocol==="https:")return t}catch{}try{const t=new URL(`https://${e}`);if(t.protocol==="https:")return t}catch{}return null}function oe(e,t){try{const o=new URL(e);let n=0;for(const r of t.urls)try{const a=he(r);if(!a)continue;let s=0;if(o.href===a.href)s=1e3;else if(o.hostname===a.hostname)s=900;else{const i=re(o.hostname),d=re(a.hostname);i===d&&(s=800)}n=Math.max(n,s)}catch{}return n}catch{return 0}}function re(e){const t=e.split("."),o=["co.jp","com.au","co.uk","gov.uk","ac.jp","ne.jp"],n=t.slice(-2).join(".");return o.includes(n)?t.slice(-3).join("."):t.slice(-2).join(".")}const ve=800,xe=1440*60*1e3;function we(e,t,o=xe){return typeof e.lastUsedAt=="number"&&t-e.lastUsedAt<=o}function ye(e,t){const o=t.map(n=>({entry:n,score:oe(e,n)}));return o.sort((n,r)=>{if(r.score!==n.score)return r.score-n.score;const a=n.entry.lastUsedAt??0,s=r.entry.lastUsedAt??0;return s!==a?s-a:n.entry.title.localeCompare(r.entry.title)}),o.map(n=>n.entry)}const Ee="••••••••",Ce=300*1e3,ke='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',Se='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';let x=null,c=null,h=null,N=null,z=null,G=[];const $="ss-bg-highlight-target";let y=null;async function j(){try{return(await chrome.storage.local.get("settings")).settings?.theme||"auto"}catch{return"auto"}}async function Le(){const e=await j();return e==="light"?!1:e==="dark"?!0:window.matchMedia("(prefers-color-scheme: dark)").matches}function Ne(){Fe(),_e(),Oe(),Ae()}function Fe(){if(document.getElementById("ss-bg-highlight-styles"))return;const e=document.createElement("style");e.id="ss-bg-highlight-styles",e.textContent=`
    .${$} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `,document.head.appendChild(e)}function Ae(){document.addEventListener("keydown",e=>{e.key==="Escape"&&h&&E()}),document.addEventListener("focusin",e=>{const t=e.target;(t.tagName==="INPUT"||t.tagName==="TEXTAREA")&&(N&&N.contains(t)||(x=t))})}function Te(e){const r=window.innerWidth,a=window.innerHeight;return r-e.right>=360?{left:e.right+10,top:Math.max(10,Math.min(e.top,a-300-10))}:e.left>=360?{left:e.left-350-10,top:Math.max(10,Math.min(e.top,a-300-10))}:a-e.bottom>=310?{left:Math.max(10,Math.min(e.left,r-350-10)),top:e.bottom+10}:{left:Math.max(10,Math.min(e.left,r-350-10)),top:Math.max(10,e.top-300-10)}}function ne(){const e=`
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
    .ss-bg-favorite-slot {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .ss-bg-favorite-delete {
      width: 16px;
      height: 28px;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      line-height: 1;
      color: var(--color-text-tertiary);
    }
    .ss-bg-favorite-delete:hover {
      color: var(--color-btn-danger);
    }
    .ss-bg-favorite-delete-message {
      font-size: 11px;
      color: var(--color-favorite-text);
      align-self: center;
    }
    .ss-bg-favorite-delete-confirm {
      height: 28px;
      padding: 0 8px;
      background: var(--color-btn-danger);
      border: 1px solid var(--color-btn-danger);
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      color: var(--color-text-primary);
    }
    .ss-bg-favorite-delete-confirm:hover {
      background: var(--color-btn-danger-hover);
    }
    .ss-bg-favorite-delete-cancel {
      height: 28px;
      padding: 0 8px;
      background: none;
      border: 1px solid var(--color-border-medium);
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      color: var(--color-text-primary);
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
  `}async function q(e,t){if(h)return;const o=x||document.activeElement;if(!o||o.tagName!=="INPUT"&&o.tagName!=="TEXTAREA"){const b=document.querySelector('input[type="password"], input[type="text"], input[type="email"]');if(!b)return;x=b}const n=(x||o).getBoundingClientRect(),r=Te(n);h=document.createElement("div"),h.id="ss-bg-dialog-host",h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,N=h.attachShadow({mode:"closed"});const a=document.createElement("style");a.textContent=ne(),N.appendChild(a),c=document.createElement("div"),c.className="ss-bg-dialog-content";const s=await j();(s==="light"||s==="dark")&&h.setAttribute("data-theme",s);const i=s==="dark"||s==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches,d=i?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",l=i?"#e0e0e0":"#333333",m=i?"#444444":"#cccccc";c.style.cssText=`
    position: absolute;
    top: ${r.top}px;
    left: ${r.left}px;
    background: ${d};
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
  `;const f=M("パスワードを選択",()=>E());c.appendChild(f);const v=await ae();if(c.appendChild(v),y!==null){const b=document.createElement("div");b.className="ss-bg-favorite-register-indicator",b.textContent=`お気に入り ${y} に登録します`,c.appendChild(b)}if(e.length===0){const b=document.createElement("div");b.textContent="候補が見つかりません",b.className="ss-bg-empty-message",c.appendChild(b)}else{const b=window.location.href,g=ye(b,e),k=Date.now();g.forEach(u=>{const C=document.createElement("div");C.className="ss-bg-password-item-row";const S=document.createElement("button");S.className="ss-bg-password-item";const L=oe(b,u)>=ve,R=we(u,k);L?S.classList.add("ss-bg-password-item--url-match"):R&&S.classList.add("ss-bg-password-item--recent");const D=document.createElement("div");D.className="ss-bg-item-title";const Q=document.createElement("span");if(Q.className="ss-bg-item-title-text",Q.textContent=u.title,D.appendChild(Q),L){const F=document.createElement("span");F.className="ss-bg-item-badge ss-bg-item-badge--url",F.textContent="このサイト",D.appendChild(F)}else if(R){const F=document.createElement("span");F.className="ss-bg-item-badge ss-bg-item-badge--recent",F.textContent="最近",D.appendChild(F)}const Z=document.createElement("div");Z.textContent=u.username,Z.className="ss-bg-item-username",S.appendChild(D),S.appendChild(Z),S.addEventListener("click",async()=>{_(u)});const P=document.createElement("button");P.className="ss-bg-edit-btn",P.textContent="✎",P.title="編集",P.addEventListener("click",F=>{F.stopPropagation(),Ge(u)}),C.appendChild(S),C.appendChild(P),c.appendChild(C)})}const p=document.createElement("button");p.textContent="キャンセル",p.className="ss-bg-cancel-btn",p.addEventListener("click",E),c.appendChild(p),N.appendChild(c),document.body.appendChild(h),document.body.classList.add("ss-bg-dialog-active");const w=new MutationObserver(()=>{h&&document.body.contains(h)});w.observe(document.body,{childList:!0}),setTimeout(()=>w.disconnect(),1e4)}async function ae(){const e=document.createElement("div");e.className="ss-bg-favorite-bar";const t=document.createElement("span");t.className="ss-bg-favorite-label",t.textContent="お気に入り:",e.appendChild(t);const o=window.location.hostname;let n=[];try{const r=await chrome.runtime.sendMessage({type:"GET_FAVORITES",payload:{domain:o}});r.success&&Array.isArray(r.data)&&(n=r.data.map(a=>a.slot))}catch{}for(let r=1;r<=3;r++){const a=r,s=n.includes(a),i=document.createElement("span");i.className="ss-bg-favorite-slot";const d=document.createElement("button");if(d.className="ss-bg-favorite-star",s&&d.classList.add("registered"),y===a&&d.classList.add("active"),d.textContent=`${a}`,d.title=s?`お気に入り ${a} (登録済み) - クリックで登録モード切替`:`お気に入り ${a} - クリックで登録モード`,d.addEventListener("click",l=>{l.stopPropagation(),y===a?y=null:y=a,e.querySelectorAll(".ss-bg-favorite-star").forEach((f,v)=>{f.classList.toggle("active",v+1===y)}),ie()}),i.appendChild(d),s){const l=document.createElement("button");l.className="ss-bg-favorite-delete",l.textContent="×",l.title=`お気に入り ${a} を削除`,l.setAttribute("aria-label",`お気に入り ${a} を削除`),l.addEventListener("click",m=>{m.stopPropagation(),Ie(e,a)}),i.appendChild(l)}e.appendChild(i)}return e}async function se(e){const t=await ae();e.replaceWith(t)}function Ie(e,t){e.innerHTML="";const o=document.createElement("span");o.className="ss-bg-favorite-delete-message",o.textContent=`お気に入り ${t} を削除しますか？`,e.appendChild(o);const n=document.createElement("button");n.className="ss-bg-favorite-delete-confirm",n.textContent="削除",n.addEventListener("click",async a=>{a.stopPropagation(),await Be(t),y===t&&(y=null),await se(e),ie()}),e.appendChild(n);const r=document.createElement("button");r.className="ss-bg-favorite-delete-cancel",r.textContent="キャンセル",r.addEventListener("click",async a=>{a.stopPropagation(),await se(e)}),e.appendChild(r)}async function Be(e){const t=window.location.hostname;try{return(await chrome.runtime.sendMessage({type:"DELETE_FAVORITE",payload:{domain:t,slot:e}})).success}catch{return!1}}function ie(){if(!c||!N)return;const e=c.querySelector(".ss-bg-favorite-register-indicator");if(e&&e.remove(),y!==null){const t=document.createElement("div");t.className="ss-bg-favorite-register-indicator",t.textContent=`お気に入り ${y} に登録します`;const o=c.querySelector(".ss-bg-favorite-bar");o&&o.nextSibling?c.insertBefore(t,o.nextSibling):c.appendChild(t)}}async function le(e,t,o){const n=window.location.hostname;try{return(await chrome.runtime.sendMessage({type:"SAVE_FAVORITE",payload:{slot:e,domain:n,entryId:t.id,mappings:o,createdAt:Date.now()}})).success}catch{return!1}}function ze(e,t){for(const o of t){const n=document.querySelector(o.selector);if(!n)continue;let r;if(o.source==="username")r=e.username;else if(o.source==="password")r=e.password;else if(o.source.startsWith("additional:")){const a=parseInt(o.source.split(":")[1],10);r=e.additionalFields?.[a]?.value}r!==void 0&&(n.value=r,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})))}J(e)}function Me(e,t){if(!c)return;c.innerHTML="";const o=M(e.title,()=>E());c.appendChild(o);const n=document.createElement("div");n.textContent="追加フィールドを編集",n.className="ss-bg-instruction",c.appendChild(n);const r=document.createElement("div");r.className="ss-bg-fields-container",r.style.maxHeight="250px",r.style.overflowY="auto";const a=e.additionalFields||[],s=[];a.forEach(m=>{const{row:f,inputs:v}=H(m.name,m.value,m.selector||"",m.sensitive===!0,s);r.appendChild(f),s.push(v)}),c.appendChild(r);const i=A("+ フィールドを追加",()=>{const{row:m,inputs:f}=H("","","",!1,s);r.appendChild(m),s.push(f)});i.style.background="#e3f2fd",i.style.color="#1976d2",c.appendChild(i);const d=document.createElement("button");d.textContent="保存",d.className="ss-bg-save-btn",d.addEventListener("click",async()=>{const m=s.map(p=>({name:p.nameInput.value.trim(),value:p.valueInput.value.trim(),selector:p.selectorInput.value.trim(),sensitive:p.sensitiveInput.checked})).filter(p=>p.name&&p.value),f={...e,additionalFields:m.length>0?m:void 0,updatedAt:Date.now()},v=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:f}});if(v.success)_(f);else{const p=document.createElement("div");p.textContent="保存に失敗しました: "+(v.error||"不明なエラー"),p.style.cssText=`
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `,c.appendChild(p),setTimeout(()=>{p.remove()},3e3)}}),c.appendChild(d);const l=A("戻る",()=>{_(e)});l.className="ss-bg-back-btn",c.appendChild(l)}function M(e,t){const o=document.createElement("div");o.className="ss-bg-title-bar";const n=document.createElement("div");n.textContent=e,n.className="ss-bg-title-text";const r=document.createElement("button");return r.textContent="×",r.className="ss-bg-close-btn",r.addEventListener("click",a=>{a.stopPropagation(),t()}),o.appendChild(n),o.appendChild(r),De(o,r),o}function De(e,t){let o=!1,n=0,r=0,a=0,s=0;e.addEventListener("mousedown",i=>{if(i.target===t)return;o=!0,n=i.clientX,r=i.clientY;const d=c.getBoundingClientRect();a=d.left,s=d.top,i.preventDefault()}),document.addEventListener("mousemove",i=>{if(o&&c){const d=i.clientX-n,l=i.clientY-r;c.style.left=`${a+d}px`,c.style.top=`${s+l}px`}}),document.addEventListener("mouseup",()=>{o=!1})}function _(e,t){if(!c)return;c.innerHTML="";const o=M(e.title,()=>E());c.appendChild(o);const n=document.createElement("div");n.textContent="入力する項目を選択",n.className="ss-bg-instruction",c.appendChild(n);const r=A("✏️ フィールドを編集...",()=>{Me(e)});r.style.background="#fff3e0",r.style.color="#e65100",r.style.marginBottom="12px",c.appendChild(r);const a=A("すべて入力 (ユーザー名 + パスワード)",async()=>{await ce(e),E()});if(a.addEventListener("mouseenter",()=>{Ue()}),a.addEventListener("mouseleave",()=>{B()}),c.appendChild(a),e.username){const i=A(`ユーザー名: ${e.username}`,()=>{O({value:e.username},e,"username")});i.addEventListener("mouseenter",()=>{x&&I(x)}),i.addEventListener("mouseleave",()=>{B()}),c.appendChild(i)}if(e.password){const i=A("パスワード: ••••••••",()=>{O({value:e.password},e,"password")});i.addEventListener("mouseenter",()=>{x&&I(x)}),i.addEventListener("mouseleave",()=>{B()}),c.appendChild(i)}e.additionalFields&&e.additionalFields.forEach((i,d)=>{const l=A(`${i.name}: ${i.sensitive?Ee:i.value}`,()=>{O({value:i.value},e,`additional:${d}`)});l.addEventListener("mouseenter",()=>{x&&I(x)}),l.addEventListener("mouseleave",()=>{B()}),c.appendChild(l)});const s=document.createElement("button");s.textContent="戻る",s.className="ss-bg-back-btn",s.addEventListener("click",async()=>{const i=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(i.success&&i.data){const d=x;E(),x=d,await q(i.data)}else console.error("[SS-BG] Failed to get passwords for back button:",i.error),E()}),c.appendChild(s),x&&I(x)}function A(e,t){const o=document.createElement("button");return o.textContent=e,o.className="ss-bg-field-button",o.addEventListener("click",t),o}function E(){h&&h.parentNode&&h.parentNode.removeChild(h),document.body.classList.remove("ss-bg-dialog-active"),B(),y=null,c=null,h=null,N=null,z&&typeof z.focus=="function"&&(z.focus(),z=null)}function Pe(e){e.classList.add($)}function I(e){Pe(e);const t=e.getBoundingClientRect(),o=document.createElement("div");o.style.cssText=`
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
  `,document.body.appendChild(o),G.push(o)}function Ue(e){B();const t=x?.closest("form")||document.querySelector("form");if(!t)return;const o=Array.from(t.querySelectorAll("input")),n=o.find(r=>r.type==="password"&&r.offsetParent!==null);if(n){I(n);const r=o.indexOf(n);for(let a=r-1;a>=0;a--){const s=o[a],i=W(s);if((i==="username"||i==="email"||i==="text")&&s.offsetParent!==null){I(s);break}}}}function B(){G.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),G=[],document.querySelectorAll(`.${$}`).forEach(e=>{e.classList.remove($)})}function V(){h&&E()}async function X(e){h=document.createElement("div"),h.id=e;const t=await j();(t==="light"||t==="dark")&&h.setAttribute("data-theme",t),h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,N=h.attachShadow({mode:"closed"})}function Y(e,t){const o=document.createElement("style");o.textContent=e,N.appendChild(o),N.appendChild(t),document.body.appendChild(h),z=document.activeElement;const n='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',r=t.querySelector(n);r&&r.focus();const a=t.querySelectorAll(n),s=a[0],i=a[a.length-1],d=l=>{l.key==="Tab"&&(l.shiftKey?document.activeElement===s&&(l.preventDefault(),i.focus()):document.activeElement===i&&(l.preventDefault(),s.focus()))};t.addEventListener("keydown",d)}async function K(e){V(),await X("ss-bg-error-dialog-host");const t=document.createElement("div");t.className="ss-bg-error-dialog-content",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true");const o=document.createElement("div");o.className="ss-bg-error-title",o.id="ss-bg-error-dialog-title",o.textContent="エラー",t.setAttribute("aria-labelledby","ss-bg-error-dialog-title");const n=document.createElement("div");n.className="ss-bg-error-message",n.textContent=e;const r=document.createElement("button");r.className="ss-bg-error-close-btn",r.textContent="閉じる",r.onclick=E,t.appendChild(o),t.appendChild(n),t.appendChild(r),Y(`
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
  `,t)}async function $e(e){return V(),await X("ss-bg-confirm-dialog-host"),new Promise(t=>{const o=document.createElement("div");o.className="ss-bg-confirm-dialog-content",o.setAttribute("role","dialog"),o.setAttribute("aria-modal","true");const n=document.createElement("div");n.className="ss-bg-confirm-title",n.id="ss-bg-confirm-dialog-title",n.textContent="確認",o.setAttribute("aria-labelledby","ss-bg-confirm-dialog-title");const r=document.createElement("div");r.className="ss-bg-confirm-message",r.textContent=e;const a=document.createElement("div");a.className="ss-bg-confirm-buttons";const s=document.createElement("button");s.className="ss-bg-confirm-btn ss-bg-confirm-cancel",s.textContent="キャンセル",s.onclick=()=>{E(),t(!1)};const i=document.createElement("button");i.className="ss-bg-confirm-btn ss-bg-confirm-ok",i.textContent="OK",i.onclick=()=>{E(),t(!0)},a.appendChild(s),a.appendChild(i),o.appendChild(n),o.appendChild(r),o.appendChild(a),Y(`
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
    `,o)})}function _e(){document.addEventListener("contextmenu",e=>{const t=e.target;t.tagName==="INPUT"&&(x=t)})}function Oe(){chrome.runtime.onMessage.addListener((e,t,o)=>e.type==="PING"?(o({pong:!0}),!0):e.type==="FILL_PASSWORD"?(ce(e.payload),o({success:!0}),!0):e.type==="FILL_FIELD"?(O(e.payload),o({success:!0}),!0):e.type==="SAVE_CURRENT_FORM"?(Re(),o({success:!0}),!0):e.type==="SHOW_PASSWORD_DIALOG"?(q(e.payload.candidates,e.payload.tabId).then(()=>{o({success:!0})}).catch(n=>{o({success:!1,error:n.message})}),!0):e.type==="EXECUTE_FAVORITE"?(ze(e.payload.entry,e.payload.mappings),o({success:!0}),!0):!1)}function J(e){chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:{...e,lastUsedAt:Date.now()}}})}async function ce(e){if(!x?.closest("form")){await K("対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。");return}const o=[];if(e.usernameSelector&&e.username){const r=document.querySelector(e.usernameSelector);r&&(r.value=e.username,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:e.usernameSelector,source:"username"}))}if(e.passwordSelector&&e.password){const r=document.querySelector(e.passwordSelector);r&&(r.value=e.password,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:e.passwordSelector,source:"password"}))}if(e.additionalFields&&e.additionalFields.forEach((r,a)=>{if(r.selector){const s=document.querySelector(r.selector);s&&(s.value=r.value,s.dispatchEvent(new Event("input",{bubbles:!0})),s.dispatchEvent(new Event("change",{bubbles:!0})),o.push({selector:r.selector,source:`additional:${a}`}))}}),!e.usernameSelector||!e.passwordSelector){const r=await He(e);o.push(...r)}y!==null&&o.length>0&&(await le(y,e,o),y=null);const n=await je(e);J(n??e)}async function He(e){const t=[],o=x?.closest("form")||document.querySelector("form");if(!o)return t;const n=Array.from(o.querySelectorAll("input")),r=n.find(a=>a.type==="password"&&a.offsetParent!==null);if(r&&e.password){r.value=e.password,r.dispatchEvent(new Event("input",{bubbles:!0})),r.dispatchEvent(new Event("change",{bubbles:!0}));const a=U(r);a&&t.push({selector:a,source:"password"});const s=n.indexOf(r);for(let i=s-1;i>=0;i--){const d=n[i],l=W(d);if((l==="username"||l==="email"||l==="text")&&d.offsetParent!==null&&e.username){d.value=e.username,d.dispatchEvent(new Event("input",{bubbles:!0})),d.dispatchEvent(new Event("change",{bubbles:!0}));const m=U(d);m&&t.push({selector:m,source:"username"});break}}}return t}async function O(e,t,o){const n=pe()||x;if(n){if(n.value=e.value,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),y!==null&&t&&o){const r=U(n);r&&(await le(y,t,[{selector:r,source:o}]),y=null)}t&&J(t)}}async function Re(){const e=fe();if(e.length===0){await K("フォームが見つかりません");return}const t=me(e[0]);if(!t.password){await K("パスワードフィールドが見つかりませんでした");return}await We(t)}async function We(e){V(),await X("ss-bg-save-form-dialog-host");const t=document.createElement("div");t.className="ss-bg-dialog-content";const o=await Le(),n=o?"rgba(30, 30, 30, 0.95)":"rgba(255, 255, 255, 0.95)",r=o?"#e0e0e0":"#333333";t.style.cssText=`
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
  `;const a=M("フォーム情報を保存",()=>E());t.appendChild(a);const s=T("タイトル",e.title||"");t.appendChild(s.group);const i=document.createElement("div");i.className="ss-bg-form-group";const d=document.createElement("label");d.className="ss-bg-form-label",d.textContent="URL";const l=document.createElement("textarea");l.className="ss-bg-form-textarea",l.value=e.urls?e.urls.join(`
`):"",l.rows=2,i.appendChild(d),i.appendChild(l),t.appendChild(i);const m=T("ユーザー名",e.username||"");t.appendChild(m.group);const f=T("パスワード",e.password||"","password");t.appendChild(f.group);const v=[];if(e.additionalFields&&e.additionalFields.length>0){const g=document.createElement("div");g.className="ss-bg-form-label",g.textContent="追加フィールド",g.style.marginBottom="4px",t.appendChild(g);for(const k of e.additionalFields){const u=document.createElement("div");u.className="ss-bg-field-row";const C=document.createElement("input");C.className="ss-bg-name-input",C.value=k.name,C.placeholder="名前";const S=document.createElement("input");S.className="ss-bg-value-input",S.value=k.value,S.placeholder="値",u.appendChild(C),u.appendChild(S),t.appendChild(u),v.push({nameInput:C,valueInput:S})}}const p=document.createElement("button");p.textContent="保存",p.className="ss-bg-save-btn",p.style.marginTop="8px",p.addEventListener("click",async()=>{const g={id:crypto.randomUUID(),title:s.input.value.trim()||e.title||"",urls:l.value.trim().split(`
`).map(u=>u.trim()).filter(Boolean),username:m.input.value,password:f.input.value,usernameSelector:e.usernameSelector,passwordSelector:e.passwordSelector,additionalFields:v.map((u,C)=>({name:u.nameInput.value.trim(),value:u.valueInput.value.trim(),selector:e.additionalFields?.[C]?.selector||""})).filter(u=>u.name&&u.value),createdAt:Date.now(),updatedAt:Date.now()};g.additionalFields&&g.additionalFields.length===0&&(g.additionalFields=void 0),p.disabled=!0,p.textContent="保存中...";const k=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:g});if(k.success){const u=document.createElement("div");u.className="ss-bg-success-message",u.textContent="保存しました",t.appendChild(u),setTimeout(()=>E(),1e3)}else{p.disabled=!1,p.textContent="保存";const u=document.createElement("div");u.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",u.textContent="保存に失敗しました: "+(k.error||"不明なエラー"),t.appendChild(u),setTimeout(()=>u.remove(),3e3)}}),t.appendChild(p);const w=document.createElement("button");w.textContent="キャンセル",w.className="ss-bg-cancel-btn",w.addEventListener("click",()=>E()),t.appendChild(w),c=t;const b=ne();Y(b,t)}function Ge(e,t){if(!c)return;c.innerHTML="",c.style.maxHeight="80vh";const o=M("エントリを編集",()=>E());c.appendChild(o);const n=T("タイトル",e.title);c.appendChild(n.group);const r=document.createElement("div");r.className="ss-bg-form-group";const a=document.createElement("label");a.className="ss-bg-form-label",a.textContent="URL (1行に1つ)";const s=document.createElement("textarea");s.className="ss-bg-form-textarea",s.value=e.urls.join(`
`),s.rows=2,r.appendChild(a),r.appendChild(s),c.appendChild(r);const i=T("ユーザー名",e.username);c.appendChild(i.group);const d=T("パスワード",e.password,"password");c.appendChild(d.group);const l=T("メモ",e.notes||"");c.appendChild(l.group);const m=[],f=document.createElement("div");if(f.className="ss-bg-fields-container",e.additionalFields&&e.additionalFields.length>0){const b=document.createElement("div");b.className="ss-bg-form-label",b.textContent="追加フィールド",b.style.marginBottom="4px",c.appendChild(b);for(const g of e.additionalFields){const{row:k,inputs:u}=H(g.name,g.value,g.selector||"",g.sensitive===!0,m);f.appendChild(k),m.push(u)}}c.appendChild(f);const v=A("+ フィールドを追加",()=>{const{row:b,inputs:g}=H("","","",!1,m);f.appendChild(b),m.push(g)});v.style.background="#e3f2fd",v.style.color="#1976d2",c.appendChild(v);const p=document.createElement("button");p.textContent="保存",p.className="ss-bg-save-btn",p.style.marginTop="8px",p.addEventListener("click",async()=>{const b=m.map(u=>({name:u.nameInput.value.trim(),value:u.valueInput.value.trim(),selector:u.selectorInput.value.trim(),sensitive:u.sensitiveInput.checked})).filter(u=>u.name&&u.value),g={...e,title:n.input.value.trim()||e.title,urls:s.value.trim().split(`
`).map(u=>u.trim()).filter(Boolean),username:i.input.value,password:d.input.value,notes:l.input.value.trim()||void 0,additionalFields:b.length>0?b:void 0,updatedAt:Date.now()};p.disabled=!0,p.textContent="保存中...";const k=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:g}});if(k.success){const u=document.createElement("div");u.className="ss-bg-success-message",u.textContent="保存しました",c.appendChild(u),setTimeout(()=>{_(g)},800)}else{p.disabled=!1,p.textContent="保存";const u=document.createElement("div");u.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",u.textContent="保存に失敗: "+(k.error||"不明なエラー"),c.appendChild(u),setTimeout(()=>u.remove(),3e3)}}),c.appendChild(p);const w=document.createElement("button");w.textContent="戻る",w.className="ss-bg-back-btn",w.addEventListener("click",async()=>{const b=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(b.success&&b.data){const g=x;E(),x=g,await q(b.data)}else E()}),c.appendChild(w)}function H(e,t,o,n,r,a){const s=document.createElement("div");s.className="ss-bg-field-row",s.style.padding="4px",s.style.marginBottom="4px",s.style.background="#f9f9f9",s.style.borderRadius="4px";const i=document.createElement("input");i.type="text",i.value=e,i.placeholder="名前",i.className="ss-bg-name-input";const d=document.createElement("input");d.type="text",d.value=t,d.placeholder="値",d.className="ss-bg-value-input";const l=document.createElement("input");l.type="checkbox",l.checked=n;const m=document.createElement("label");m.className="ss-bg-sensitive-label",m.appendChild(l),m.appendChild(document.createTextNode("secret"));const f=document.createElement("button");f.type="button",f.className="ss-bg-peek-btn";const v=document.createElement("div");v.className="ss-bg-value-wrap",v.appendChild(d),v.appendChild(f);let p=!1,w=null;function b(L){f.innerHTML=L?Se:ke,f.setAttribute("aria-label",L?"隠す":"表示"),f.title=L?"隠す":"表示"}function g(){const L=l.checked;f.style.display=L?"":"none",d.type=L&&!p?"password":"text"}function k(){p=!1,b(!1),w&&(clearTimeout(w),w=null),g()}f.addEventListener("click",()=>{if(p){k();return}p=!0,b(!0),g(),w&&clearTimeout(w),w=setTimeout(()=>{p&&k()},Ce)}),b(!1),l.addEventListener("change",()=>{l.checked?g():k()}),g();const u=document.createElement("input");u.type="text",u.value=o,u.placeholder="セレクタ",u.className="ss-bg-selector-input";const C=document.createElement("button");return C.textContent="削除",C.className="ss-bg-remove-btn",C.addEventListener("click",()=>{w&&clearTimeout(w),s.remove();const L=r.findIndex(R=>R.nameInput===i);L!==-1&&r.splice(L,1)}),s.appendChild(i),s.appendChild(v),s.appendChild(m),s.appendChild(u),s.appendChild(C),{row:s,inputs:{nameInput:i,valueInput:d,selectorInput:u,sensitiveInput:l}}}function T(e,t,o="text"){const n=document.createElement("div");n.className="ss-bg-form-group";const r=document.createElement("label");r.className="ss-bg-form-label",r.textContent=e;const a=document.createElement("input");return a.className="ss-bg-form-input",a.type=o,a.value=t,n.appendChild(r),n.appendChild(a),{group:n,input:a}}async function je(e){const t=window.location.href,o=te(t);if(ge(t,e.urls)>0||!await $e(`このサイト (${o}) は「${e.title}」の登録URLに含まれていません。

URLを追加しますか？`))return null;const a={...e,urls:[...e.urls,o],updatedAt:Date.now()};try{if((await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:a}})).success)return a}catch(s){console.error("[SS-BG] Error adding URL:",s)}return null}function de(){console.log("[bg-ss] Content script injected and initialized");try{Ne(),console.log("[bg-ss] Content script initialization complete")}catch(e){console.error("[bg-ss] Content script initialization failed:",e)}}console.log("[bg-ss] content-exports.js loaded"),de(),ee.main=de,Object.defineProperty(ee,Symbol.toStringTag,{value:"Module"})})(this.ContentScript=this.ContentScript||{});

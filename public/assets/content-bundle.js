(function(G){"use strict";function B(e){if(e.id)return`#${e.id}`;const o=e;if(o.name)return`input[name="${o.name}"]`;if(o.type){const n=e.closest("form");if(n){const a=Array.from(n.querySelectorAll(`input[type="${o.type}"]`)).indexOf(e);if(a>=0)return`form input[type="${o.type}"]:nth-of-type(${a+1})`}}const t=e.parentElement;if(t){const s=Array.from(t.children).indexOf(e);return`${t.tagName.toLowerCase()} > :nth-child(${s+1})`}return"input"}function M(e){const o=e.type.toLowerCase();if(o==="password")return"password";if(o==="email")return"email";if(o==="tel")return"tel";const t=e.name.toLowerCase(),n=["user","login","account","id","userid","username","loginid"],s=["email","mail"],a=["phone","tel","mobile"];if(n.some(c=>t.includes(c)))return"username";if(s.some(c=>t.includes(c)))return"email";if(a.some(c=>t.includes(c)))return"tel";const i=e.id.toLowerCase();if(n.some(c=>i.includes(c)))return"username";if(s.some(c=>i.includes(c)))return"email";if(a.some(c=>i.includes(c)))return"tel";const r=e.placeholder.toLowerCase();if(n.some(c=>r.includes(c)))return"username";if(s.some(c=>r.includes(c)))return"email";if(a.some(c=>r.includes(c)))return"tel";const m=e.autocomplete.toLowerCase();return m==="username"?"username":m==="email"?"email":m==="tel"?"tel":o==="text"||o===""?"text":"unknown"}function X(e){const o=Array.from(e.querySelectorAll("input")),t=[];for(const n of o){if(n.offsetParent===null||n.type==="hidden"||n.type==="submit"||n.type==="button")continue;const s=M(n),a=B(n);let i=50;n.type==="password"&&(i=100),n.type==="email"&&(i=90),n.name&&(i+=20),n.id&&(i+=10),t.push({element:n,type:s,confidence:Math.min(i,100),selector:a})}return t}function Y(){const e=document.activeElement;return e&&e.tagName==="INPUT"?e:null}function K(e){const o=X(e),t=window.location.href;let n="",s="",a="",i="";const r=[];for(const l of o){const g=l.element.value;if(g)if(l.type==="password"&&!s)s=g,i=l.selector;else if(l.type==="username"&&!n)n=g,a=l.selector;else if(l.type==="email"&&!n)n=g,a=l.selector;else{const f=l.element.name||l.element.placeholder||`フィールド${r.length+1}`;r.push({name:f,value:g,selector:l.selector})}}return{title:new URL(t).hostname,urls:[t],username:n,password:s,usernameSelector:a,passwordSelector:i,additionalFields:r.length>0?r:void 0}}function J(){return Array.from(document.querySelectorAll("form"))}function Q(e,o){if(o.length===0)return 0;let t;try{t=new URL(e)}catch{return 0}if(o.includes(e))return 2;for(const n of o)try{const s=new URL(n);if(t.hostname===s.hostname&&t.port===s.port)return 1}catch{continue}return 0}function Z(e){const o=e.trim();if(!o)return"";try{const t=new URL(o);let n=t.hostname+t.pathname;return t.port&&!(t.protocol==="http:"&&t.port==="80"||t.protocol==="https:"&&t.port==="443")&&(n=t.hostname+":"+t.port+t.pathname),n.endsWith("/")&&(n=n.slice(0,-1)),n}catch{return o}}let x=null,d=null,w=null,F=null,A=null,D=[];const T="ss-bg-highlight-target";let C=null;function ee(){te(),ue(),me(),ne()}function te(){if(document.getElementById("ss-bg-highlight-styles"))return;const e=document.createElement("style");e.id="ss-bg-highlight-styles",e.textContent=`
    .${T} {
      outline: 2px solid #4CAF50 !important;
      outline-offset: 1px !important;
      background-color: rgba(76, 175, 80, 0.05) !important;
    }
  `,document.head.appendChild(e)}function ne(){document.addEventListener("keydown",e=>{e.key==="Escape"&&w&&E()}),document.addEventListener("focusin",e=>{const o=e.target;(o.tagName==="INPUT"||o.tagName==="TEXTAREA")&&(F&&F.contains(o)||(x=o))})}function oe(e){const s=window.innerWidth,a=window.innerHeight;return s-e.right>=360?{left:e.right+10,top:Math.max(10,Math.min(e.top,a-300-10))}:e.left>=360?{left:e.left-350-10,top:Math.max(10,Math.min(e.top,a-300-10))}:a-e.bottom>=310?{left:Math.max(10,Math.min(e.left,s-350-10)),top:e.bottom+10}:{left:Math.max(10,Math.min(e.left,s-350-10)),top:Math.max(10,e.top-300-10)}}function W(){return`
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
    .ss-bg-favorite-bar {
      display: flex;
      gap: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    .ss-bg-favorite-star {
      width: 28px;
      height: 28px;
      background: none;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-favorite-star:hover {
      border-color: #FFB300;
      color: #FFB300;
      background: #FFFDE7;
    }
    .ss-bg-favorite-star.active {
      border-color: #FFB300;
      background: #FFF8E1;
      color: #E65100;
    }
    .ss-bg-favorite-star.registered {
      border-color: #FFB300;
      color: #FFB300;
    }
    .ss-bg-favorite-label {
      font-size: 11px;
      color: #999;
      align-self: center;
      margin-left: 4px;
    }
    .ss-bg-favorite-register-indicator {
      padding: 4px 8px;
      margin-bottom: 4px;
      background: #FFF8E1;
      border: 1px solid #FFB300;
      border-radius: 2px;
      font-size: 11px;
      color: #E65100;
      text-align: center;
    }
    .ss-bg-form-group {
      margin-bottom: 8px;
    }
    .ss-bg-form-label {
      display: block;
      font-size: 11px;
      color: #666;
      margin-bottom: 2px;
    }
    .ss-bg-form-input {
      width: 100%;
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 13px;
      box-sizing: border-box;
    }
    .ss-bg-form-input:focus {
      outline: none;
      border-color: #4CAF50;
    }
    .ss-bg-form-textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 2px;
      font-size: 13px;
      box-sizing: border-box;
      resize: vertical;
      min-height: 40px;
    }
    .ss-bg-form-textarea:focus {
      outline: none;
      border-color: #4CAF50;
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
      background: #f5f5f5;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ss-bg-edit-btn:hover {
      background: #e0e0e0;
      color: #333;
    }
    .ss-bg-success-message {
      color: #2e7d32;
      background: #e8f5e9;
      padding: 8px;
      border-radius: 2px;
      margin-top: 4px;
      font-size: 12px;
      text-align: center;
    }
  `}async function $(e,o){if(w)return;const t=x||document.activeElement;if(!t||t.tagName!=="INPUT"&&t.tagName!=="TEXTAREA"){const l=document.querySelector('input[type="password"], input[type="text"], input[type="email"]');if(!l)return;x=l}const n=(x||t).getBoundingClientRect(),s=oe(n);w=document.createElement("div"),w.id="ss-bg-dialog-host",w.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,F=w.attachShadow({mode:"closed"});const a=document.createElement("style");a.textContent=W(),F.appendChild(a),d=document.createElement("div"),d.className="ss-bg-dialog-content",d.style.cssText=`
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
  `;const i=I("パスワードを選択",()=>E());d.appendChild(i);const r=await se();if(d.appendChild(r),C!==null){const l=document.createElement("div");l.className="ss-bg-favorite-register-indicator",l.textContent=`お気に入り ${C} に登録します`,d.appendChild(l)}if(e.length===0){const l=document.createElement("div");l.textContent="候補が見つかりません",l.className="ss-bg-empty-message",d.appendChild(l)}else e.forEach(l=>{const g=document.createElement("div");g.className="ss-bg-password-item-row";const f=document.createElement("button");f.className="ss-bg-password-item";const u=document.createElement("div");u.textContent=l.title,u.className="ss-bg-item-title";const h=document.createElement("div");h.textContent=l.username,h.className="ss-bg-item-username",f.appendChild(u),f.appendChild(h),f.addEventListener("click",async()=>{z(l)});const p=document.createElement("button");p.className="ss-bg-edit-btn",p.textContent="✎",p.title="編集",p.addEventListener("click",b=>{b.stopPropagation(),he(l)}),g.appendChild(f),g.appendChild(p),d.appendChild(g)});const m=document.createElement("button");m.textContent="キャンセル",m.className="ss-bg-cancel-btn",m.addEventListener("click",E),d.appendChild(m),F.appendChild(d),document.body.appendChild(w),document.body.classList.add("ss-bg-dialog-active");const c=new MutationObserver(()=>{w&&document.body.contains(w)});c.observe(document.body,{childList:!0}),setTimeout(()=>c.disconnect(),1e4)}async function se(){const e=document.createElement("div");e.className="ss-bg-favorite-bar";const o=document.createElement("span");o.className="ss-bg-favorite-label",o.textContent="お気に入り:",e.appendChild(o);const t=window.location.hostname;let n=[];try{const s=await chrome.runtime.sendMessage({type:"GET_FAVORITES",payload:{domain:t}});s.success&&Array.isArray(s.data)&&(n=s.data.map(a=>a.slot))}catch{}for(let s=1;s<=3;s++){const a=s,i=document.createElement("button");i.className="ss-bg-favorite-star",n.includes(a)&&i.classList.add("registered"),C===a&&i.classList.add("active"),i.textContent=`${a}`,i.title=n.includes(a)?`お気に入り ${a} (登録済み) - クリックで登録モード切替`:`お気に入り ${a} - クリックで登録モード`,i.addEventListener("click",r=>{r.stopPropagation(),C===a?C=null:C=a,e.querySelectorAll(".ss-bg-favorite-star").forEach((c,l)=>{c.classList.toggle("active",l+1===C)}),ae()}),e.appendChild(i)}return e}function ae(){if(!d||!F)return;const e=d.querySelector(".ss-bg-favorite-register-indicator");if(e&&e.remove(),C!==null){const o=document.createElement("div");o.className="ss-bg-favorite-register-indicator",o.textContent=`お気に入り ${C} に登録します`;const t=d.querySelector(".ss-bg-favorite-bar");t&&t.nextSibling?d.insertBefore(o,t.nextSibling):d.appendChild(o)}}async function q(e,o,t){const n=window.location.hostname;try{return(await chrome.runtime.sendMessage({type:"SAVE_FAVORITE",payload:{slot:e,domain:n,entryId:o.id,mappings:t,createdAt:Date.now()}})).success}catch{return!1}}function ie(e,o){for(const t of o){const n=document.querySelector(t.selector);if(!n)continue;let s;if(t.source==="username")s=e.username;else if(t.source==="password")s=e.password;else if(t.source.startsWith("additional:")){const a=parseInt(t.source.split(":")[1],10);s=e.additionalFields?.[a]?.value}s!==void 0&&(n.value=s,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})))}}function re(e,o){if(!d)return;d.innerHTML="";const t=I(e.title,()=>E());d.appendChild(t);const n=document.createElement("div");n.textContent="追加フィールドを編集",n.className="ss-bg-instruction",d.appendChild(n);const s=document.createElement("div");s.className="ss-bg-fields-container",s.style.maxHeight="250px",s.style.overflowY="auto";const a=e.additionalFields||[],i=[];a.forEach((l,g)=>{const f=document.createElement("div");f.className="ss-bg-field-row",f.style.padding="8px",f.style.marginBottom="8px",f.style.background="#f9f9f9",f.style.borderRadius="4px";const u=document.createElement("input");u.type="text",u.value=l.name,u.placeholder="フィールド名",u.className="ss-bg-name-input";const h=document.createElement("input");h.type="text",h.value=l.value,h.placeholder="値",h.className="ss-bg-value-input";const p=document.createElement("input");p.type="text",p.value=l.selector||"",p.placeholder="セレクタ（省略可）",p.className="ss-bg-selector-input";const b=document.createElement("button");b.textContent="削除",b.className="ss-bg-remove-btn",b.style.alignSelf="flex-start",b.addEventListener("click",()=>{f.remove();const y=i.findIndex(v=>v.nameInput===u);y!==-1&&i.splice(y,1)}),f.appendChild(u),f.appendChild(h),f.appendChild(p),f.appendChild(b),s.appendChild(f),i.push({nameInput:u,valueInput:h,selectorInput:p})}),d.appendChild(s);const r=S("+ フィールドを追加",()=>{const l=document.createElement("div");l.className="ss-bg-field-row",l.style.padding="8px",l.style.marginBottom="8px",l.style.background="#f9f9f9",l.style.borderRadius="4px";const g=document.createElement("input");g.type="text",g.placeholder="フィールド名",g.className="ss-bg-name-input";const f=document.createElement("input");f.type="text",f.placeholder="値",f.className="ss-bg-value-input";const u=document.createElement("input");u.type="text",u.placeholder="セレクタ（省略可）",u.className="ss-bg-selector-input";const h=document.createElement("button");h.textContent="削除",h.className="ss-bg-remove-btn",h.style.alignSelf="flex-start",h.addEventListener("click",()=>{l.remove();const p=i.findIndex(b=>b.nameInput===g);p!==-1&&i.splice(p,1)}),l.appendChild(g),l.appendChild(f),l.appendChild(u),l.appendChild(h),s.appendChild(l),i.push({nameInput:g,valueInput:f,selectorInput:u})});r.style.background="#e3f2fd",r.style.color="#1976d2",d.appendChild(r);const m=document.createElement("button");m.textContent="保存",m.className="ss-bg-save-btn",m.addEventListener("click",async()=>{const l=i.map(u=>({name:u.nameInput.value.trim(),value:u.valueInput.value.trim(),selector:u.selectorInput.value.trim()})).filter(u=>u.name&&u.value),g={...e,additionalFields:l.length>0?l:void 0,updatedAt:Date.now()},f=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:g});if(f.success)z(g);else{const u=document.createElement("div");u.textContent="保存に失敗しました: "+(f.error||"不明なエラー"),u.style.cssText=`
        color: #d32f2f;
        background: #ffebee;
        padding: 8px;
        border-radius: 2px;
        margin-top: 4px;
        font-size: 12px;
      `,d.appendChild(u),setTimeout(()=>{u.remove()},3e3)}}),d.appendChild(m);const c=S("戻る",()=>{z(e)});c.className="ss-bg-back-btn",d.appendChild(c)}function I(e,o){const t=document.createElement("div");t.className="ss-bg-title-bar";const n=document.createElement("div");n.textContent=e,n.className="ss-bg-title-text";const s=document.createElement("button");return s.textContent="×",s.className="ss-bg-close-btn",s.addEventListener("click",a=>{a.stopPropagation(),o()}),t.appendChild(n),t.appendChild(s),le(t,s),t}function le(e,o){let t=!1,n=0,s=0,a=0,i=0;e.addEventListener("mousedown",r=>{if(r.target===o)return;t=!0,n=r.clientX,s=r.clientY;const m=d.getBoundingClientRect();a=m.left,i=m.top,r.preventDefault()}),document.addEventListener("mousemove",r=>{if(t&&d){const m=r.clientX-n,c=r.clientY-s;d.style.left=`${a+m}px`,d.style.top=`${i+c}px`}}),document.addEventListener("mouseup",()=>{t=!1})}function z(e,o){if(!d)return;d.innerHTML="";const t=I(e.title,()=>E());d.appendChild(t);const n=document.createElement("div");n.textContent="入力する項目を選択",n.className="ss-bg-instruction",d.appendChild(n);const s=S("✏️ フィールドを編集...",()=>{re(e)});s.style.background="#fff3e0",s.style.color="#e65100",s.style.marginBottom="12px",d.appendChild(s);const a=S("すべて入力 (ユーザー名 + パスワード)",async()=>{await _(e),E()});if(a.addEventListener("mouseenter",()=>{ce()}),a.addEventListener("mouseleave",()=>{L()}),d.appendChild(a),e.username){const r=S(`ユーザー名: ${e.username}`,()=>{P({value:e.username},e,"username")});r.addEventListener("mouseenter",()=>{x&&k(x)}),r.addEventListener("mouseleave",()=>{L()}),d.appendChild(r)}if(e.password){const r=S("パスワード: ••••••••",()=>{P({value:e.password},e,"password")});r.addEventListener("mouseenter",()=>{x&&k(x)}),r.addEventListener("mouseleave",()=>{L()}),d.appendChild(r)}e.additionalFields&&e.additionalFields.forEach((r,m)=>{const c=S(`${r.name}: ${r.value}`,()=>{P({value:r.value},e,`additional:${m}`)});c.addEventListener("mouseenter",()=>{x&&k(x)}),c.addEventListener("mouseleave",()=>{L()}),d.appendChild(c)});const i=document.createElement("button");i.textContent="戻る",i.className="ss-bg-back-btn",i.addEventListener("click",async()=>{const r=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(r.success&&r.data){const m=x;E(),x=m,await $(r.data)}else console.error("[SS-BG] Failed to get passwords for back button:",r.error),E()}),d.appendChild(i),x&&k(x)}function S(e,o){const t=document.createElement("button");return t.textContent=e,t.className="ss-bg-field-button",t.addEventListener("click",o),t}function E(){w&&w.parentNode&&w.parentNode.removeChild(w),document.body.classList.remove("ss-bg-dialog-active"),L(),C=null,d=null,w=null,F=null,A&&typeof A.focus=="function"&&(A.focus(),A=null)}function de(e){e.classList.add(T)}function k(e){de(e);const o=e.getBoundingClientRect(),t=document.createElement("div");t.style.cssText=`
    position: fixed;
    top: ${o.top}px;
    left: ${o.left}px;
    width: ${o.width}px;
    height: ${o.height}px;
    border: 2px solid #4CAF50;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
    background: rgba(76, 175, 80, 0.1);
  `,document.body.appendChild(t),D.push(t)}function ce(e){L();const o=x?.closest("form")||document.querySelector("form");if(!o)return;const t=Array.from(o.querySelectorAll("input")),n=t.find(s=>s.type==="password"&&s.offsetParent!==null);if(n){k(n);const s=t.indexOf(n);for(let a=s-1;a>=0;a--){const i=t[a],r=M(i);if((r==="username"||r==="email"||r==="text")&&i.offsetParent!==null){k(i);break}}}}function L(){D.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),D=[],document.querySelectorAll(`.${T}`).forEach(e=>{e.classList.remove(T)})}function O(){w&&E()}function H(e){w=document.createElement("div"),w.id=e,w.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none;
  `,F=w.attachShadow({mode:"closed"})}function R(e,o){const t=document.createElement("style");t.textContent=e,F.appendChild(t),F.appendChild(o),document.body.appendChild(w),A=document.activeElement;const n='button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',s=o.querySelector(n);s&&s.focus();const a=o.querySelectorAll(n),i=a[0],r=a[a.length-1],m=c=>{c.key==="Tab"&&(c.shiftKey?document.activeElement===i&&(c.preventDefault(),r.focus()):document.activeElement===r&&(c.preventDefault(),i.focus()))};o.addEventListener("keydown",m)}function U(e){O(),H("ss-bg-error-dialog-host");const o=document.createElement("div");o.className="ss-bg-error-dialog-content",o.setAttribute("role","dialog"),o.setAttribute("aria-modal","true");const t=document.createElement("div");t.className="ss-bg-error-title",t.id="ss-bg-error-dialog-title",t.textContent="エラー",o.setAttribute("aria-labelledby","ss-bg-error-dialog-title");const n=document.createElement("div");n.className="ss-bg-error-message",n.textContent=e;const s=document.createElement("button");s.className="ss-bg-error-close-btn",s.textContent="閉じる",s.onclick=E,o.appendChild(t),o.appendChild(n),o.appendChild(s),R(`
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
  `,o)}function pe(e){return new Promise(o=>{O(),H("ss-bg-confirm-dialog-host");const t=document.createElement("div");t.className="ss-bg-confirm-dialog-content",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true");const n=document.createElement("div");n.className="ss-bg-confirm-title",n.id="ss-bg-confirm-dialog-title",n.textContent="確認",t.setAttribute("aria-labelledby","ss-bg-confirm-dialog-title");const s=document.createElement("div");s.className="ss-bg-confirm-message",s.textContent=e;const a=document.createElement("div");a.className="ss-bg-confirm-buttons";const i=document.createElement("button");i.className="ss-bg-confirm-btn ss-bg-confirm-cancel",i.textContent="キャンセル",i.onclick=()=>{E(),o(!1)};const r=document.createElement("button");r.className="ss-bg-confirm-btn ss-bg-confirm-ok",r.textContent="OK",r.onclick=()=>{E(),o(!0)},a.appendChild(i),a.appendChild(r),t.appendChild(n),t.appendChild(s),t.appendChild(a),R(`
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
    `,t)})}function ue(){document.addEventListener("contextmenu",e=>{const o=e.target;o.tagName==="INPUT"&&(x=o)})}function me(){chrome.runtime.onMessage.addListener((e,o,t)=>e.type==="PING"?(t({pong:!0}),!0):e.type==="FILL_PASSWORD"?(_(e.payload),t({success:!0}),!0):e.type==="FILL_FIELD"?(P(e.payload),t({success:!0}),!0):e.type==="SAVE_CURRENT_FORM"?(ge(),t({success:!0}),!0):e.type==="SHOW_PASSWORD_DIALOG"?($(e.payload.candidates,e.payload.tabId).then(()=>{t({success:!0})}).catch(n=>{t({success:!1,error:n.message})}),!0):e.type==="EXECUTE_FAVORITE"?(ie(e.payload.entry,e.payload.mappings),t({success:!0}),!0):!1)}async function _(e){if(!x?.closest("form")){U("対象のフォームを特定できませんでした。入力したいフォーム内のフィールドを一度クリックしてから再度お試しください。");return}const t=[];if(e.usernameSelector&&e.username){const n=document.querySelector(e.usernameSelector);n&&(n.value=e.username,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:e.usernameSelector,source:"username"}))}if(e.passwordSelector&&e.password){const n=document.querySelector(e.passwordSelector);n&&(n.value=e.password,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:e.passwordSelector,source:"password"}))}if(e.additionalFields&&e.additionalFields.forEach((n,s)=>{if(n.selector){const a=document.querySelector(n.selector);a&&(a.value=n.value,a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0})),t.push({selector:n.selector,source:`additional:${s}`}))}}),!e.usernameSelector||!e.passwordSelector){const n=await fe(e);t.push(...n)}C!==null&&t.length>0&&(await q(C,e,t),C=null),await xe(e)}async function fe(e){const o=[],t=x?.closest("form")||document.querySelector("form");if(!t)return o;const n=Array.from(t.querySelectorAll("input")),s=n.find(a=>a.type==="password"&&a.offsetParent!==null);if(s&&e.password){s.value=e.password,s.dispatchEvent(new Event("input",{bubbles:!0})),s.dispatchEvent(new Event("change",{bubbles:!0}));const a=B(s);a&&o.push({selector:a,source:"password"});const i=n.indexOf(s);for(let r=i-1;r>=0;r--){const m=n[r],c=M(m);if((c==="username"||c==="email"||c==="text")&&m.offsetParent!==null&&e.username){m.value=e.username,m.dispatchEvent(new Event("input",{bubbles:!0})),m.dispatchEvent(new Event("change",{bubbles:!0}));const l=B(m);l&&o.push({selector:l,source:"username"});break}}}return o}async function P(e,o,t){const n=Y()||x;if(n&&(n.value=e.value,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0})),C!==null&&o&&t)){const s=B(n);s&&(await q(C,o,[{selector:s,source:t}]),C=null)}}async function ge(){const e=J();if(e.length===0){U("フォームが見つかりません");return}const o=K(e[0]);if(!o.password){U("パスワードフィールドが見つかりませんでした");return}be(o)}function be(e){O(),H("ss-bg-save-form-dialog-host");const o=document.createElement("div");o.className="ss-bg-dialog-content",o.style.cssText=`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    pointer-events: auto;
  `;const t=I("フォーム情報を保存",()=>E());o.appendChild(t);const n=N("タイトル",e.title||"");o.appendChild(n.group);const s=document.createElement("div");s.className="ss-bg-form-group";const a=document.createElement("label");a.className="ss-bg-form-label",a.textContent="URL";const i=document.createElement("textarea");i.className="ss-bg-form-textarea",i.value=e.urls?e.urls.join(`
`):"",i.rows=2,s.appendChild(a),s.appendChild(i),o.appendChild(s);const r=N("ユーザー名",e.username||"");o.appendChild(r.group);const m=N("パスワード",e.password||"","password");o.appendChild(m.group);const c=[];if(e.additionalFields&&e.additionalFields.length>0){const u=document.createElement("div");u.className="ss-bg-form-label",u.textContent="追加フィールド",u.style.marginBottom="4px",o.appendChild(u);for(const h of e.additionalFields){const p=document.createElement("div");p.className="ss-bg-field-row";const b=document.createElement("input");b.className="ss-bg-name-input",b.value=h.name,b.placeholder="名前";const y=document.createElement("input");y.className="ss-bg-value-input",y.value=h.value,y.placeholder="値",p.appendChild(b),p.appendChild(y),o.appendChild(p),c.push({nameInput:b,valueInput:y})}}const l=document.createElement("button");l.textContent="保存",l.className="ss-bg-save-btn",l.style.marginTop="8px",l.addEventListener("click",async()=>{const u={id:crypto.randomUUID(),title:n.input.value.trim()||e.title||"",urls:i.value.trim().split(`
`).map(p=>p.trim()).filter(Boolean),username:r.input.value,password:m.input.value,usernameSelector:e.usernameSelector,passwordSelector:e.passwordSelector,additionalFields:c.map((p,b)=>({name:p.nameInput.value.trim(),value:p.valueInput.value.trim(),selector:e.additionalFields?.[b]?.selector||""})).filter(p=>p.name&&p.value),createdAt:Date.now(),updatedAt:Date.now()};u.additionalFields&&u.additionalFields.length===0&&(u.additionalFields=void 0),l.disabled=!0,l.textContent="保存中...";const h=await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:u});if(h.success){const p=document.createElement("div");p.className="ss-bg-success-message",p.textContent="保存しました",o.appendChild(p),setTimeout(()=>E(),1e3)}else{l.disabled=!1,l.textContent="保存";const p=document.createElement("div");p.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",p.textContent="保存に失敗しました: "+(h.error||"不明なエラー"),o.appendChild(p),setTimeout(()=>p.remove(),3e3)}}),o.appendChild(l);const g=document.createElement("button");g.textContent="キャンセル",g.className="ss-bg-cancel-btn",g.addEventListener("click",()=>E()),o.appendChild(g),d=o;const f=W();R(f,o)}function he(e,o){if(!d)return;d.innerHTML="",d.style.maxHeight="80vh";const t=I("エントリを編集",()=>E());d.appendChild(t);const n=N("タイトル",e.title);d.appendChild(n.group);const s=document.createElement("div");s.className="ss-bg-form-group";const a=document.createElement("label");a.className="ss-bg-form-label",a.textContent="URL (1行に1つ)";const i=document.createElement("textarea");i.className="ss-bg-form-textarea",i.value=e.urls.join(`
`),i.rows=2,s.appendChild(a),s.appendChild(i),d.appendChild(s);const r=N("ユーザー名",e.username);d.appendChild(r.group);const m=N("パスワード",e.password,"password");d.appendChild(m.group);const c=N("メモ",e.notes||"");d.appendChild(c.group);const l=[],g=document.createElement("div");if(g.className="ss-bg-fields-container",e.additionalFields&&e.additionalFields.length>0){const p=document.createElement("div");p.className="ss-bg-form-label",p.textContent="追加フィールド",p.style.marginBottom="4px",d.appendChild(p);for(const b of e.additionalFields){const{row:y,inputs:v}=j(b.name,b.value,b.selector||"",l);g.appendChild(y),l.push(v)}}d.appendChild(g);const f=S("+ フィールドを追加",()=>{const{row:p,inputs:b}=j("","","",l);g.appendChild(p),l.push(b)});f.style.background="#e3f2fd",f.style.color="#1976d2",d.appendChild(f);const u=document.createElement("button");u.textContent="保存",u.className="ss-bg-save-btn",u.style.marginTop="8px",u.addEventListener("click",async()=>{const p=l.map(v=>({name:v.nameInput.value.trim(),value:v.valueInput.value.trim(),selector:v.selectorInput.value.trim()})).filter(v=>v.name&&v.value),b={...e,title:n.input.value.trim()||e.title,urls:i.value.trim().split(`
`).map(v=>v.trim()).filter(Boolean),username:r.input.value,password:m.input.value,notes:c.input.value.trim()||void 0,additionalFields:p.length>0?p:void 0,updatedAt:Date.now()};u.disabled=!0,u.textContent="保存中...";const y=await chrome.runtime.sendMessage({type:"UPDATE_PASSWORD",payload:{id:e.id,entry:b}});if(y.success){const v=document.createElement("div");v.className="ss-bg-success-message",v.textContent="保存しました",d.appendChild(v),setTimeout(()=>{z(b)},800)}else{u.disabled=!1,u.textContent="保存";const v=document.createElement("div");v.style.cssText="color:#d32f2f;background:#ffebee;padding:8px;border-radius:2px;margin-top:4px;font-size:12px;",v.textContent="保存に失敗: "+(y.error||"不明なエラー"),d.appendChild(v),setTimeout(()=>v.remove(),3e3)}}),d.appendChild(u);const h=document.createElement("button");h.textContent="戻る",h.className="ss-bg-back-btn",h.addEventListener("click",async()=>{const p=await chrome.runtime.sendMessage({type:"GET_PASSWORDS"});if(p.success&&p.data){const b=x;E(),x=b,await $(p.data)}else E()}),d.appendChild(h)}function j(e,o,t,n,s){const a=document.createElement("div");a.className="ss-bg-field-row",a.style.padding="4px",a.style.marginBottom="4px",a.style.background="#f9f9f9",a.style.borderRadius="4px";const i=document.createElement("input");i.type="text",i.value=e,i.placeholder="名前",i.className="ss-bg-name-input";const r=document.createElement("input");r.type="text",r.value=o,r.placeholder="値",r.className="ss-bg-value-input";const m=document.createElement("input");m.type="text",m.value=t,m.placeholder="セレクタ",m.className="ss-bg-selector-input";const c=document.createElement("button");return c.textContent="削除",c.className="ss-bg-remove-btn",c.addEventListener("click",()=>{a.remove();const g=n.findIndex(f=>f.nameInput===i);g!==-1&&n.splice(g,1)}),a.appendChild(i),a.appendChild(r),a.appendChild(m),a.appendChild(c),{row:a,inputs:{nameInput:i,valueInput:r,selectorInput:m}}}function N(e,o,t="text"){const n=document.createElement("div");n.className="ss-bg-form-group";const s=document.createElement("label");s.className="ss-bg-form-label",s.textContent=e;const a=document.createElement("input");return a.className="ss-bg-form-input",a.type=t,a.value=o,n.appendChild(s),n.appendChild(a),{group:n,input:a}}async function xe(e){const o=window.location.href,t=Z(o);if(Q(o,e.urls)>0||!await pe(`このサイト (${t}) は「${e.title}」の登録URLに含まれていません。

URLを追加しますか？`))return;const a={...e,urls:[...e.urls,t],updatedAt:Date.now()};try{(await chrome.runtime.sendMessage({type:"SAVE_PASSWORD",payload:a})).success}catch(i){console.error("[SS-BG] Error adding URL:",i)}}function V(){console.log("[bg-ss] Content script injected and initialized");try{ee(),console.log("[bg-ss] Content script initialization complete")}catch(e){console.error("[bg-ss] Content script initialization failed:",e)}}console.log("[bg-ss] content-exports.js loaded"),V(),G.main=V,Object.defineProperty(G,Symbol.toStringTag,{value:"Module"})})(this.ContentScript=this.ContentScript||{});

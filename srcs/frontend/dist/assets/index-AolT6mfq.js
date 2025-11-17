(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function t(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(a){if(a.ep)return;a.ep=!0;const i=t(a);fetch(a.href,i)}})();class z{constructor(e){this.routes=new Map,this.target=e,window.addEventListener("hashchange",()=>this.handleRoute())}register(e){this.routes.set(e.path,e.render)}init(){if(!location.hash){this.navigate("/auth",{replace:!0});return}this.handleRoute()}navigate(e,t){t!=null&&t.replace?(history.replaceState(null,"",`#${e}`),this.handleRoute()):location.hash=e}handleRoute(){const e=location.hash.replace(/^#/,"")||"/auth",t=this.routes.get(e);if(t){this.currentCleanup&&(this.currentCleanup(),this.currentCleanup=void 0),this.target.innerHTML="";const r=t(this.target);typeof r=="function"&&(this.currentCleanup=r)}}}const P=`
  :root {
    color-scheme: light dark;
    font-family: "Inter", system-ui, sans-serif;
    background: radial-gradient(circle at top left, #1d8cf8 0%, transparent 55%), var(--bg, #f5f7fb);
    min-height: 100vh;
  }

  body {
    margin: 0;
  }

  .app {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    color: #0f172a;
  }

  .app__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 32px;
  }

  .app__header h1 {
    margin: 0;
    font-size: 2.4rem;
  }

  .app__header p {
    margin: 4px 0 0;
    color: #334155;
  }

  .app__hint {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .session-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    background: rgba(15, 23, 42, 0.06);
    border-radius: 12px;
    padding: 8px 14px;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .session-banner p {
    margin: 0;
    font-size: 0.9rem;
    color: #1e293b;
  }

  /* Oyun tuşuna basıldığında logout ile yan yana durabilmesi için aksiyon container'ı. */
  .session-banner__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .session-banner--empty {
    background: rgba(148, 163, 184, 0.12);
    border-style: dashed;
    color: #64748b;
  }

  .app__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
  }

  .card {
    background: rgba(255, 255, 255, 0.82);
    border-radius: 16px;
    padding: 22px 24px;
    box-shadow: 0 18px 35px -20px rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .card h2 {
    margin: 0 0 16px;
    font-size: 1.2rem;
    color: #0f172a;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.95rem;
    color: #1e293b;
  }

  .form__field input {
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.45);
    padding: 10px 12px;
    font-size: 0.95rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .form__field input:focus {
    outline: none;
    border-color: #1d8cf8;
    box-shadow: 0 0 0 3px rgba(29, 140, 248, 0.2);
  }

  .form__feedback {
    min-height: 16px;
    font-size: 0.8rem;
    color: #1e293b;
  }

  .form__feedback--error {
    color: #e11d48;
  }

  .button {
    background: linear-gradient(135deg, #1d8cf8, #845ef7);
    color: white;
    border: none;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .button:hover {
    box-shadow: 0 8px 18px -10px rgba(29, 140, 248, 0.75);
    transform: translateY(-1px);
  }

  .button:active {
    transform: translateY(0);
  }

  .button--secondary {
    background: transparent;
    color: #1d8cf8;
    border: 1px solid rgba(29, 140, 248, 0.4);
    box-shadow: none;
  }

  .button--secondary:hover {
    background: rgba(29, 140, 248, 0.08);
    box-shadow: none;
  }

  .status {
    min-height: 24px;
    margin-top: 16px;
    font-size: 0.9rem;
    word-break: break-word;
  }

  .status--success {
    color: #0f9d58;
  }

  .status--error {
    color: #e11d48;
  }

  code {
    background: rgba(15, 23, 42, 0.06);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 0.9em;
  }

  .game__canvas-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    padding: 24px 0 64px;
  }

  .game__canvas-wrapper canvas {
    max-width: min(90vw, 960px);
    border-radius: 12px;
    box-shadow: 0 18px 35px -20px rgba(15, 23, 42, 0.5);
  }

  .game__score {
    position: absolute;
    top: 24px;
    right: clamp(16px, 8vw, 64px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(15, 23, 42, 0.75);
    color: #f8fafc;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
  }

  .game__controls {
    text-align: right;
    font-size: 0.95rem;
    color: #1e293b;
  }
`;let b=null;const $=()=>{b||(b=document.createElement("style"),b.textContent=P,document.head.appendChild(b))},w="transcendence_user",y=s=>{localStorage.setItem(w,JSON.stringify(s))},C=()=>{const s=localStorage.getItem(w);if(!s)return null;try{return JSON.parse(s)}catch{return x(),null}},x=()=>{localStorage.removeItem(w)},_=s=>s.replace(/[&<>'"]/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";case"'":return"&#39;";default:return e}}),M=s=>{const e=C(),t=document.createElement("div");if(t.className="session-banner",!e)return t.classList.add("session-banner--empty"),t.innerHTML="<p>Henüz giriş yapılmadı.</p>",t;t.innerHTML=`
    <p>Giriş yapıldı: <strong>${_(e.nickname)}</strong> (${_(e.email)})</p>
    <div class="session-banner__actions">
      <button class="button" type="button" data-action="play">Play Now</button>
      <button class="button button--secondary" type="button" data-action="logout">Çıkış</button>
    </div>
  `;const r=t.querySelector('[data-action="play"]');r&&r.addEventListener("click",()=>{location.hash="/game"});const a=t.querySelector('[data-action="logout"]');return a&&a.addEventListener("click",async()=>{try{await fetch("/api/users/logout",{method:"POST",credentials:"include"})}catch(i){console.warn("Logout isteği başarısız oldu:",i)}finally{x(),s()}}),t},d=s=>typeof s=="string"?s:"",c=(s,e,t,r,a)=>{const i=[a!=null&&a.minlength?`minlength="${a.minlength}"`:"",a!=null&&a.maxlength?`maxlength="${a.maxlength}"`:""].filter(Boolean).join(" ");return`
    <label class="form__field">
      <span>${s}</span>
      <input type="${t}" name="${e}" required ${i} placeholder="${r}"/>
      <small data-feedback-for="${e}" class="form__feedback"></small>
    </label>
  `},A=[{formId:"manual-register-form",title:"Manuel Kayıt",buttonLabel:"Kaydı Gönder",renderFields:()=>`
      ${c("E-posta","email","email","ornek@mail.com")}
      ${c("Kullanıcı adı","nickname","text","nickname",{minlength:3,maxlength:48})}
      ${c("Şifre","password","password","En az 8 karakter",{minlength:8})}
    `},{formId:"manual-login-form",title:"Manuel Giriş",buttonLabel:"Giriş Yap",renderFields:()=>`
      ${c("E-posta","email","email","ornek@mail.com")}
      ${c("Şifre","password","password","Şifren")}
    `},{formId:"google-register-form",title:"Google Kayıt",buttonLabel:"Google Kaydı",renderFields:()=>`
      ${c("Google ID","googleId","text","google-oauth-id")}
      ${c("E-posta","email","email","kullanici@gmail.com")}
      ${c("Kullanıcı adı","nickname","text","nickname")}
    `},{formId:"google-login-form",title:"Google Giriş",buttonLabel:"Google ile Giriş",renderFields:()=>c("Google ID","googleId","text","google-oauth-id")}],L=s=>{const e=Number(s.id),t=s.email,r=s.nickname,a=s.provider;return Number.isNaN(e)||typeof t!="string"||typeof r!="string"||a!=="local"&&a!=="google"?null:{id:e,email:t,nickname:r,provider:a}},B=s=>[{formId:"manual-register-form",endpoint:"/api/users/register",buildPayload:e=>({email:d(e.get("email")),nickname:d(e.get("nickname")),password:d(e.get("password"))}),successMessage:e=>`Kayıt tamamlandı: ${e.nickname??"kullanıcı"} (id: ${e.id}).`},{formId:"manual-login-form",endpoint:"/api/users/login",buildPayload:e=>({email:d(e.get("email")),password:d(e.get("password"))}),successMessage:()=>"Giriş başarılı. Oturum cookie üzerinde saklandı.",onSuccess:e=>{const t=L(e);t&&(y(t),s())}},{formId:"google-register-form",endpoint:"/api/users/register/google",buildPayload:e=>({googleId:d(e.get("googleId")),email:d(e.get("email")),nickname:d(e.get("nickname"))}),successMessage:()=>"Google kaydı tamamlandı."},{formId:"google-login-form",endpoint:"/api/users/login/google",buildPayload:e=>({googleId:d(e.get("googleId"))}),successMessage:()=>"Google girişi başarılı. Oturum cookie üzerinde saklandı.",onSuccess:e=>{const t=L(e);t&&(y(t),s())}}],m=(s,e,t,r="")=>{const a=s.querySelector(`.status[data-status-for="${e}"]`);if(a){if(a.classList.remove("status--success","status--error"),t==="loading"){a.textContent="İstek gönderiliyor...";return}a.textContent=r,t==="success"&&a.classList.add("status--success"),t==="error"&&a.classList.add("status--error")}},O=async()=>{try{const s=await fetch("/api/users/refresh",{method:"POST",credentials:"include"});if(!s.ok)return!1;const e=await s.json();return y(e),!0}catch(s){return console.warn("Oturum yenilemesi sırasında hata oluştu:",s),!1}},D=async s=>{try{const e=await fetch("/api/users/me",{credentials:"include"});if(e.ok){const t=await e.json();y(t)}else e.status===401&&await O()||x()}catch(e){console.warn("Oturum doğrulaması sırasında hata oluştu:",e)}finally{s()}},G=()=>{$();const s=document.createElement("main");s.className="app";const e=A.map(n=>`
        <section class="card">
          <h2>${n.title}</h2>
          <form id="${n.formId}" class="form">
            ${n.renderFields()}
            <button type="submit" class="button">${n.buttonLabel}</button>
          </form>
          <div class="status" data-status-for="${n.formId}"></div>
        </section>
      `).join("");s.innerHTML=`
    <header class="app__header">
      <div>
        <h1>Transcendence Auth Paneli</h1>
        <p>Manuel veya Google akışlarını test etmek için formları doldur.</p>
      </div>
      <p class="app__hint">
        İstekler nginx aracılığıyla Fastify backend'e <code>/api</code> prefix'iyle gider.
      </p>
    </header>
    <section class="app__grid">
      ${e}
    </section>
  `;const t=s.querySelector(".app__header"),r=()=>{if(!t)return;const n=M(r),o=t.querySelector(".session-banner");o?o.replaceWith(n):t.appendChild(n)};r();const a=()=>{r()};return B(a).forEach(n=>{const o=s.querySelector(`#${n.formId}`);o&&(T(o),o.addEventListener("submit",async g=>{var p,l;g.preventDefault();const f=new FormData(o);if(!o.checkValidity()){o.reportValidity();return}m(s,n.formId,"loading");try{const u=await fetch(n.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(n.buildPayload(f))}),h=await u.clone().json().catch(()=>{});if(!u.ok){const v=await u.clone().text().catch(()=>"İstek başarısız oldu."),I=(h==null?void 0:h.message)??(v.startsWith("<")?"İstek başarısız oldu.":v);m(s,n.formId,"error",I);return}h?((p=n.onSuccess)==null||p.call(n,h),m(s,n.formId,"success",n.successMessage(h))):((l=n.onSuccess)==null||l.call(n,{}),m(s,n.formId,"success",n.successMessage({}))),o.reset()}catch(u){const h=u instanceof Error?u.message:"Beklenmeyen bir hata oluştu.";m(s,n.formId,"error",h)}}))}),D(a),s},T=s=>{Array.from(s.querySelectorAll("input[name]")).forEach(t=>{const r=s.querySelector(`[data-feedback-for="${t.name}"]`);if(!r)return;const a=()=>{if(t.validity.valid){r.textContent="",r.classList.remove("form__feedback--error");return}let i="";t.validity.valueMissing?i="Bu alan zorunlu.":t.validity.typeMismatch&&t.type==="email"?i="Lütfen geçerli bir e-posta gir.":t.validity.tooShort?i=`En az ${t.minLength} karakter olmalı.`:t.validity.tooLong?i=`En fazla ${t.maxLength} karakter olabilir.`:t.validity.patternMismatch&&(i="Girdi beklenen formata uymuyor."),r.textContent=i,r.classList.toggle("form__feedback--error",!!i)};t.addEventListener("input",a),t.addEventListener("blur",a)})},Y=s=>{const e=G();s.appendChild(e)},F=1.79672131148,N=10,S=10,q=360,R=(s,e,t)=>{const r=s.getContext("2d");if(!r)throw new Error("Canvas 2D context alınamadı.");const a=new H(r,s,e,t);a.resize(window.innerHeight*.6);const i=new Set,n=l=>{(l.key==="ArrowUp"||l.key==="ArrowDown")&&l.preventDefault(),i.add(l.key.toLowerCase())},o=l=>{i.delete(l.key.toLowerCase())},g=()=>{a.resize(window.innerHeight*.6)};window.addEventListener("keydown",n),window.addEventListener("keyup",o),window.addEventListener("resize",g);let f=0;const p=()=>{a.tick(i),f=requestAnimationFrame(p)};return p(),()=>{cancelAnimationFrame(f),window.removeEventListener("keydown",n),window.removeEventListener("keyup",o),window.removeEventListener("resize",g)}};class H{constructor(e,t,r,a){this.ctx=e,this.canvas=t,this.scoreAEl=r,this.scoreBEl=a,this.width=0,this.height=0,this.paddle1x=20,this.paddle2x=20,this.paddle1y=10,this.paddle2y=10,this.paddleLength=0,this.paddleWidth=10,this.ballSize=0,this.ballX=0,this.ballY=0,this.ballDx=-1,this.ballDy=0,this.scoreA=0,this.scoreB=0}tick(e){this.handleInput(e),this.updateBall(),this.resolveCollisions(),this.drawFrame()}resize(e){const t=Math.max(q,e),r=t*F;this.height=t,this.width=r,this.canvas.height=t,this.canvas.width=r,this.paddleLength=r/17.96,this.ballSize=r/68.5,this.paddle2x=r-20,this.resetPositions(),this.updateScoreboard()}handleInput(e){e.has("w")&&this.updatePaddle(0,-1),e.has("s")&&this.updatePaddle(0,1),e.has("arrowup")&&this.updatePaddle(1,-1),e.has("arrowdown")&&this.updatePaddle(1,1)}updatePaddle(e,t){const r=t*N;e===0?this.paddle1y=this.clampPaddle(this.paddle1y+r):this.paddle2y=this.clampPaddle(this.paddle2y+r)}clampPaddle(e){const r=this.height-this.paddleLength;return Math.min(Math.max(e,0),r)}updateBall(){this.ballX+=this.ballDx*S,this.ballY+=this.ballDy*S}resolveCollisions(){const e=this.ballY-this.ballSize/2<=0,t=this.ballY+this.ballSize/2>=this.height;(e||t)&&(this.ballDy*=-1),this.ballX-this.ballSize/2<=0?this.goal("b"):this.ballX+this.ballSize/2>=this.width&&this.goal("a"),this.ballDx<0&&this.ballX-this.ballSize/2<=this.paddle1x+this.paddleWidth&&this.ballY>=this.paddle1y&&this.ballY<=this.paddle1y+this.paddleLength&&this.deflectFromPaddle(this.paddle1y),this.ballDx>0&&this.ballX+this.ballSize/2>=this.paddle2x-this.paddleWidth&&this.ballY>=this.paddle2y&&this.ballY<=this.paddle2y+this.paddleLength&&this.deflectFromPaddle(this.paddle2y)}deflectFromPaddle(e){const a=(this.ballY-(e+this.paddleLength/2))/(this.paddleLength/2)*(Math.PI/4),i=Math.hypot(this.ballDx,this.ballDy)||1,n=this.ballDx<=0?1:-1;this.ballDx=n*Math.cos(a)*i,this.ballDy=Math.sin(a)*i}goal(e){e==="a"?this.scoreA+=1:this.scoreB+=1,this.updateScoreboard(),this.resetPositions()}resetPositions(){this.ballX=this.width/2,this.ballY=this.height/2,this.ballDx=-1,this.ballDy=0,this.paddle1y=10,this.paddle2y=this.height-this.paddleLength-10}updateScoreboard(){this.scoreAEl.textContent=`A: ${this.scoreA}`,this.scoreBEl.textContent=`B: ${this.scoreB}`}drawFrame(){this.ctx.clearRect(0,0,this.width,this.height),this.drawCourt(),this.drawBall()}drawCourt(){this.ctx.fillStyle="rgb(35, 98, 243)",this.ctx.fillRect(0,0,this.width,this.height),this.drawLine(0,0,this.width,0),this.drawLine(0,0,0,this.height),this.drawLine(this.width,0,0,this.height),this.drawLine(0,this.height,this.width,0),this.drawLine(this.width/2,0,0,this.height,5),this.drawLine(this.paddle1x,this.paddle1y,0,this.paddleLength,this.paddleWidth),this.drawLine(this.paddle2x,this.paddle2y,0,this.paddleLength,this.paddleWidth)}drawLine(e,t,r,a,i=10){this.ctx.beginPath(),this.ctx.strokeStyle="white",this.ctx.lineWidth=i,this.ctx.moveTo(e,t),this.ctx.lineTo(e+r,t+a),this.ctx.stroke()}drawBall(){this.ctx.fillStyle="orange",this.ctx.beginPath(),this.ctx.arc(this.ballX,this.ballY,this.ballSize/2,0,Math.PI*2),this.ctx.fill()}}const W=s=>{const e=document.createElement("main");e.className="app game",e.innerHTML=`
    <header class="app__header">
      <div>
        <h1>Pong Prototipi</h1>
        <p>W/S ve ↑/↓ tuşlarıyla raketleri kontrol edebilirsin.</p>
      </div>
      <div class="game__controls">
        <p><strong>Oyuncu A:</strong> W / S</p>
        <p><strong>Oyuncu B:</strong> ↑ / ↓</p>
      </div>
    </header>
    <section class="game__canvas-wrapper">
      <canvas></canvas>
      <div class="game__score">
        <span data-score="a">A: 0</span>
        <span data-score="b">B: 0</span>
      </div>
    </section>
  `,s.appendChild(e);const t=e.querySelector("canvas"),r=e.querySelector('[data-score="a"]'),a=e.querySelector('[data-score="b"]');if(!t||!r||!a)throw new Error("Oyun bileşenleri oluşturulamadı.");const i=R(t,r,a);return()=>{i()}},E=document.getElementById("app");if(!E)throw new Error("Uygulama için kök element bulunamadı.");const k=new z(E);k.register({path:"/auth",render:Y});k.register({path:"/game",render:W});k.init();

/* =========================================================
   Auth Demo — Smart Clinic OS (Static)
   - Fancy login overlay + PIN per role
   - Works with rbac.js (ROLE_KEY sc_role)
   - GitHub Pages friendly (localStorage)
   ========================================================= */

(() => {
  "use strict";

  const ROLE_KEY = "sc_role";
  const AUTH_KEY = "sc_auth_ok";
  const PIN_KEY  = "sc_pins";

  const $ = (s, r=document) => r.querySelector(s);

  // Default demo PINs (غيرها براحتك)
  const DEFAULT_PINS = {
    staff:  "2468",  // العيادة
    school: "1111",  // الإدارة
    student:"2222",  // الطالب
    parent: "3333"   // ولي الأمر
  };

  function loadPins(){
    try{
      const p = localStorage.getItem(PIN_KEY);
      return p ? JSON.parse(p) : { ...DEFAULT_PINS };
    }catch(_){
      return { ...DEFAULT_PINS };
    }
  }

  function savePins(pins){
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
  }

  function getRole(){
    return localStorage.getItem(ROLE_KEY) || "school";
  }

  function setRole(role){
    localStorage.setItem(ROLE_KEY, role);
    // طبّق RBAC إذا موجود
    try{ window.SCRBAC?.applyRBAC?.(); }catch(_){}
    // طبّق بوابات الأدوار إذا موجودة
    try{
      // portals.js يعيد الرسم عند تغيير roleSelect غالبًا،
      // لكن هنا نعمل reload لطيف لضمان كل شيء يتحدث.
      setTimeout(()=>location.reload(), 120);
    }catch(_){}
  }

  function isAuthed(){
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function setAuthed(ok){
    localStorage.setItem(AUTH_KEY, ok ? "1" : "0");
  }

  function roleLabel(role){
    return role === "staff" ? "العيادة (طبيب/تمريض)"
      : role === "school" ? "إدارة المدرسة"
      : role === "student" ? "طالب"
      : role === "parent" ? "ولي أمر"
      : role;
  }

  function injectStyles(){
    if ($("#authStyles")) return;
    const css = `
      .authOverlay{
        position:fixed; inset:0; z-index:99999;
        display:grid; place-items:center;
        background:
          radial-gradient(1200px 800px at 20% 0%, rgba(76,201,240,.14), transparent 60%),
          radial-gradient(900px 700px at 80% 20%, rgba(72,149,239,.16), transparent 60%),
          linear-gradient(180deg, rgba(7,11,22,.72), rgba(7,11,22,.88));
        backdrop-filter: blur(10px);
      }
      html[data-theme="light"] .authOverlay{
        background:
          radial-gradient(1200px 800px at 20% 0%, rgba(76,201,240,.10), transparent 60%),
          radial-gradient(900px 700px at 80% 20%, rgba(72,149,239,.10), transparent 60%),
          linear-gradient(180deg, rgba(245,248,255,.75), rgba(245,248,255,.92));
      }
      .authCard{
        width:min(940px, 92vw);
        border:1px solid var(--stroke);
        border-radius: 22px;
        background: linear-gradient(180deg, var(--panel), transparent 75%);
        box-shadow: 0 30px 90px rgba(0,0,0,.35);
        padding:18px;
      }
      .authHead{
        display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;
        align-items:flex-end; margin-bottom:12px;
      }
      .authBrand{
        display:flex; gap:12px; align-items:center;
      }
      .authLogo{
        width:46px; height:46px; border-radius:16px;
        display:grid; place-items:center; font-weight:1000;
        border:1px solid var(--stroke2);
        background:
          radial-gradient(90px 70px at 30% 20%, rgba(76,201,240,.65), transparent 60%),
          radial-gradient(100px 80px at 70% 40%, rgba(72,149,239,.55), transparent 60%),
          linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
      }
      .authTitle{ font-weight:1000; letter-spacing:.2px; }
      .authSub{ color:var(--muted); margin-top:3px; font-size:.9rem; }
      .authGrid{
        display:grid; grid-template-columns: 1.2fr .8fr; gap:12px;
      }
      .authPanel{
        border:1px solid var(--stroke);
        border-radius: 20px;
        background: var(--panel);
        padding:14px;
      }
      .roleCards{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .roleCard{
        border:1px solid var(--stroke);
        border-radius: 18px;
        background: color-mix(in srgb, var(--panel2) 80%, transparent);
        padding:12px;
        cursor:pointer;
        transition: transform .12s ease, border-color .12s ease, background .12s ease;
      }
      .roleCard:hover{
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--cyan) 35%, var(--stroke2));
      }
      .roleCard.active{
        border-color: color-mix(in srgb, var(--cyan) 45%, var(--stroke2));
        background:
          radial-gradient(260px 120px at 0% 0%, rgba(76,201,240,.18), transparent 70%),
          linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.05));
      }
      .roleName{ font-weight:1000; }
      .roleDesc{ color:var(--muted); margin-top:6px; line-height:1.6; font-size:.9rem; }
      .authForm label{ display:block; margin:8px 0 6px; color:var(--muted); font-weight:900; font-size:.9rem; }
      .authForm input{
        width:100%;
        padding:12px 12px;
        border-radius:14px;
        border:1px solid var(--stroke);
        background: color-mix(in srgb, var(--panel2) 70%, transparent);
        color:var(--text);
        outline:none;
        font-weight:1000;
        letter-spacing:.22em;
        text-align:center;
      }
      .authRow{ display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
      .authHint{
        margin-top:10px;
        padding:10px 12px;
        border-radius:14px;
        border:1px dashed var(--stroke2);
        color:var(--muted);
        line-height:1.7;
        font-size:.9rem;
      }
      .authFoot{
        display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;
        margin-top:12px;
      }
      .tinyBtn{
        border:none; background:transparent; color:var(--muted);
        cursor:pointer; font-weight:900;
        text-decoration: underline;
      }
      .err{ color: var(--bad); font-weight:1000; }
      @media (max-width: 980px){
        .authGrid{ grid-template-columns: 1fr; }
      }
    `;
    const st = document.createElement("style");
    st.id = "authStyles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildOverlay(){
    const wrap = document.createElement("div");
    wrap.className = "authOverlay";
    wrap.id = "authOverlay";

    wrap.innerHTML = `
      <div class="authCard">
        <div class="authHead">
          <div class="authBrand">
            <div class="authLogo">SC</div>
            <div>
              <div class="authTitle">SMART CLINIC OS — بوابة الدخول</div>
              <div class="authSub">نسخة عرض تحكيمية (Static) — اختيار دور + صلاحيات + PIN</div>
            </div>
          </div>
          <div class="badge">Demo Auth</div>
        </div>

        <div class="authGrid">
          <div class="authPanel">
            <div class="muted small" style="margin-bottom:10px;">اختر الدور الذي تريد عرضه:</div>
            <div class="roleCards">
              ${roleCard("staff","العيادة (طبيب/تمريض)","إدارة الحالات، الفحص السريع، التقارير والتنبيهات.")}
              ${roleCard("school","إدارة المدرسة","لوحة مجمعة وإجراءات إدارية بدون تفاصيل سريرية.")}
              ${roleCard("student","طالب","طلب زيارة + إرشادات + ملخص توصيات.")}
              ${roleCard("parent","ولي الأمر","تنبيهات وتقارير وموافقات خاصة بالابن/الابنة.")}
            </div>

            <div class="authHint" id="authHint">
              ملاحظة: هذا نظام دخول تجريبي للعرض فقط. لاحقًا يمكن ربطه بـ (نفاذ/أبشر) أو SSO.
            </div>
          </div>

          <div class="authPanel">
            <div class="authForm">
              <label>PIN للدخول (<span id="roleName">${escapeHtml(roleLabel(getRole()))}</span>)</label>
              <input id="pinInput" inputmode="numeric" maxlength="6" placeholder="••••" />
              <div class="authRow">
                <button class="btn" id="btnEnter">دخول</button>
                <button class="btn ghost" id="btnExitDemo">عرض بدون PIN</button>
              </div>
              <div class="authFoot">
                <span class="muted small">الدخول سيطبق الصلاحيات مباشرة.</span>
                <button class="tinyBtn" id="btnResetPins">إعادة ضبط PIN</button>
              </div>
              <div class="small err" id="authErr" style="margin-top:10px; display:none;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);
    highlightActiveRole(getRole());
    bindOverlayEvents();
  }

  function roleCard(role, title, desc){
    return `
      <div class="roleCard" data-role="${role}">
        <div class="roleName">${title}</div>
        <div class="roleDesc">${desc}</div>
      </div>
    `;
  }

  function highlightActiveRole(r){
    document.querySelectorAll(".roleCard").forEach(card=>{
      card.classList.toggle("active", card.dataset.role === r);
    });
    const rn = $("#roleName");
    if(rn) rn.textContent = roleLabel(r);
  }

  function showError(msg){
    const e = $("#authErr");
    if(!e) return;
    e.style.display = "";
    e.textContent = msg;
  }
  function clearError(){
    const e = $("#authErr");
    if(!e) return;
    e.style.display = "none";
    e.textContent = "";
  }

  function bindOverlayEvents(){
    const pins = loadPins();
    savePins(pins);

    document.querySelectorAll(".roleCard").forEach(card=>{
      card.addEventListener("click", ()=>{
        clearError();
        const r = card.dataset.role;
        localStorage.setItem(ROLE_KEY, r);
        highlightActiveRole(r);
        const input = $("#pinInput");
        if(input){ input.value = ""; input.focus(); }
      });
    });

    $("#btnEnter")?.addEventListener("click", ()=>{
      clearError();
      const r = getRole();
      const input = $("#pinInput");
      const val = (input?.value || "").trim();
      const pinsNow = loadPins();
      const ok = val && val === String(pinsNow[r] || DEFAULT_PINS[r]);
      if(!ok){
        showError("PIN غير صحيح — جرّب مرة ثانية.");
        try{ window.ClinicEngine?.log?.("Auth failed for role: "+r, "warn"); }catch(_){}
        return;
      }
      setAuthed(true);
      setRole(r);
      closeOverlay();
    });

    // عرض بدون PIN (لما تكون مستعجل في تحكيم)
    $("#btnExitDemo")?.addEventListener("click", ()=>{
      setAuthed(true);
      closeOverlay();
      try{ window.ClinicEngine?.log?.("Auth bypass used (demo)", "info"); }catch(_){}
    });

    $("#btnResetPins")?.addEventListener("click", ()=>{
      localStorage.setItem(PIN_KEY, JSON.stringify(DEFAULT_PINS));
      clearError();
      showError("تمت إعادة ضبط PIN (Demo): staff=2468, school=1111, student=2222, parent=3333");
    });

    // Enter submits
    $("#pinInput")?.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") $("#btnEnter")?.click();
      if(e.key === "Escape") $("#btnExitDemo")?.click();
    });
  }

  function closeOverlay(){
    const o = $("#authOverlay");
    if(o) o.remove();
  }

  function addLockButton(){
    // زر قفل صغير أعلى اليمين لإظهار شاشة الدخول مرة أخرى
    const top = document.querySelector(".topbar .top-actions");
    if(!top) return;
    if($("#btnLock")) return;

    const b = document.createElement("button");
    b.className = "btn ghost";
    b.id = "btnLock";
    b.title = "قفل / تغيير الدور";
    b.textContent = "🔒";
    b.addEventListener("click", ()=>{
      setAuthed(false);
      location.reload();
    });
    top.appendChild(b);
  }

  function init(){
    injectStyles();

    // لو أول مرة: اضمن وجود PINs
    if(!localStorage.getItem(PIN_KEY)) savePins({ ...DEFAULT_PINS });

    // لو مو موثّق: اظهر شاشة الدخول
    if(!isAuthed()){
      buildOverlay();
    } else {
      // طبق الصلاحيات مباشرة
      try{ window.SCRBAC?.applyRBAC?.(); }catch(_){}
      addLockButton();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

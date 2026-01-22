/* ===========================================================
   Smart Clinic OS — Role Switcher
   - Floating switch button + mini panel
   - Command Palette (Ctrl/⌘ + K)
   - Remembers last role, sets sc_role, navigates
   =========================================================== */

(function(){
  const ROLE_KEY = "sc_role";
  const LAST_KEY = "sc_last_role";
  const LAST_GO  = "sc_last_go";

  const ROUTES = [
    { role:"school",  label:"🏫 إدارة المدرسة", go:"admin.html" },
    { role:"staff",   label:"👨‍⚕️ الطبيب/التمريض", go:"doctor.html" },
    { role:"student", label:"🎓 الطالب", go:"student.html" },
    { role:"parent",  label:"👨‍👩‍👧 ولي الأمر", go:"parent.html" },
    { role:"judge",   label:"🎬 Demo Hub", go:"demo-hub.html" },
    { role:"home",    label:"🏠 بوابة الأدوار", go:"index.html" },
  ];

  const css = `
    .sc-rs-btn{
      position:fixed; left:18px; bottom:18px; z-index:99999;
      display:flex; align-items:center; gap:10px;
      padding:10px 12px; border-radius:999px;
      background: rgba(20,22,28,.72);
      border:1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 28px rgba(0,0,0,.35);
      color: #fff; cursor:pointer;
      user-select:none;
    }
    [data-theme="light"] .sc-rs-btn{
      background: rgba(245,247,255,.85);
      border:1px solid rgba(20,22,28,.12);
      color:#111;
    }
    .sc-rs-chip{
      width:34px; height:34px; border-radius:12px;
      display:grid; place-items:center;
      background: rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.10);
      font-weight:900;
    }
    [data-theme="light"] .sc-rs-chip{
      background: rgba(20,22,28,.06);
      border:1px solid rgba(20,22,28,.10);
    }
    .sc-rs-text{ display:flex; flex-direction:column; line-height:1.1; }
    .sc-rs-title{ font-weight:1000; font-size:13px; }
    .sc-rs-sub{ opacity:.72; font-size:11px; }

    .sc-rs-panel{
      position:fixed; left:18px; bottom:72px; z-index:99999;
      width:min(360px, calc(100vw - 36px));
      border-radius:18px;
      background: rgba(18,20,26,.82);
      border:1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 46px rgba(0,0,0,.45);
      color:#fff;
      overflow:hidden;
      transform: translateY(8px);
      opacity:0;
      pointer-events:none;
      transition: all .16s ease;
    }
    [data-theme="light"] .sc-rs-panel{
      background: rgba(250,252,255,.92);
      border:1px solid rgba(20,22,28,.12);
      color:#111;
    }
    .sc-rs-panel.show{
      transform: translateY(0);
      opacity:1;
      pointer-events:auto;
    }
    .sc-rs-head{
      padding:12px 12px 10px;
      display:flex; align-items:center; justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,.08);
    }
    [data-theme="light"] .sc-rs-head{
      border-bottom:1px solid rgba(20,22,28,.08);
    }
    .sc-rs-head b{ font-size:13px; }
    .sc-rs-kbd{
      font-size:11px; opacity:.75;
      border:1px solid rgba(255,255,255,.16);
      padding:4px 8px; border-radius:10px;
    }
    [data-theme="light"] .sc-rs-kbd{
      border:1px solid rgba(20,22,28,.14);
    }

    .sc-rs-list{ padding:10px; display:grid; gap:8px; }
    .sc-rs-item{
      width:100%;
      display:flex; align-items:center; justify-content:space-between;
      gap:10px;
      padding:10px 12px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.06);
      cursor:pointer;
      transition: transform .12s ease;
    }
    [data-theme="light"] .sc-rs-item{
      border:1px solid rgba(20,22,28,.10);
      background: rgba(20,22,28,.03);
    }
    .sc-rs-item:hover{ transform: translateY(-1px); }
    .sc-rs-left{ display:flex; align-items:center; gap:10px; }
    .sc-rs-ico{
      width:34px; height:34px; border-radius:12px;
      display:grid; place-items:center;
      background: rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.10);
      font-size:16px;
    }
    [data-theme="light"] .sc-rs-ico{
      background: rgba(20,22,28,.06);
      border:1px solid rgba(20,22,28,.10);
    }
    .sc-rs-lbl{ font-weight:900; font-size:13px; }
    .sc-rs-hint{ opacity:.7; font-size:11px; }
  `;

  function injectCSS(){
    if(document.getElementById("sc-role-switcher-css")) return;
    const st = document.createElement("style");
    st.id = "sc-role-switcher-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function currentRole(){
    return (localStorage.getItem(ROLE_KEY) || "").trim();
  }

  function setRole(role, go){
    if(role && role !== "home" && role !== "judge"){
      localStorage.setItem(ROLE_KEY, role);
    }
    localStorage.setItem(LAST_KEY, role);
    localStorage.setItem(LAST_GO, go);
  }

  function navTo(go){
    if(!go) return;
    // Keep same tab for UX
    location.href = go;
  }

  function makeUI(){
    injectCSS();

    // Button
    const btn = document.createElement("div");
    btn.className = "sc-rs-btn";
    btn.innerHTML = `
      <div class="sc-rs-chip">↺</div>
      <div class="sc-rs-text">
        <div class="sc-rs-title">تبديل الدور</div>
        <div class="sc-rs-sub">⌘/Ctrl + K</div>
      </div>
    `;

    // Panel
    const panel = document.createElement("div");
    panel.className = "sc-rs-panel";
    panel.innerHTML = `
      <div class="sc-rs-head">
        <b>Role Switcher</b>
        <span class="sc-rs-kbd">⌘/Ctrl + K</span>
      </div>
      <div class="sc-rs-list">
        ${ROUTES.map(r=>`
          <div class="sc-rs-item" data-role="${r.role}" data-go="${r.go}">
            <div class="sc-rs-left">
              <div class="sc-rs-ico">${r.label.split(" ")[0]}</div>
              <div>
                <div class="sc-rs-lbl">${r.label.replace(/^.+?\s/,"")}</div>
                <div class="sc-rs-hint">${r.go}</div>
              </div>
            </div>
            <div class="sc-rs-hint">${r.role === currentRole() ? "• الحالي" : ""}</div>
          </div>
        `).join("")}
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function toggle(show){
      panel.classList.toggle("show", show ?? !panel.classList.contains("show"));
    }

    btn.addEventListener("click", ()=> toggle());

    // close on outside click
    document.addEventListener("click", (e)=>{
      const inside = panel.contains(e.target) || btn.contains(e.target);
      if(!inside) toggle(false);
    });

    // item clicks
    panel.querySelectorAll(".sc-rs-item").forEach(item=>{
      item.addEventListener("click", ()=>{
        const role = item.getAttribute("data-role");
        const go = item.getAttribute("data-go");
        setRole(role, go);

        try{ window.SCBUS?.audit?.("ROLE_SWITCH", { to: role, go }); }catch(_){}
        toggle(false);
        navTo(go);
      });
    });

    // hotkey ⌘/Ctrl + K
    document.addEventListener("keydown", (e)=>{
      const isK = (e.key || "").toLowerCase() === "k";
      const meta = e.metaKey || e.ctrlKey;
      if(meta && isK){
        e.preventDefault();
        toggle();
      }
      if(e.key === "Escape"){
        toggle(false);
      }
    });
  }

  // init after DOM ready
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", makeUI);
  } else {
    makeUI();
  }
})();

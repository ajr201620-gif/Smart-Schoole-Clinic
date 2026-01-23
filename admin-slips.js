/* ===========================================================
   Admin Slips Panel (offline demo)
   =========================================================== */
(function(){
  const $ = (s)=>document.querySelector(s);
  function load(){ return window.SCBUS?.load?.() || {slips:[]}; }

  function render(containerId="slipsList"){
    const el = $("#"+containerId);
    if(!el) return;

    const bus = load();
    const slips = bus.slips || [];

    el.innerHTML = slips.slice(0,12).map(s=>`
      <div class="sc-nav-item" style="display:block">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <b>${s.action || "سند موافقة"} • Case ${s.caseId}</b>
          <span class="sc-chip">${s.consent || "—"}</span>
        </div>
        <div class="muted small" style="margin-top:6px">
          ${new Date(s.createdAt).toLocaleString("ar-SA")} • ${s.studentName || "—"}
        </div>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" data-open-slip="${s.id}">🧾 عرض السند</button>
        </div>
      </div>
    `).join("") || `<div class="muted">لا توجد سندات موافقة بعد</div>`;
  }

  function openSlipById(id){
    const bus = load();
    const s = (bus.slips||[]).find(x=>x.id===id);
    if(!s) return alert("السند غير موجود");
    // استخدام نفس مولّد HTML
    if(window.SCSLIP) window.SCSLIP.openSlip(s);
    else alert("permission-slip.js غير محمّل");
  }

  document.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-open-slip]");
    if(!btn) return;
    openSlipById(btn.getAttribute("data-open-slip"));
  });

  window.SCADMINSLIPS = { render };
})();

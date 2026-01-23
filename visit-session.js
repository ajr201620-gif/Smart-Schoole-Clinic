/* ===========================================================
   Visit Session (offline demo)
   - Timer + Notes + End session + Generate Report HTML
   - Integrates with SCBUS cases using room = "ROOM-<caseId>"
   =========================================================== */

(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const pad2 = (n)=>String(n).padStart(2,"0");

  function getRoom(){
    return new URLSearchParams(location.search).get("room") || "";
  }
  function getRole(){
    return (new URLSearchParams(location.search).get("role") || "student").toLowerCase();
  }
  function caseIdFromRoom(room){
    if(!room) return null;
    const m = room.match(/^ROOM-(.+)$/i);
    return m ? m[1] : null;
  }

  function nowISO(){ return new Date().toISOString(); }

  function loadBus(){
    return window.SCBUS?.load?.() || {cases:[], requests:[], alerts:[]};
  }
  function saveBus(bus){
    window.SCBUS?.save?.(bus);
  }
  function findCase(bus, caseId){
    return (bus.cases||[]).find(c=>String(c.id)===String(caseId)) || null;
  }
  function patchCase(bus, caseId, patch){
    const idx = (bus.cases||[]).findIndex(c=>String(c.id)===String(caseId));
    if(idx<0) return null;
    bus.cases[idx] = Object.assign({}, bus.cases[idx], patch);
    return bus.cases[idx];
  }

  function formatElapsed(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    const mm = Math.floor(s/60);
    const ss = s%60;
    return `${pad2(mm)}:${pad2(ss)}`;
  }

  function reportHTML(c, meta){
    const v = c?.vitals || {};
    const ai = c?.ai || {};
    const req = c?.requestDesc || c?.desc || c?.complaint || "—";
    const dx = c?.dx || "—";
    const plan = c?.plan || "—";
    const notes = (c?.visit?.notes || "").trim() || "—";
    const status = c?.status || "—";

    const esc = (x)=>String(x??"").replace(/[&<>"]/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));
    const line = (k,v)=>`<div class="row"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Smart Clinic OS — Visit Report</title>
<style>
  body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#f6f7fb; color:#111; margin:0; padding:24px;}
  .paper{max-width:900px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:18px;}
  .top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px;}
  .brand{font-weight:900; font-size:18px;}
  .sub{color:#6b7280; font-size:12px; margin-top:4px}
  .tag{font-size:12px; padding:6px 10px; border:1px solid #e5e7eb; border-radius:999px; background:#fafafa;}
  h2{margin:18px 0 10px; font-size:14px}
  .grid{display:grid; grid-template-columns:1fr 1fr; gap:10px}
  .card{border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fff}
  .row{display:flex; gap:10px; padding:6px 0; border-bottom:1px dashed #eef0f4}
  .row:last-child{border-bottom:none}
  .k{min-width:130px; color:#6b7280; font-size:12px}
  .v{flex:1; font-size:12px; font-weight:600}
  pre{white-space:pre-wrap; font-size:12px; margin:0; color:#111}
  .footer{margin-top:14px; color:#6b7280; font-size:11px}
  @media print{ body{background:#fff; padding:0} .paper{border:none; border-radius:0} }
</style>
</head>
<body>
<div class="paper">
  <div class="top">
    <div>
      <div class="brand">Smart Clinic OS — تقرير زيارة افتراضية</div>
      <div class="sub">Generated: ${esc(meta.generatedAt)} • Room: ${esc(meta.room)}</div>
    </div>
    <div class="tag">Status: ${esc(status)}</div>
  </div>

  <h2>بيانات الحالة</h2>
  <div class="card">
    ${line("رقم الحالة", c?.id ?? "—")}
    ${line("Priority", c?.priority ?? ai.priority ?? "—")}
    ${line("Risk", (c?.riskScore ?? ai.risk ?? "—") + "/100")}
    ${line("مدة الجلسة", meta.elapsed || "—")}
  </div>

  <h2>الشكوى</h2>
  <div class="card"><pre>${esc(req)}</pre></div>

  <h2>العلامات الحيوية</h2>
  <div class="grid">
    <div class="card">
      ${line("Temp", v.temp ? v.temp+"°C" : "—")}
      ${line("HR", v.hr ? v.hr+" bpm" : "—")}
      ${line("SpO₂", v.spo2 ? v.spo2+"%" : "—")}
      ${line("BP", v.bp || "—")}
    </div>
    <div class="card">
      ${line("AI Recommendation", ai.recommendation || c?.decision || "—")}
      ${line("Flags", (ai.flags||[]).join(", ") || "—")}
    </div>
  </div>

  <h2>تشخيص الطبيب</h2>
  <div class="card"><pre>${esc(dx)}</pre></div>

  <h2>الخطة</h2>
  <div class="card"><pre>${esc(plan)}</pre></div>

  <h2>ملاحظات الزيارة</h2>
  <div class="card"><pre>${esc(notes)}</pre></div>

  <div class="footer">
    ملاحظة: هذا نموذج عرض (Demo) وليس بديلاً عن التقييم السريري.
  </div>
</div>
</body>
</html>`;
  }

  function downloadText(filename, text){
    const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  function downloadHTML(filename, html){
    const blob = new Blob([html], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  function mount(){
    const role = getRole();
    const room = getRoom();
    const caseId = caseIdFromRoom(room);

    // UI refs (optional if elements exist)
    const tEl = $("#vsTimer");
    const nEl = $("#vsNotes");
    const statusEl = $("#vsStatus");

    let startAt = null;
    let tick = null;

    function setStatus(txt){ if(statusEl) statusEl.textContent = txt; }

    function ensureSession(){
      if(!caseId) return null;
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c) return null;

      const visit = c.visit || {};
      if(!visit.startedAt){
        visit.startedAt = nowISO();
        visit.startedBy = role;
        visit.room = room;
        visit.notes = visit.notes || "";
        patchCase(bus, caseId, { visit, status: c.status || "OPEN_VIRTUAL" });
        saveBus(bus);
      }
      return { bus, c: findCase(bus, caseId) };
    }

    function startTimer(){
      const pack = ensureSession();
      if(!pack){ setStatus("لا توجد حالة مرتبطة بالغرفة"); return; }

      startAt = new Date(pack.c.visit.startedAt).getTime();
      if(tick) clearInterval(tick);
      tick = setInterval(()=>{
        const ms = Date.now() - startAt;
        if(tEl) tEl.textContent = formatElapsed(ms);
      }, 400);
      setStatus("🟢 Session running");
      // preload notes
      if(nEl) nEl.value = pack.c.visit.notes || "";
    }

    function saveNotes(){
      if(!caseId) return;
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c) return;
      const visit = Object.assign({}, c.visit, { notes: (nEl?.value || "").slice(0, 6000) });
      patchCase(bus, caseId, { visit });
      saveBus(bus);
      setStatus("💾 Notes saved");
      setTimeout(()=>setStatus("🟢 Session running"), 800);
    }

    function endSession(){
      if(!caseId){ alert("Room غير مربوط بحالة"); return; }
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c){ alert("الحالة غير موجودة"); return; }

      const visit = Object.assign({}, c.visit || {}, {
        endedAt: nowISO(),
        endedBy: role,
        notes: (nEl?.value || c.visit?.notes || "")
      });

      // lock status if still open virtual
      let status = c.status;
      if(status === "OPEN_VIRTUAL") status = "VISIT_ENDED";

      const updated = patchCase(bus, caseId, { visit, status });
      saveBus(bus);

      if(tick) clearInterval(tick);
      setStatus("✅ Session ended");

      // generate report HTML and open preview tab
      const started = new Date(visit.startedAt).getTime();
      const ended = new Date(visit.endedAt).getTime();
      const elapsed = formatElapsed(ended - started);

      const html = reportHTML(updated, {
        room,
        elapsed,
        generatedAt: new Date().toLocaleString("ar-SA")
      });

      // download + preview
      downloadHTML(`VisitReport_${updated.id}.html`, html);

      const w = window.open();
      if(w) { w.document.open(); w.document.write(html); w.document.close(); }
    }

    function exportJSON(){
      if(!caseId){ alert("Room غير مربوط بحالة"); return; }
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c){ alert("الحالة غير موجودة"); return; }
      downloadText(`Case_${c.id}.json`, JSON.stringify(c, null, 2));
    }

    function bind(){
      $("#btnSaveNotes")?.addEventListener("click", saveNotes);
      $("#btnEndVisit")?.addEventListener("click", endSession);
      $("#btnExportJSON")?.addEventListener("click", exportJSON);
      nEl?.addEventListener("change", saveNotes);
    }

    bind();

    // Auto start once page is ready
    startTimer();
  }

  window.SCVISIT = { mount };
})();

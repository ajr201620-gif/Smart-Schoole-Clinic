/* ===========================================================
   Visit Session (offline demo)
   - Timer + Notes + End session
   - Updates BUS case using room = "ROOM-<caseId>"
   - Redirect to report-view.html after end
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
    return window.SCBUS?.load?.() || {cases:[]};
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

  function mount(){
    const role = getRole();
    const room = getRoom();
    const caseId = caseIdFromRoom(room);

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
      if(nEl) nEl.value = pack.c.visit.notes || "";
    }

    function saveNotes(){
      if(!caseId) return;
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c) return;

      const visit = Object.assign({}, c.visit, { notes: (nEl?.value || "").slice(0, 8000) });
      patchCase(bus, caseId, { visit });
      saveBus(bus);
      setStatus("💾 Notes saved");
      setTimeout(()=>setStatus("🟢 Session running"), 700);
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

      let status = c.status;
      if(status === "OPEN_VIRTUAL") status = "VISIT_ENDED";

      patchCase(bus, caseId, { visit, status });
      saveBus(bus);

      if(tick) clearInterval(tick);
      setStatus("✅ Session ended");

      // Redirect to printable report inside system
      setTimeout(()=>{
        location.href = `report-view.html?case=${encodeURIComponent(caseId)}&role=${encodeURIComponent(role)}`;
      }, 500);
    }

    function exportJSON(){
      if(!caseId){ alert("Room غير مربوط بحالة"); return; }
      const bus = loadBus();
      const c = findCase(bus, caseId);
      if(!c){ alert("الحالة غير موجودة"); return; }
      const blob = new Blob([JSON.stringify(c, null, 2)], {type:"application/json;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Case_${c.id}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 800);
    }

    $("#btnSaveNotes")?.addEventListener("click", saveNotes);
    $("#btnEndVisit")?.addEventListener("click", endSession);
    $("#btnExportJSON")?.addEventListener("click", exportJSON);
    nEl?.addEventListener("change", saveNotes);

    startTimer();
  }

  window.SCVISIT = { mount };
})();

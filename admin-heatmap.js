/* ===========================================================
   Admin Heatmap (offline demo)
   - Buckets cases by Priority + Status
   - Shows simple grid heatmap + today counters
   =========================================================== */
(function(){
  const $ = (s)=>document.querySelector(s);
  const load = ()=> window.SCBUS?.load?.() || {cases:[], requests:[]};

  function bucketByPriority(cases){
    const b = { LOW:0, MED:0, HIGH:0, CRIT:0 };
    cases.forEach(c=>{
      const p = (c.priority || c.ai?.priority || "LOW").toUpperCase();
      if(b[p]==null) b[p]=0;
      b[p]++;
    });
    return b;
  }

  function bucketByStatus(cases){
    const keys = ["OPEN","OPEN_VIRTUAL","CONSENT_REQUIRED","APPROVED_BY_PARENT","REJECTED_BY_PARENT","FOLLOW_UP","REFERRED","VISIT_ENDED"];
    const b = Object.fromEntries(keys.map(k=>[k,0]));
    cases.forEach(c=>{
      const s = (c.status || "OPEN").toUpperCase();
      if(b[s]==null) b[s]=0;
      b[s]++;
    });
    return b;
  }

  function isTodayISO(iso){
    if(!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  }

  function render(containerId="heatmapBox"){
    const el = $("#"+containerId);
    if(!el) return;

    const bus = load();
    const cases = bus.cases || [];
    const reqs = bus.requests || [];

    const pri = bucketByPriority(cases);
    const st  = bucketByStatus(cases);

    const todayChecks = reqs.filter(r=>isTodayISO(r.createdAt)).length;
    const todayCases  = cases.filter(c=>isTodayISO(c.createdAt) || isTodayISO(c?.visit?.startedAt)).length;

    const card = (title, obj)=>`
      <div style="border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px;background:#fff">
        <b>${title}</b>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px">
          ${Object.entries(obj).map(([k,v])=>`
            <div style="border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:10px">
              <div style="font-size:11px;opacity:.7">${k}</div>
              <div style="font-weight:900;font-size:16px">${v}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    const mini = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px">
        <div style="border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px;background:#fff">
          <div style="font-size:12px;opacity:.7">فحوصات اليوم</div>
          <div style="font-weight:900;font-size:18px">${todayChecks}</div>
        </div>
        <div style="border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px;background:#fff">
          <div style="font-size:12px;opacity:.7">حالات اليوم</div>
          <div style="font-weight:900;font-size:18px">${todayCases}</div>
        </div>
      </div>
    `;

    el.innerHTML = `
      ${mini}
      <div style="display:grid;grid-template-columns:1fr;gap:12px">
        ${card("توزيع الحالات حسب Priority", pri)}
        ${card("توزيع الحالات حسب Status", st)}
      </div>
    `;
  }

  window.SCHEAT = { render };
})();

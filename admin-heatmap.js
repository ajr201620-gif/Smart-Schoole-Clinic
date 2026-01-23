/* =========================================================
   Admin Heatmap — Smart School Clinic OS
   - Visual distribution of cases by Priority & Status
   ========================================================= */

(function(){
  function load(){
    return window.SCBUS?.load?.() || { cases:[], requests:[] };
  }

  function countBy(arr, keyFn){
    const out = {};
    arr.forEach(x=>{
      const k = keyFn(x);
      out[k] = (out[k]||0) + 1;
    });
    return out;
  }

  function card(title, obj){
    return `
      <div class="panel" style="margin-top:10px">
        <b>${title}</b>
        <div class="kpiGrid" style="margin-top:10px">
          ${Object.entries(obj).map(([k,v])=>`
            <div class="kpi">
              <div class="k">${k}</div>
              <div class="v">${v}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function render(targetId){
    const el = document.getElementById(targetId);
    if(!el) return;

    const bus = load();
    const cases = bus.cases || [];

    const byPriority = countBy(cases, c=>c.priority||"—");
    const byStatus   = countBy(cases, c=>c.status||"—");

    el.innerHTML = `
      ${card("حسب الشدة (Priority)", byPriority)}
      ${card("حسب الحالة (Status)", byStatus)}
    `;
  }

  window.SCHEAT = { render };
})();

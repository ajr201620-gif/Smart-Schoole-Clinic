/* =========================================================
   Audit Log — Smart School Clinic OS
   - Central action log (Admin / Doctor / System)
   ========================================================= */

(function(){
  function load(){
    return window.SCBUS?.load?.() || { audit:[] };
  }

  function save(bus){
    window.SCBUS?.save?.(bus);
  }

  function log(action, details={}, actor="system"){
    const bus = load();
    bus.audit.unshift({
      id: "AUD-" + Date.now(),
      at: new Date().toISOString(),
      actor,
      action,
      details
    });
    save(bus);
  }

  function list(limit=20){
    const bus = load();
    return (bus.audit||[]).slice(0, limit);
  }

  window.SCAUDIT = { log, list };
})();

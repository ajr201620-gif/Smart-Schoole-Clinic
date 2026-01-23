/* ===========================================================
   Audit Log — Admin Actions
   =========================================================== */
(function(){
  const now = ()=> new Date().toISOString();
  function load(){ return window.SCBUS?.load?.() || {audit:[]}; }
  function save(bus){ window.SCBUS?.save?.(bus); }

  function log(action, details={}, actor="admin"){
    const bus = load();
    bus.audit = bus.audit || [];
    bus.audit.unshift({
      id: "AUD-" + Date.now(),
      at: now(),
      actor,
      action,
      details
    });
    save(bus);
  }

  function list(limit=20){
    const bus = load();
    return (bus.audit||[]).slice(0,limit);
  }

  window.SCAUDIT = { log, list };
})();

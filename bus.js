/* =========================================================
   Smart School Clinic OS — BUS (LocalStorage DB)
   Static • Free • No Backend
   ========================================================= */

(function(){
  const KEY = "SC_BUS_V1";

  const empty = () => ({
    requests: [],   // طلبات الطالب الأولية
    cases: [],      // الحالات الطبية
    slips: [],      // سندات الموافقة
    alerts: [],     // تنبيهات
    audit: []       // سجل الإجراءات
  });

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : empty();
    }catch(e){
      return empty();
    }
  }

  function save(bus){
    localStorage.setItem(KEY, JSON.stringify(bus));
  }

  function reset(){
    localStorage.removeItem(KEY);
    save(empty());
  }

  /* ------------------ Core helpers ------------------ */

  function uid(prefix){
    return `${prefix}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  }

  function pushAlert(role, level, title, msg, meta={}){
    const bus = load();
    bus.alerts.unshift({
      id: uid("ALT"),
      at: new Date().toISOString(),
      role, level, title, msg, meta
    });
    save(bus);
  }

  function log(action, details={}, actor="system"){
    const bus = load();
    bus.audit.unshift({
      id: uid("AUD"),
      at: new Date().toISOString(),
      actor,
      action,
      details
    });
    save(bus);
  }

  /* ------------------ Student ------------------ */

  function addRequest(payload){
    const bus = load();
    const req = {
      id: uid("REQ"),
      createdAt: new Date().toISOString(),
      ...payload
    };
    bus.requests.unshift(req);
    save(bus);
    log("إضافة طلب طالب", { requestId: req.id }, "student");
    return req;
  }

  /* ------------------ Doctor / Case ------------------ */

  function createCase(fromRequest){
    const bus = load();
    const c = {
      id: uid("CASE"),
      createdAt: new Date().toISOString(),
      requestId: fromRequest.id,
      studentName: fromRequest.studentName || "طالب (Demo)",
      requestDesc: fromRequest.desc || "",
      vitals: fromRequest.vitals || {},
      ai: fromRequest.ai || {},
      priority: fromRequest.ai?.priority || "LOW",
      riskScore: fromRequest.ai?.risk || 0,
      status: "OPEN"
    };
    bus.cases.unshift(c);
    save(bus);
    log("إنشاء حالة", { caseId: c.id }, "doctor");
    return c;
  }

  function updateCase(caseId, patch){
    const bus = load();
    const idx = bus.cases.findIndex(c=>c.id===caseId);
    if(idx<0) return null;
    bus.cases[idx] = { ...bus.cases[idx], ...patch };
    save(bus);
    return bus.cases[idx];
  }

  /* ------------------ Seed Demo ------------------ */

  function seedDemo(){
    reset();
    const bus = load();

    const req = {
      id: uid("REQ"),
      createdAt: new Date().toISOString(),
      studentName: "محمد أحمد",
      desc: "صداع ودوخة مع تعب عام",
      vitals: { temp: 37.9, hr: 102, spo2: 97, bp: "110/70" },
      ai: {
        risk: 42,
        priority: "MED",
        recommendation: "متابعة وراحة + تقييم طبي"
      }
    };
    bus.requests.push(req);

    const c = {
      id: uid("CASE"),
      createdAt: new Date().toISOString(),
      requestId: req.id,
      studentName: req.studentName,
      requestDesc: req.desc,
      vitals: req.vitals,
      ai: req.ai,
      priority: "MED",
      riskScore: 42,
      status: "OPEN"
    };
    bus.cases.push(c);

    save(bus);
    log("Seed Demo", { caseId: c.id }, "system");
  }

  /* ------------------ Public API ------------------ */

  window.SCBUS = {
    load,
    save,
    reset,
    uid,
    log,
    pushAlert,
    addRequest,
    createCase,
    updateCase,
    seedDemo
  };

})();

/* ===========================================================
   Smart Clinic OS — BUS (Cross-role Live Flow)
   - One shared store in localStorage
   - Publish/Subscribe events across pages (storage event)
   - Cases / Requests / Alerts / Consents / Audit log
   =========================================================== */

(function(){
  const BUS_KEY = "sc_bus_v1";

  const pad2 = (n)=>String(n).padStart(2,"0");
  const nowTime = ()=>{
    const d=new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };
  const uid = (p)=> (p||"ID") + "-" + Math.random().toString(36).slice(2,8).toUpperCase();

  const safeParse = (s, fallback)=>{ try{ return JSON.parse(s); }catch(_){ return fallback; } };

  function load(){
    const raw = localStorage.getItem(BUS_KEY);
    if(!raw){
      const init = {
        meta:{ createdAt: new Date().toISOString(), version:"bus-1" },
        requests: [],    // student -> clinic
        cases: [],       // clinic case
        alerts: [],      // to roles
        consents: [],    // parent approvals
        audit: [],       // audit trail
        story: { step: 0, lastRunAt: null }
      };
      localStorage.setItem(BUS_KEY, JSON.stringify(init));
      return init;
    }
    return safeParse(raw, {requests:[],cases:[],alerts:[],consents:[],audit:[],story:{step:0}});
  }

  function save(bus){
    localStorage.setItem(BUS_KEY, JSON.stringify(bus));
    // trigger storage for other tabs/pages
    localStorage.setItem("sc_bus_ping", String(Date.now()));
  }

  function audit(type, meta){
    const bus = load();
    bus.audit.unshift({ t: nowTime(), type, meta: meta||{} });
    bus.audit = bus.audit.slice(0, 300);
    save(bus);
  }

  function pushRequest(req){
    const bus = load();
    const r = Object.assign({
      id: uid("REQ"),
      t: nowTime(),
      status: "SENT",
    }, req||{});
    bus.requests.unshift(r);
    bus.requests = bus.requests.slice(0, 200);
    audit("REQUEST_NEW", { id:r.id, symptom:r.symptom, urgency:r.urgency });
    save(bus);
    return r;
  }

  function createCase(fromReq, extras){
    const bus = load();
    const c = Object.assign({
      id: uid("CASE"),
      t: nowTime(),
      fromRequest: fromReq?.id || null,
      studentId: fromReq?.studentId || "",
      studentName: fromReq?.studentName || "",
      priority: "MED",
      riskScore: 35,
      dx: "تقييم مبدئي (Demo)",
      decision: "observe_followup",
      plan: "سوائل + راحة + متابعة",
      media: { photo:null, audio:null, video:null } // optional
    }, extras||{});
    bus.cases.unshift(c);
    bus.cases = bus.cases.slice(0, 200);
    audit("CASE_CREATED", { id:c.id, from: c.fromRequest, priority:c.priority, risk:c.riskScore });
    save(bus);
    return c;
  }

  function pushAlert(toRole, level, title, body, ref){
    const bus = load();
    const a = {
      id: uid("AL"),
      t: nowTime(),
      to: toRole,        // "admin" | "staff" | "student" | "parent"
      level: level||"MED",
      title: title||"تنبيه",
      body: body||"",
      ref: ref||null,
      ack: false
    };
    bus.alerts.unshift(a);
    bus.alerts = bus.alerts.slice(0, 300);
    audit("ALERT_NEW", { id:a.id, to: a.to, level:a.level, ref:a.ref });
    save(bus);
    return a;
  }

  function ackAlert(id){
    const bus = load();
    const a = bus.alerts.find(x=>x.id===id);
    if(a){ a.ack = true; audit("ALERT_ACK", { id }); save(bus); }
    return a;
  }

  function upsertConsent(consent){
    const bus = load();
    const c = Object.assign({
      id: uid("C"),
      t: nowTime(),
      status: "PENDING", // APPROVED | REJECTED
      type: "clinic_visit",
      summary: "",
      note: "",
      caseId: null
    }, consent||{});
    const idx = bus.consents.findIndex(x=>x.id===c.id);
    if(idx>=0) bus.consents[idx]=c; else bus.consents.unshift(c);
    bus.consents = bus.consents.slice(0, 200);
    audit("CONSENT_UPSERT", { id:c.id, status:c.status, caseId:c.caseId });
    save(bus);
    return c;
  }

  function getRole(){
    return (localStorage.getItem("sc_role") || "").trim();
  }

  // ---- Story Mode (for judges) ----
  function runStoryStep(){
    const bus = load();
    const step = bus.story?.step || 0;

    if(step === 0){
      // create student request
      const req = pushRequest({
        studentId: "STD-23",
        studentName: "طالب #23",
        age: 12,
        classRoom: "6/ب",
        symptom: "fever",
        urgency: "high",
        desc: "بدأت الأعراض قبل 2 ساعة. (Demo)"
      });
      pushAlert("staff", "HIGH", "طلب جديد من طالب", `تم استلام طلب ${req.id}`, { requestId: req.id });
      bus.story.step = 1;
      bus.story.lastRunAt = new Date().toISOString();
      save(bus);
      return { step: 1, msg: "Student -> Request created" };
    }

    if(step === 1){
      // clinic case
      const req = bus.requests[0];
      const c = createCase(req, {
        priority: "HIGH",
        riskScore: 68,
        dx: "اشتباه حمّى/عدوى (Demo)",
        decision: "call_guardian",
        plan: "عزل مؤقت + سوائل + قياس حرارة + تواصل ولي الأمر"
      });
      pushAlert("parent", "HIGH", "إشعار ولي الأمر", `حالة للطالب ${c.studentName}: نحتاج موافقة متابعة/إحالة.`, { caseId: c.id });
      upsertConsent({
        id: "C-DEMO-01",
        type: "referral",
        summary: "طلب موافقة لإحالة/متابعة حالة عالية (Demo)",
        status: "PENDING",
        caseId: c.id
      });
      bus.story.step = 2;
      bus.story.lastRunAt = new Date().toISOString();
      save(bus);
      return { step: 2, msg: "Clinic -> Case created + Parent notified" };
    }

    if(step === 2){
      // admin summary alert
      const c = bus.cases[0];
      pushAlert("admin", c.priority, "ملخص للإدارة", `Case ${c.id} Priority=${c.priority}. (No sensitive details)`, { caseId: c.id });
      bus.story.step = 3;
      bus.story.lastRunAt = new Date().toISOString();
      save(bus);
      return { step: 3, msg: "Admin notified" };
    }

    // reset to loop
    bus.story.step = 0;
    bus.story.lastRunAt = new Date().toISOString();
    save(bus);
    return { step: 0, msg: "Story looped" };
  }

  // Public API
  window.SCBUS = {
    KEY: BUS_KEY,
    load, save,
    audit,
    pushRequest,
    createCase,
    pushAlert, ackAlert,
    upsertConsent,
    getRole,
    runStoryStep,
    uid
  };

  // Broadcast listener (tabs/pages)
  window.addEventListener("storage", (e)=>{
    if(e.key === "sc_bus_ping"){
      // notify pages
      try{
        window.dispatchEvent(new CustomEvent("sc:bus:update", { detail: { at: Date.now() } }));
      }catch(_){}
    }
  });

})();

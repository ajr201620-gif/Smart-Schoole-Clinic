// actions.js — Global Action Engine (no backend)
window.Actions = (() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const nowISO = () => new Date().toISOString();

  const store = {
    get(k, d=null){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  };

  function toast(msg){
    // لو عندك toast UI استخدمه. وإلا fallback:
    console.log("🔔", msg);
  }

  // ---- Data Model ----
  function getDB(){
    return store.get("ssc_db", {
      cases: [],        // {id, studentId, complaint, vitals, triage, status, createdAt, updatedAt}
      visits: [],       // {id, caseId, doctorDecision, parentInvite, consent, notes, createdAt}
      audits: [],       // {at, role, action, meta}
      stats: { requests:0, cases:0, critical:0, followup:0 }
    });
  }
  function setDB(db){ store.set("ssc_db", db); }

  function audit(role, action, meta={}){
    const db = getDB();
    db.audits.unshift({ at: nowISO(), role, action, meta });
    db.audits = db.audits.slice(0, 200);
    setDB(db);
  }

  function uid(prefix="C"){
    return prefix + "_" + Math.random().toString(16).slice(2,10) + "_" + Date.now().toString(16);
  }

  // ---- Simulator ----
  function simulateVitals(){
    // محاكاة لطيفة (قريبة من الواقع) + بعض الحالات الحرجة أحيانًا
    const rnd = (a,b)=> Math.round(a + Math.random()*(b-a));
    const critical = Math.random() < 0.18;

    const hr   = critical ? rnd(110,145) : rnd(68,105);
    const spo2 = critical ? rnd(88,93)   : rnd(95,100);
    const temp = critical ? (rnd(380, 402)/10) : (rnd(362, 377)/10);
    const bpS  = critical ? rnd(145,170) : rnd(100,135);

    return { hr, spo2, temp, bpS };
  }

  // ---- AI Triage (Mock) ----
  function triageAI({complaint, vitals}){
    const score =
      (vitals.temp >= 38.5 ? 30 : vitals.temp >= 37.8 ? 18 : 5) +
      (vitals.spo2 <= 93 ? 30 : vitals.spo2 <= 95 ? 15 : 5) +
      (vitals.hr >= 120 ? 20 : vitals.hr >= 105 ? 10 : 5) +
      (vitals.bpS >= 150 ? 15 : vitals.bpS >= 135 ? 8 : 3) +
      (complaint && complaint.length > 30 ? 5 : 2);

    const risk =
      score >= 80 ? "Critical" :
      score >= 55 ? "High" :
      score >= 35 ? "Moderate" : "Low";

    const priority =
      risk === "Critical" ? "P1" :
      risk === "High" ? "P2" :
      risk === "Moderate" ? "P3" : "P4";

    const recommendation =
      risk === "Critical" ? "إحالة عاجلة + عيادة افتراضية فورية + إشعار ولي الأمر والإدارة" :
      risk === "High" ? "عيادة افتراضية خلال 10 دقائق + متابعة + إشعار ولي الأمر" :
      risk === "Moderate" ? "راحة + متابعة خلال اليوم + إرشادات" :
      "إرشادات + ماء وراحة + متابعة عند الحاجة";

    return { score, risk, priority, recommendation };
  }

  // ---- Core Actions ----
  function createCase({studentId, complaint, vitals}){
    const db = getDB();
    const triage = triageAI({complaint, vitals});
    const c = {
      id: uid("CASE"),
      studentId: studentId || "STU-DEMO",
      complaint: complaint || "بدون شكوى",
      vitals,
      triage,
      status: triage.risk === "Critical" ? "Needs-Doctor-Now" : "Queued",
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    db.cases.unshift(c);
    db.stats.requests += 1;
    db.stats.cases = db.cases.length;
    db.stats.critical = db.cases.filter(x=>x.triage.risk==="Critical").length;
    db.stats.followup = db.cases.filter(x=>x.triage.risk==="Moderate" || x.triage.risk==="High").length;
    setDB(db);
    return c;
  }

  function requestVirtualVisit(caseId){
    const db = getDB();
    const c = db.cases.find(x=>x.id===caseId);
    if(!c) return null;
    const v = {
      id: uid("VISIT"),
      caseId,
      doctorDecision: "Pending",
      parentInvite: false,
      consent: "Pending",
      notes: "",
      createdAt: nowISO()
    };
    db.visits.unshift(v);
    c.status = "Visit-Requested";
    c.updatedAt = nowISO();
    setDB(db);
    return v;
  }

  function doctorDecision(caseId, decision, notes=""){
    const db = getDB();
    const c = db.cases.find(x=>x.id===caseId);
    if(!c) return null;

    const v = db.visits.find(x=>x.caseId===caseId) || requestVirtualVisit(caseId);
    v.doctorDecision = decision;
    v.notes = notes || v.notes;

    if(decision === "Approve"){
      c.status = "Visit-Approved";
    } else if(decision === "Reject"){
      c.status = "Visit-Rejected";
    } else if(decision === "FollowUp"){
      c.status = "FollowUp";
    } else if(decision === "Refer"){
      c.status = "Referred";
    } else {
      c.status = "Doctor-Review";
    }
    c.updatedAt = nowISO();
    setDB(db);
    return { c, v };
  }

  function inviteParent(caseId){
    const db = getDB();
    const v = db.visits.find(x=>x.caseId===caseId) || requestVirtualVisit(caseId);
    v.parentInvite = true;
    setDB(db);
    return v;
  }

  function grantConsent(caseId, ok=true){
    const db = getDB();
    const v = db.visits.find(x=>x.caseId===caseId);
    if(!v) return null;
    v.consent = ok ? "Granted" : "Declined";
    setDB(db);
    return v;
  }

  // ---- UI helpers ----
  function renderCommon(role){
    // عدادات بسيطة لو موجودة عناصرها
    const db = getDB();
    const set = (id, val)=>{ const el = qs(id); if(el) el.textContent = val; };

    set("#kpiRequests", db.stats.requests);
    set("#kpiCases", db.stats.cases);
    set("#kpiCritical", db.stats.critical);
    set("#kpiFollowup", db.stats.followup);

    // آخر حالة
    const last = db.cases[0];
    if(last){
      set("#lastRisk", last.triage.risk);
      set("#lastPriority", last.triage.priority);
      set("#lastStatus", last.status);
    }

    audit(role, "render", {cases: db.cases.length});
  }

  // ---- Event Delegation: any button with data-action ----
  function bindActions(role){
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if(!btn) return;

      const action = btn.getAttribute("data-action");
      const meta = btn.getAttribute("data-meta");
      const payload = meta ? JSON.parse(meta) : {};

      try{
        // Student
        if(action === "student.simulate"){
          const complaint = (qs("#studentComplaint")?.value || "").trim();
          const vitals = simulateVitals();
          const c = createCase({ studentId: "STU-DEMO", complaint, vitals });
          store.set("ssc_last_case", c.id);

          // تعبئة الحساسات إن وجدت IDs
          if(qs("#vHR"))   qs("#vHR").textContent = vitals.hr;
          if(qs("#vSpO2")) qs("#vSpO2").textContent = vitals.spo2;
          if(qs("#vTemp")) qs("#vTemp").textContent = vitals.temp;
          if(qs("#vBP"))   qs("#vBP").textContent = vitals.bpS;

          // تعبئة الفرز
          if(qs("#aiRisk")) qs("#aiRisk").textContent = c.triage.risk;
          if(qs("#aiPriority")) qs("#aiPriority").textContent = c.triage.priority;
          if(qs("#aiRec")) qs("#aiRec").textContent = c.triage.recommendation;

          toast("تم توليد قراءات + فرز ذكي ✅");
          audit(role, action, {caseId: c.id});
          renderCommon(role);
          return;
        }

        if(action === "student.requestVisit"){
          const caseId = store.get("ssc_last_case", null);
          if(!caseId) return toast("سوّ محاكاة الحساسات أولًا.");
          requestVirtualVisit(caseId);
          toast("تم طلب عيادة افتراضية للطبيب ✅");
          audit(role, action, {caseId});
          renderCommon(role);
          return;
        }

        // Doctor
        if(action === "doctor.loadLatest"){
          const db = getDB();
          const c = db.cases[0];
          if(!c) return toast("لا توجد حالات.");
          store.set("ssc_doctor_case", c.id);

          const set = (id,val)=>{ const el=qs(id); if(el) el.textContent = val; };
          set("#dComplaint", c.complaint);
          set("#dHR", c.vitals.hr);
          set("#dSpO2", c.vitals.spo2);
          set("#dTemp", c.vitals.temp);
          set("#dBP", c.vitals.bpS);
          set("#dRisk", c.triage.risk);
          set("#dPriority", c.triage.priority);
          set("#dRec", c.triage.recommendation);
          toast("تم تحميل آخر حالة للطبيب ✅");
          audit(role, action, {caseId: c.id});
          return;
        }

        if(action === "doctor.secondReading"){
          const caseId = store.get("ssc_doctor_case", null);
          if(!caseId) return toast("اضغط: تحميل آخر حالة.");
          const db = getDB();
          const c = db.cases.find(x=>x.id===caseId);
          if(!c) return toast("الحالة غير موجودة.");

          const v2 = simulateVitals();
          c.vitals2 = v2;
          c.triage2 = triageAI({ complaint: c.complaint, vitals: v2 });
          c.updatedAt = nowISO();
          setDB(db);

          if(qs("#dHR2")) qs("#dHR2").textContent = v2.hr;
          if(qs("#dSpO22")) qs("#dSpO22").textContent = v2.spo2;
          if(qs("#dTemp2")) qs("#dTemp2").textContent = v2.temp;
          if(qs("#dBP2")) qs("#dBP2").textContent = v2.bpS;
          if(qs("#dRisk2")) qs("#dRisk2").textContent = c.triage2.risk;
          if(qs("#dPriority2")) qs("#dPriority2").textContent = c.triage2.priority;

          toast("تم طلب قراءة ثانية + تحديث الفرز ✅");
          audit(role, action, {caseId});
          renderCommon(role);
          return;
        }

        if(action === "doctor.decision"){
          const caseId = store.get("ssc_doctor_case", null);
          if(!caseId) return toast("اضغط: تحميل آخر حالة.");
          const decision = payload.decision; // Approve/Reject/FollowUp/Refer
          const notes = (qs("#doctorNotes")?.value || "").trim();
          doctorDecision(caseId, decision, notes);
          toast(`قرار الطبيب: ${decision} ✅`);
          audit(role, action, {caseId, decision});
          renderCommon(role);
          return;
        }

        if(action === "doctor.inviteParent"){
          const caseId = store.get("ssc_doctor_case", null);
          if(!caseId) return toast("اضغط: تحميل آخر حالة.");
          inviteParent(caseId);
          toast("تمت دعوة ولي الأمر للزيارة ✅");
          audit(role, action, {caseId});
          renderCommon(role);
          return;
        }

        // Parent
        if(action === "parent.load"){
          const db = getDB();
          const last = db.cases[0];
          if(!last) return toast("لا توجد حالات.");
          store.set("ssc_parent_case", last.id);

          const set = (id,val)=>{ const el=qs(id); if(el) el.textContent = val; };
          set("#pComplaint", last.complaint);
          set("#pRisk", last.triage.risk);
          set("#pPriority", last.triage.priority);
          set("#pRec", last.triage.recommendation);
          toast("تم تحميل آخر حالة للطالب ✅");
          audit(role, action, {caseId:last.id});
          return;
        }

        if(action === "parent.consent"){
          const caseId = store.get("ssc_parent_case", null);
          if(!caseId) return toast("اضغط: تحميل الحالة.");
          grantConsent(caseId, payload.ok);
          toast(payload.ok ? "تمت الموافقة ✅" : "تم الرفض ❌");
          audit(role, action, {caseId, ok: payload.ok});
          renderCommon(role);
          return;
        }

        // Admin
        if(action === "admin.refresh"){
          renderCommon(role);
          toast("تم تحديث لوحة الإدارة ✅");
          audit(role, action, {});
          return;
        }

        // Default
        toast("هذا الزر يحتاج ربط Action.");
        audit(role, "unhandled", {action});
      }catch(err){
        console.error(err);
        toast("صار خطأ أثناء تنفيذ الإجراء.");
      }
    });
  }

  function init(role){
    bindActions(role);
    renderCommon(role);
    console.log("✅ Actions Engine ready");
  }

  return { init, getDB, triageAI, simulateVitals };
})();

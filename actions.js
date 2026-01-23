/* actions.js — Smart School Clinic OS (Static)
   - Works with: bus.js, auth.js, sensor-sim.js, triage-ai.js, visit-session.js
   - Persists everything to localStorage
*/

(() => {
  "use strict";

  const KEY = {
    STATE: "ssc_state_v1",
    CASES: "ssc_cases_v1",
    VISITS: "ssc_visits_v1",
    AUDIT: "ssc_audit_v1",
    USER: "ssc_user_v1",
  };

  const now = () => new Date().toISOString();
  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); return v; }
  };

  // ---------- App State ----------
  function getState() {
    return LS.get(KEY.STATE, {
      lastCaseId: null,
      lastVisitId: null,
      counters: { requests: 0, cases: 0, critical: 0, followup: 0 },
      version: 1
    });
  }
  function setState(patch) {
    const s = { ...getState(), ...patch };
    LS.set(KEY.STATE, s);
    return s;
  }

  function getCases() { return LS.get(KEY.CASES, []); }
  function setCases(list) { return LS.set(KEY.CASES, list); }

  function getVisits() { return LS.get(KEY.VISITS, []); }
  function setVisits(list) { return LS.set(KEY.VISITS, list); }

  function getAudit() { return LS.get(KEY.AUDIT, []); }
  function pushAudit(entry) {
    const list = getAudit();
    list.unshift({ id: uid(), at: now(), ...entry });
    LS.set(KEY.AUDIT, list.slice(0, 400));
  }

  function getUser() {
    return LS.get(KEY.USER, { role: "student", name: "طالب (Demo)", schoolId: "S-1001" });
  }

  // ---------- Helpers ----------
  function computeCounters(cases, visits) {
    const requests = visits.filter(v => v.status === "pending").length;
    const all = cases.length;
    const critical = cases.filter(c => c.ai?.priority === "High" || c.ai?.risk === "High").length;
    const followup = cases.filter(c => c.plan?.type === "Follow-up").length;
    return { requests, cases: all, critical, followup };
  }

  function normalizeVitals(v) {
    return {
      hr: Math.round(clamp(v.hr ?? 0, 30, 200)),
      spo2: Math.round(clamp(v.spo2 ?? 0, 70, 100)),
      temp: +(clamp(v.temp ?? 0, 34, 41).toFixed(1)),
      bpSys: Math.round(clamp(v.bpSys ?? 0, 70, 200)),
      bpDia: Math.round(clamp(v.bpDia ?? 0, 40, 130)),
    };
  }

  function ensurePatientIdentity(payload = {}) {
    const u = getUser();
    const name = payload.patientName || u.name || "طالب (Demo)";
    const schoolId = payload.patientId || u.schoolId || "S-1001";
    const grade = payload.grade || pick(["خامس", "سادس", "أول متوسط", "ثاني متوسط", "ثالث متوسط"]);
    const age = payload.age || pick([10, 11, 12, 13, 14, 15, 16]);
    return { name, schoolId, grade, age };
  }

  // ---------- Core: Create/Update Case ----------
  function createCase({ complaint, vitals, ai, meta }) {
    const patient = ensurePatientIdentity(meta);
    const cases = getCases();

    const id = uid();
    const c = {
      id,
      createdAt: now(),
      updatedAt: now(),
      status: "open",        // open | in_review | resolved
      patient,
      complaint: complaint?.trim() || "",
      vitals: normalizeVitals(vitals || {}),
      ai: ai || null,
      plan: null,            // doctor plan
      attachments: [],
      notes: [],
      flags: { parentRequested: false, consentRequired: false },
    };

    cases.unshift(c);
    setCases(cases);

    const counters = computeCounters(cases, getVisits());
    setState({ lastCaseId: id, counters });

    pushAudit({ type: "CASE_CREATED", role: getUser().role, ref: id, summary: `إنشاء حالة للطالب ${patient.name}` });

    // notify UI
    window.bus?.emit("case:created", c);
    window.bus?.emit("stats:update", counters);

    return c;
  }

  function updateCase(caseId, patch) {
    const cases = getCases();
    const i = cases.findIndex(c => c.id === caseId);
    if (i < 0) return null;

    const before = cases[i];
    const after = { ...before, ...patch, updatedAt: now() };
    cases[i] = after;
    setCases(cases);

    const counters = computeCounters(cases, getVisits());
    setState({ lastCaseId: caseId, counters });

    window.bus?.emit("case:updated", after);
    window.bus?.emit("stats:update", counters);

    return after;
  }

  // ---------- Student Flow ----------
  function studentGenerateVitals(mode = "mixed") {
    const v = window.SensorSim?.generate(mode) || { hr: 88, spo2: 98, temp: 36.8, bpSys: 112, bpDia: 72 };
    const vitals = normalizeVitals(v);
    window.bus?.emit("vitals:generated", vitals);
    pushAudit({ type: "VITALS_GENERATED", role: "student", summary: `توليد قراءات حساسات (${mode})` });
    return vitals;
  }

  function studentRunTriage({ complaint, vitals }) {
    const vit = normalizeVitals(vitals || {});
    const ai = window.TriageAI?.triage({ complaint, vitals: vit }) || null;
    window.bus?.emit("triage:result", ai);
    pushAudit({ type: "AI_TRIAGE", role: "student", summary: `فرز ذكي AI: ${ai?.priority || "—"} / ${ai?.risk || "—"}` });
    return ai;
  }

  function studentCreateCaseFromUI({ complaint, vitals, ai }) {
    const c = createCase({ complaint, vitals, ai, meta: {} });
    return c;
  }

  function studentRequestVirtualVisit({ caseId, reason }) {
    const cases = getCases();
    const c = cases.find(x => x.id === caseId);
    if (!c) return null;

    const visits = getVisits();
    const id = uid();
    const v = {
      id,
      createdAt: now(),
      updatedAt: now(),
      caseId: c.id,
      patient: c.patient,
      status: "pending", // pending | accepted | rejected | completed | cancelled
      requestedBy: "student",
      requestedReason: reason || "طلب زيارة افتراضية",
      doctorDecision: null,
      allowParent: false,
      consent: { required: false, approved: false },
      room: { joinCode: Math.random().toString(10).slice(2, 8), urlHash: "#visit" },
      timeline: [{ at: now(), txt: "تم إنشاء طلب الزيارة الافتراضية" }],
    };

    visits.unshift(v);
    setVisits(visits);

    // Case flags
    updateCase(c.id, { status: "in_review" });

    const counters = computeCounters(getCases(), visits);
    setState({ lastVisitId: id, counters });

    pushAudit({ type: "VISIT_REQUESTED", role: "student", ref: id, summary: `طلب زيارة افتراضية للحالة ${c.id}` });

    window.bus?.emit("visit:created", v);
    window.bus?.emit("stats:update", counters);

    return v;
  }

  // ---------- Doctor Flow ----------
  function doctorRequestRecheck(caseId, which = "all") {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;

    // generate a second reading (slightly different)
    const v2 = normalizeVitals(window.SensorSim?.generate("mixed") || c.vitals);
    const note = { at: now(), by: "doctor", txt: `طلب إعادة قياس (${which}) — تم استلام قراءة ثانية.` };

    const updated = updateCase(caseId, {
      vitals: v2,
      notes: [note, ...(c.notes || [])]
    });

    pushAudit({ type: "DOCTOR_RECHECK", role: "doctor", ref: caseId, summary: "طلب قراءة ثانية للحساسات" });
    window.bus?.emit("toast", { type: "info", msg: "تم تحديث القراءات (قراءة ثانية)" });

    return updated;
  }

  function doctorAskCopilot({ caseId, question }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const res = window.DoctorCopilot?.answer({ case: c, question }) || { answer: "—" };
    pushAudit({ type: "DOCTOR_COPILOT", role: "doctor", ref: caseId, summary: `سؤال مساعد الطبيب: ${question?.slice(0,60)}` });
    window.bus?.emit("copilot:answer", res);
    return res;
  }

  function doctorSetPlan(caseId, plan) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;

    const updated = updateCase(caseId, { plan: { ...plan, at: now(), by: "doctor" }, status: "resolved" });
    pushAudit({ type: "DOCTOR_PLAN", role: "doctor", ref: caseId, summary: `خطة علاج/قرار: ${plan?.type || "—"}` });
    window.bus?.emit("toast", { type: "ok", msg: "تم حفظ قرار الطبيب" });
    return updated;
  }

  function doctorDecisionOnVisit(visitId, decision, opts = {}) {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    if (i < 0) return null;

    const v = visits[i];
    const d = {
      at: now(),
      by: "doctor",
      decision, // accept | reject | parent_join | consent_required | refer
      note: opts.note || "",
    };

    let status = v.status;
    if (decision === "accept") status = "accepted";
    if (decision === "reject") status = "rejected";
    if (decision === "refer") status = "accepted"; // still can be handled in visit page + plan
    // parent_join/consent_required keep pending until student/parent approves
    if (decision === "parent_join") status = "pending";
    if (decision === "consent_required") status = "pending";

    const allowParent = decision === "parent_join" ? true : v.allowParent;
    const consentRequired = decision === "consent_required" ? true : (v.consent?.required || false);

    const updated = {
      ...v,
      updatedAt: now(),
      status,
      allowParent,
      consent: { required: consentRequired, approved: v.consent?.approved || false },
      doctorDecision: d,
      timeline: [{ at: now(), txt: `قرار الطبيب: ${decision}` }, ...(v.timeline || [])],
    };

    visits[i] = updated;
    setVisits(visits);

    // Update counters
    const counters = computeCounters(getCases(), visits);
    setState({ lastVisitId: visitId, counters });
    window.bus?.emit("visit:updated", updated);
    window.bus?.emit("stats:update", counters);

    pushAudit({ type: "VISIT_DECISION", role: "doctor", ref: visitId, summary: `قرار الطبيب على الزيارة: ${decision}` });

    return updated;
  }

  // ---------- Parent Flow ----------
  function parentApproveConsent(visitId, approved = true) {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    if (i < 0) return null;
    const v = visits[i];

    const updated = {
      ...v,
      updatedAt: now(),
      consent: { required: true, approved: !!approved },
      timeline: [{ at: now(), txt: approved ? "ولي الأمر: تمت الموافقة على الإجراء" : "ولي الأمر: تم رفض الموافقة" }, ...(v.timeline || [])],
    };

    visits[i] = updated;
    setVisits(visits);

    pushAudit({ type: "PARENT_CONSENT", role: "parent", ref: visitId, summary: approved ? "موافقة ولي الأمر" : "رفض ولي الأمر" });
    window.bus?.emit("visit:updated", updated);

    return updated;
  }

  function parentJoinRequest(visitId) {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    if (i < 0) return null;
    const v = visits[i];
    const updated = {
      ...v,
      updatedAt: now(),
      allowParent: true,
      timeline: [{ at: now(), txt: "ولي الأمر طلب/فعّل الانضمام" }, ...(v.timeline || [])],
    };
    visits[i] = updated;
    setVisits(visits);

    pushAudit({ type: "PARENT_JOIN", role: "parent", ref: visitId, summary: "تفعيل انضمام ولي الأمر" });
    window.bus?.emit("visit:updated", updated);
    return updated;
  }

  // ---------- Visit Session ----------
  function startVisit(visitId, who = "student") {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    if (i < 0) return null;
    const v = visits[i];

    const updated = window.VisitSession?.start(v, who) || v;
    visits[i] = updated;
    setVisits(visits);

    pushAudit({ type: "VISIT_START", role: who, ref: visitId, summary: "بدء جلسة زيارة افتراضية" });
    window.bus?.emit("visit:updated", updated);
    return updated;
  }

  function completeVisit(visitId, summaryText = "") {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    if (i < 0) return null;
    const v = visits[i];

    const updated = {
      ...v,
      updatedAt: now(),
      status: "completed",
      timeline: [{ at: now(), txt: "تم إنهاء الزيارة الافتراضية" }, ...(v.timeline || [])],
      sessionSummary: summaryText
    };
    visits[i] = updated;
    setVisits(visits);

    const counters = computeCounters(getCases(), visits);
    setState({ lastVisitId: visitId, counters });
    window.bus?.emit("visit:updated", updated);
    window.bus?.emit("stats:update", counters);

    pushAudit({ type: "VISIT_DONE", role: "doctor", ref: visitId, summary: "إنهاء الزيارة الافتراضية" });
    return updated;
  }

  // ---------- Admin ----------
  function adminExportJSON() {
    const payload = {
      exportedAt: now(),
      state: getState(),
      cases: getCases(),
      visits: getVisits(),
      audit: getAudit(),
    };
    const txt = JSON.stringify(payload, null, 2);
    const blob = new Blob([txt], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ssc-export-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    pushAudit({ type: "ADMIN_EXPORT", role: "admin", summary: "تصدير بيانات النظام JSON" });
  }

  function adminResetAll() {
    if (!confirm("تأكيد: مسح كل البيانات؟")) return;
    localStorage.removeItem(KEY.STATE);
    localStorage.removeItem(KEY.CASES);
    localStorage.removeItem(KEY.VISITS);
    localStorage.removeItem(KEY.AUDIT);
    pushAudit({ type: "ADMIN_RESET", role: "admin", summary: "تم مسح البيانات" });
    location.reload();
  }

  // ---------- Bind Buttons (generic) ----------
  function byId(id) { return document.getElementById(id); }
  function val(id) { const el = byId(id); return el ? (el.value || "").trim() : ""; }

  function bindStudent() {
    const gen = byId("btnGenVitals");
    const tri = byId("btnRunAI");
    const mk  = byId("btnCreateCase");
    const req = byId("btnRequestVisit");

    let currentVitals = null;
    let currentAI = null;
    let currentCase = null;

    if (gen) gen.addEventListener("click", () => {
      currentVitals = studentGenerateVitals("mixed");
    });

    if (tri) tri.addEventListener("click", () => {
      const complaint = val("complaint");
      currentAI = studentRunTriage({ complaint, vitals: currentVitals || {} });
    });

    if (mk) mk.addEventListener("click", () => {
      const complaint = val("complaint");
      if (!complaint) return window.bus?.emit("toast", { type: "warn", msg: "اكتب الشكوى أولاً" });
      currentCase = studentCreateCaseFromUI({ complaint, vitals: currentVitals || {}, ai: currentAI || null });
      window.bus?.emit("toast", { type: "ok", msg: "تم إنشاء الحالة" });
    });

    if (req) req.addEventListener("click", () => {
      const complaint = val("complaint") || "طلب زيارة افتراضية";
      const useCaseId = currentCase?.id || getState().lastCaseId;
      if (!useCaseId) return window.bus?.emit("toast", { type: "warn", msg: "أنشئ حالة أولاً" });
      const v = studentRequestVirtualVisit({ caseId: useCaseId, reason: complaint });
      if (v) location.href = "visit.html?visit=" + encodeURIComponent(v.id);
    });

    window.bus?.emit("student:ready", true);
  }

  function bindDoctor() {
    const recheck = byId("btnRecheck");
    const accept = byId("btnAcceptVisit");
    const reject = byId("btnRejectVisit");
    const parent = byId("btnParentJoin");
    const consent = byId("btnConsentReq");
    const refer = byId("btnRefer");
    const planSave = byId("btnSavePlan");
    const ask = byId("btnAskAI");

    const caseId = new URLSearchParams(location.search).get("case") || getState().lastCaseId;
    const visitId = new URLSearchParams(location.search).get("visit") || getState().lastVisitId;

    if (recheck) recheck.addEventListener("click", () => {
      if (!caseId) return window.bus?.emit("toast", { type:"warn", msg:"لا توجد حالة محددة" });
      doctorRequestRecheck(caseId, "all");
    });

    if (ask) ask.addEventListener("click", () => {
      if (!caseId) return window.bus?.emit("toast", { type:"warn", msg:"اختر حالة أولاً" });
      const q = val("docQuestion") || "اقترح تشخيصًا تفريقيًا وخطة مبدئية بناءً على الشكوى والقراءات.";
      doctorAskCopilot({ caseId, question: q });
    });

    if (accept) accept.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب زيارة" });
      doctorDecisionOnVisit(visitId, "accept");
      location.href = "visit.html?visit=" + encodeURIComponent(visitId);
    });

    if (reject) reject.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب زيارة" });
      doctorDecisionOnVisit(visitId, "reject", { note: "يرجى المراجعة حضوريًا/أو تحديث القياسات" });
    });

    if (parent) parent.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب زيارة" });
      doctorDecisionOnVisit(visitId, "parent_join");
    });

    if (consent) consent.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب زيارة" });
      doctorDecisionOnVisit(visitId, "consent_required", { note: "يتطلب موافقة ولي الأمر على الإجراء" });
    });

    if (refer) refer.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب زيارة" });
      doctorDecisionOnVisit(visitId, "refer", { note: "إحالة للجهة المختصة/طوارئ حسب الحالة" });
    });

    if (planSave) planSave.addEventListener("click", () => {
      if (!caseId) return window.bus?.emit("toast", { type:"warn", msg:"لا توجد حالة" });
      const type = val("planType") || "Advice";
      const dx = val("diagnosis") || "غير محدد";
      const meds = val("meds") || "";
      const note = val("planNote") || "";
      doctorSetPlan(caseId, { type, diagnosis: dx, meds, note });
    });

    window.bus?.emit("doctor:ready", true);
  }

  function bindAdmin() {
    const exp = byId("btnExport");
    const reset = byId("btnReset");
    if (exp) exp.addEventListener("click", adminExportJSON);
    if (reset) reset.addEventListener("click", adminResetAll);
    window.bus?.emit("admin:ready", true);
  }

  function bindParent() {
    const approve = byId("btnApprove");
    const reject = byId("btnReject");
    const join = byId("btnJoin");

    const visitId = new URLSearchParams(location.search).get("visit") || getState().lastVisitId;

    if (approve) approve.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب" });
      parentApproveConsent(visitId, true);
      window.bus?.emit("toast", { type:"ok", msg:"تمت الموافقة" });
    });

    if (reject) reject.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب" });
      parentApproveConsent(visitId, false);
      window.bus?.emit("toast", { type:"warn", msg:"تم الرفض" });
    });

    if (join) join.addEventListener("click", () => {
      if (!visitId) return window.bus?.emit("toast", { type:"warn", msg:"لا يوجد طلب" });
      parentJoinRequest(visitId);
      location.href = "visit.html?visit=" + encodeURIComponent(visitId) + "&who=parent";
    });

    window.bus?.emit("parent:ready", true);
  }

  function autoBindByPage() {
    const page = document.body?.dataset?.page;
    if (page === "student") bindStudent();
    if (page === "doctor") bindDoctor();
    if (page === "admin") bindAdmin();
    if (page === "parent") bindParent();
  }

  // ---------- Public API ----------
  window.Actions = {
    // store
    getState, getCases, getVisits, getAudit, getUser,
    // student
    studentGenerateVitals, studentRunTriage, studentCreateCaseFromUI, studentRequestVirtualVisit,
    // doctor
    doctorRequestRecheck, doctorAskCopilot, doctorSetPlan, doctorDecisionOnVisit,
    // parent
    parentApproveConsent, parentJoinRequest,
    // visit
    startVisit, completeVisit,
    // admin
    adminExportJSON, adminResetAll,
    // bind
    autoBindByPage,
  };

  // auto bind after DOM
  document.addEventListener("DOMContentLoaded", () => {
    autoBindByPage();
  });

})();

/* app.js — Smart School Clinic OS (Static Core)
   Provides window.app for actions.js
   Uses localStorage as backend (Demo), Backend-ready later.
*/

(() => {
  "use strict";

  const KEY = {
    CASES: "ssc_cases_v1",
    VISITS: "ssc_visits_v1",
    AUDIT: "ssc_audit_v1",
    STATE: "ssc_state_v1",
  };

  const now = () => new Date().toISOString();
  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); return v; },
  };

  function getCases() { return LS.get(KEY.CASES, []); }
  function setCases(list) { return LS.set(KEY.CASES, list); }

  function getVisits() { return LS.get(KEY.VISITS, []); }
  function setVisits(list) { return LS.set(KEY.VISITS, list); }

  function getAudit() { return LS.get(KEY.AUDIT, []); }
  function setAudit(list) { return LS.set(KEY.AUDIT, list); }

  function getState() {
    return LS.get(KEY.STATE, { lastCaseId: null, lastVisitId: null });
  }
  function setState(patch) {
    const s = { ...getState(), ...patch };
    return LS.set(KEY.STATE, s);
  }

  function getIdentity() {
    // Prefer app-init SC user; fallback to auth.js if exists
    const scUser = (() => {
      try { return JSON.parse(localStorage.getItem("SC_USER") || "{}"); } catch { return {}; }
    })();
    const role = (localStorage.getItem("SC_ROLE") || "").toLowerCase().trim();
    if (scUser && scUser.role) return scUser;
    if (window.Auth?.getUser) return window.Auth.getUser();
    return { role: role || "student", name: "Demo", schoolId: "S-1001" };
  }

  function audit(event, data = {}) {
    const list = getAudit();
    list.unshift({ id: uid(), at: now(), event, data, role: getIdentity().role || "none" });
    setAudit(list.slice(0, 400));
    try { window.bus?.emit?.("audit:update", list[0]); } catch {}
  }

  // ---------------- Student pipeline ----------------
  let cachedSensors = null;

  function simulateSensors(opts = {}) {
    const mode = opts.mode || "mixed";
    cachedSensors = window.SensorSim?.generate(mode) || cachedSensors || null;
    try { window.bus?.emit?.("sensors:update", cachedSensors); } catch {}
    return cachedSensors;
  }

  function getLatestSensors() {
    return cachedSensors;
  }

  function runTriage({ complaint }) {
    const vitals = cachedSensors || window.SensorSim?.generate("mixed");
    cachedSensors = vitals;

    const triage = window.TriageAI?.triage({ complaint, vitals }) || null;
    return triage;
  }

  function createCase({ complaint }) {
    const me = getIdentity();
    const sensors = cachedSensors || window.SensorSim?.generate("mixed") || {};
    cachedSensors = sensors;

    const triage = window.TriageAI?.triage({ complaint, vitals: sensors }) || null;

    const c = {
      id: "CASE-" + uid().slice(0, 6).toUpperCase(),
      createdAt: now(),
      updatedAt: now(),
      status: "open", // open|in_review|resolved
      patient: {
        name: me.role === "student" ? (me.name || "طالب") : "طالب (Demo)",
        schoolId: me.schoolId || "S-1001",
        grade: me.grade || "ثاني متوسط",
        age: me.age || 13,
      },
      complaint: complaint || "",
      sensors,
      triage,
      diagnosis: null,
      plan: null,
      decision: null,
      slip: null,
      visit: { status: "none", allowParent: false, consent: "none" },
      timeline: [{ at: now(), txt: "تم إنشاء الحالة" }],
    };

    const cases = getCases();
    cases.push(c);
    setCases(cases);
    setState({ lastCaseId: c.id });

    audit("case.created", { caseId: c.id });
    try { window.bus?.emit?.("case:update", c); } catch {}
    return c;
  }

  function getLatestCase() {
    const cases = getCases();
    return cases.length ? cases[cases.length - 1] : null;
  }

  // Doctor picks "active case"
  function getDoctorActiveCase() {
    const st = getState();
    const id = st.lastCaseId;
    if (!id) return getLatestCase();
    return getCases().find(c => c.id === id) || getLatestCase();
  }

  function updateCase(caseId, patch) {
    const cases = getCases();
    const i = cases.findIndex(c => c.id === caseId);
    if (i < 0) return null;
    cases[i] = { ...cases[i], ...patch, updatedAt: now() };
    setCases(cases);
    setState({ lastCaseId: caseId });
    try { window.bus?.emit?.("case:update", cases[i]); } catch {}
    return cases[i];
  }

  function attachSecondReading({ caseId, sensors }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "تم تسجيل قراءة ثانية للحساسات" });
    return updateCase(caseId, { sensors, timeline: t });
  }

  function doctorCopilot({ caseId }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    return window.DoctorCopilot?.answer({ case: { complaint: c.complaint, vitals: c.sensors, patient: c.patient }, question: "" }) || null;
  }

  function saveDiagnosis({ caseId, diagnosis, plan }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "تم حفظ التشخيص والخطة" });
    audit("doctor.diagnosis", { caseId });
    return updateCase(caseId, { diagnosis, plan, timeline: t });
  }

  function setVisitStatus({ caseId, status }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const v = { ...(c.visit || {}), status };
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: `حالة الزيارة: ${status}` });
    audit("visit.status", { caseId, status });
    try { window.bus?.emit?.("visit:update", { caseId, status }); } catch {}
    return updateCase(caseId, { visit: v, timeline: t, status: "in_review" });
  }

  function requestVisit({ caseId }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;

    // create a visit request record
    const visit = {
      id: "VIS-" + uid().slice(0, 6).toUpperCase(),
      createdAt: now(),
      updatedAt: now(),
      caseId,
      status: "pending",
      allowParent: false,
      consent: "none", // none|required|approved|declined
      joinCode: Math.random().toString(10).slice(2, 8),
      chat: [],
      timeline: [{ at: now(), txt: "تم إنشاء طلب زيارة افتراضية" }],
    };

    const visits = getVisits();
    visits.push(visit);
    setVisits(visits);
    setState({ lastVisitId: visit.id });

    // reflect on case
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "تم إرسال طلب زيارة افتراضية للطبيب" });
    updateCase(caseId, { visit: { ...c.visit, status: "pending" }, timeline: t, status: "in_review" });

    audit("visit.requested", { caseId, visitId: visit.id });
    try { window.bus?.emit?.("visit:update", visit); } catch {}
    return visit;
  }

  function requestParentJoin({ caseId }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const v = { ...(c.visit || {}), allowParent: true };
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "تم طلب/تفعيل انضمام ولي الأمر" });
    audit("visit.parent_join", { caseId });
    return updateCase(caseId, { visit: v, timeline: t });
  }

  function setConsent({ caseId, consent }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const v = { ...(c.visit || {}), consent };
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: `حالة الموافقة: ${consent}` });
    audit("visit.consent", { caseId, consent });
    return updateCase(caseId, { visit: v, timeline: t });
  }

  function setDecision({ caseId, decision }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: `قرار الطبيب: ${decision}` });
    audit("doctor.decision", { caseId, decision });
    return updateCase(caseId, { decision, timeline: t });
  }

  function createSlip({ caseId, type, days }) {
    const slip = { id: "SLIP-" + uid().slice(0, 5).toUpperCase(), type, days, at: now() };
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: `تم إصدار ${type} لمدة ${days} يوم` });
    audit("doctor.slip", { caseId, slip });
    updateCase(caseId, { slip, timeline: t });
    return slip;
  }

  function markFollowup({ caseId }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "وسم: تحتاج متابعة" });
    audit("doctor.followup", { caseId });
    return updateCase(caseId, { decision: "متابعة", timeline: t });
  }

  function resolveCase({ caseId }) {
    const c = getCases().find(x => x.id === caseId);
    if (!c) return null;
    const t = c.timeline || [];
    t.unshift({ at: now(), txt: "تم إغلاق الحالة" });
    audit("doctor.resolve", { caseId });
    return updateCase(caseId, { status: "resolved", timeline: t });
  }

  // ---------------- Admin / Parent ----------------
  function getAdminStats() {
    const cases = getCases();
    const visits = getVisits();
    const requests = visits.filter(v => v.status === "pending").length;
    const critical = cases.filter(c => (c.triage?.priority === "P1")).length;
    const followup = cases.filter(c => (c.decision || "").includes("متابعة")).length;
    return { requests, cases: cases.length, critical, followup };
  }

  function exportAll() {
    return {
      exportedAt: now(),
      state: getState(),
      identity: getIdentity(),
      cases: getCases(),
      visits: getVisits(),
      audit: getAudit(),
    };
  }

  function resetDemo() {
    localStorage.removeItem(KEY.CASES);
    localStorage.removeItem(KEY.VISITS);
    localStorage.removeItem(KEY.AUDIT);
    localStorage.removeItem(KEY.STATE);
    cachedSensors = null;
  }

  function getParentSummary() {
    const me = getIdentity();
    const childId = me.childSchoolId || me.schoolId || "S-1001";
    const cases = getCases().filter(c => c.patient?.schoolId === childId);
    const last = cases.length ? cases[cases.length - 1] : null;

    return {
      childName: last?.patient?.name || "ابن/ابنة (Demo)",
      lastCaseTitle: last ? `حالة ${last.id}` : "لا توجد حالات",
      status: last?.status || "—",
      nextSteps: last?.triage?.recommendation ? "راجع التوصيات / اطلب الانضمام عند الحاجة" : "—",
      cases: cases.slice(-6).reverse().map(c => ({
        title: `${c.id} • ${c.triage?.priority || "—"} / ${c.triage?.risk || "—"}`,
        time: new Date(c.createdAt).toLocaleString("ar-SA"),
        status: c.status
      }))
    };
  }

  // expose
  window.app = {
    // storage
    getCases, getVisits, getAudit, getState,
    // audit
    audit,
    // student
    simulateSensors, getLatestSensors, runTriage, createCase, getLatestCase,
    requestVisit,
    // doctor
    getDoctorActiveCase, attachSecondReading, doctorCopilot, saveDiagnosis,
    setVisitStatus, requestParentJoin, setConsent, setDecision, createSlip,
    markFollowup, resolveCase,
    // admin/parent
    getAdminStats, exportAll, resetDemo, getParentSummary,
  };

})();

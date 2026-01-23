/* actions.js — Smart School Clinic OS
   Event delegation for data-action across roles
   Storage-driven demo backend (localStorage)
*/

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Store ---------- */
  const Store = {
    keys: {
      cases: "SSCOS_CASES",
      queue: "SSCOS_QUEUE",
      audit: "SSCOS_AUDIT",
      selected: "SSCOS_SELECTED_CASE",
      parentInbox: "SSCOS_PARENT_INBOX"
    },
    read(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    },
    now() {
      return new Date().toISOString();
    },
    uid(prefix = "C") {
      return prefix + "-" + Math.random().toString(16).slice(2, 10).toUpperCase();
    },
    audit(type, payload = {}) {
      const logs = Store.read(Store.keys.audit, []);
      logs.unshift({ id: Store.uid("A"), t: Store.now(), type, ...payload });
      Store.write(Store.keys.audit, logs.slice(0, 500));
    }
  };

  /* ---------- Helpers ---------- */
  const UI = {
    toast(id, msg) {
      const el = $(id);
      if (el) el.textContent = msg;
    },
    set(id, val) {
      const el = $(id);
      if (el) el.textContent = val ?? "—";
    },
    box(id, val) {
      const el = $(id);
      if (el) el.textContent = val ?? "—";
    }
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  /* ---------- Data Model ---------- */
  function getCases() {
    return Store.read(Store.keys.cases, []);
  }
  function setCases(cases) {
    return Store.write(Store.keys.cases, cases);
  }
  function getQueue() {
    return Store.read(Store.keys.queue, []);
  }
  function setQueue(q) {
    return Store.write(Store.keys.queue, q);
  }
  function getSelectedCaseId() {
    return localStorage.getItem(Store.keys.selected) || "";
  }
  function setSelectedCaseId(id) {
    localStorage.setItem(Store.keys.selected, id || "");
  }
  function findCase(id) {
    return getCases().find((c) => c.id === id);
  }

  function upsertCase(next) {
    const cases = getCases();
    const i = cases.findIndex((c) => c.id === next.id);
    if (i >= 0) cases[i] = next;
    else cases.unshift(next);
    setCases(cases);
    return next;
  }

  /* ---------- Demo AI ---------- */
  function triageAI({ complaint = "", vitals = {} }) {
    const hr = Number(vitals.hr ?? 0);
    const spo2 = Number(vitals.spo2 ?? 0);
    const temp = Number(vitals.temp ?? 0);

    let risk = 20;
    if (temp >= 39) risk += 25;
    if (spo2 && spo2 < 92) risk += 40;
    if (hr && hr > 130) risk += 25;
    if (/ضيق|تنفس|إغماء|نزيف|تشنج|صدر/i.test(complaint)) risk += 35;

    risk = clamp(risk, 0, 100);

    const priority =
      risk >= 75 ? "Critical" :
      risk >= 50 ? "High" :
      risk >= 30 ? "Medium" : "Low";

    const decision =
      priority === "Critical" ? "زيارة افتراضية عاجلة + إشعار الإدارة" :
      priority === "High" ? "زيارة افتراضية اليوم" :
      priority === "Medium" ? "متابعة + إرشادات" : "إرشادات منزلية";

    const recommendation =
      priority === "Critical" ? "يوصى بإجراء تقييم فوري. راقب التنفس/الوعي، وفعّل التواصل مع ولي الأمر." :
      priority === "High" ? "يوصى بزيارة افتراضية مع الطبيب. اطلب قراءة ثانية للتأكيد عند الحاجة." :
      priority === "Medium" ? "يوصى بالراحة، سوائل، وقياس الحرارة خلال 4–6 ساعات." :
      "يوصى بإرشادات عامة ومتابعة الأعراض عند التغير.";

    return { risk, priority, decision, recommendation };
  }

  /* ---------- Demo Sensors ---------- */
  function genSensors() {
    const hr = Math.round(70 + Math.random() * 70);        // 70-140
    const spo2 = Math.round(92 + Math.random() * 8);       // 92-100
    const temp = (36 + Math.random() * 3.5).toFixed(1);    // 36-39.5
    const bpS = Math.round(95 + Math.random() * 45);       // 95-140
    const bpD = Math.round(55 + Math.random() * 30);       // 55-85
    return { hr, spo2, temp, bp: `${bpS}/${bpD}` };
  }

  /* ---------- Renderers ---------- */
  function renderDoctorQueue() {
    const wrap = $("#doctorQueue");
    if (!wrap) return;

    const q = getQueue();
    if (!q.length) {
      wrap.innerHTML = `<div class="muted">لا توجد طلبات حالياً.</div>`;
      return;
    }

    wrap.innerHTML = q.map((it) => `
      <button class="list-item" data-action="doctor.selectCase" data-id="${it.caseId}">
        <div class="row between">
          <div>
            <div class="title">طلب زيارة — ${it.studentName || "طالب"}</div>
            <div class="muted">${new Date(it.t).toLocaleString()}</div>
          </div>
          <div class="pill">${it.priority || "—"}</div>
        </div>
      </button>
    `).join("");
  }

  function renderAdminCases() {
    const wrap = $("#aCaseList");
    if (!wrap) return;

    const cases = getCases();
    if (!cases.length) {
      wrap.innerHTML = `<div class="muted">لا توجد حالات بعد.</div>`;
      return;
    }

    wrap.innerHTML = cases.slice(0, 15).map((c) => `
      <button class="list-item" data-action="admin.selectCase" data-id="${c.id}">
        <div class="row between">
          <div>
            <div class="title">${c.studentName || "طالب"} — ${c.priority || "—"}</div>
            <div class="muted">${(c.complaint || "").slice(0, 80)}${(c.complaint||"").length>80?"…":""}</div>
          </div>
          <div class="pill">${c.decision || "—"}</div>
        </div>
      </button>
    `).join("");
  }

  function renderAdminKPIs() {
    const cases = getCases();
    const q = getQueue();

    const critical = cases.filter(c => c.priority === "Critical").length;
    const followup = cases.filter(c => (c.tags||[]).includes("followup")).length;

    UI.set("#aRequests", q.length);
    UI.set("#aCases", cases.length);
    UI.set("#aCritical", critical);
    UI.set("#aFollowup", followup);
  }

  function renderAdminHeatmap() {
    const el = $("#aHeatmap");
    if (!el) return;

    const cases = getCases();
    const byP = { Critical:0, High:0, Medium:0, Low:0 };
    for (const c of cases) byP[c.priority] = (byP[c.priority]||0) + 1;

    el.classList.remove("muted");
    el.textContent = `Critical:${byP.Critical}  |  High:${byP.High}  |  Medium:${byP.Medium}  |  Low:${byP.Low}`;
  }

  function renderParentSummary() {
    // show last case related to parent (demo: latest case)
    const cases = getCases();
    const c = cases[0];
    if (!c) return;

    UI.set("#pCaseId", c.id);
    UI.set("#pStatus", c.status || "—");
    UI.set("#pPriority", c.priority || "—");
    UI.box("#pRecommendation", c.recommendation || "—");
    UI.box("#pDxPlan", `${c.dx || "—"}\n${c.plan || ""}`.trim());
  }

  function renderDoctorSelected(caseId) {
    const c = findCase(caseId);
    if (!c) return;

    UI.set("#dStudentName", c.studentName || "—");
    UI.set("#dTime", c.t ? new Date(c.t).toLocaleString() : "—");
    UI.box("#dComplaint", c.complaint || "—");

    UI.set("#dHR", c.vitals?.hr ?? "—");
    UI.set("#dSpO2", c.vitals?.spo2 ?? "—");
    UI.set("#dTemp", c.vitals?.temp ?? "—");
    UI.set("#dBP", c.vitals?.bp ?? "—");

    UI.set("#dRisk", c.risk ?? "—");
    UI.set("#dPriority", c.priority ?? "—");
    UI.set("#dDecision", c.decision ?? "—");
    UI.box("#dRecommendation", c.recommendation ?? "—");
  }

  function renderAdminSelected(caseId) {
    const c = findCase(caseId);
    if (!c) return;

    UI.set("#aStudent", c.studentName || "—");
    UI.set("#aStatus", c.status || "—");
    UI.set("#aDecision", c.decision || "—");
    UI.box("#aSummary",
      `شكوى: ${c.complaint || "—"}\n` +
      `Vitals: HR ${c.vitals?.hr ?? "—"}, SpO2 ${c.vitals?.spo2 ?? "—"}, Temp ${c.vitals?.temp ?? "—"}, BP ${c.vitals?.bp ?? "—"}\n` +
      `AI: Risk ${c.risk ?? "—"} | Priority ${c.priority ?? "—"}\n` +
      `Dx/Plan: ${(c.dx||"—")} ${(c.plan||"")}`
    );
  }

  /* ---------- Actions per role ---------- */
  const Handlers = {

    /* ===== Student ===== */
    "student.generateSensors": () => {
      const caseId = getSelectedCaseId() || Store.uid("CASE");
      const vitals = genSensors();

      // Create/update case for student
      const existing = findCase(caseId);
      const studentName = existing?.studentName || "طالب (Demo)";

      const next = upsertCase({
        id: caseId,
        t: existing?.t || Store.now(),
        studentName,
        status: existing?.status || "Ready",
        complaint: existing?.complaint || ($("#sComplaint")?.value || "صداع وتعب"),
        vitals,
        ...existing
      });

      setSelectedCaseId(next.id);
      Store.audit("student.generateSensors", { caseId: next.id, vitals });

      // Update UI if ids exist
      UI.set("#sHR", vitals.hr);
      UI.set("#sSpO2", vitals.spo2);
      UI.set("#sTemp", vitals.temp);
      UI.set("#sBP", vitals.bp);

      UI.toast("#sResult", "✅ تم توليد قراءات افتراضية.");
    },

    "student.runTriage": () => {
      const caseId = getSelectedCaseId();
      const c = findCase(caseId);
      if (!c) return UI.toast("#sResult", "⚠️ أولاً: ولّد القراءات أو أنشئ حالة.");

      const ai = triageAI({ complaint: c.complaint, vitals: c.vitals });

      const next = upsertCase({
        ...c,
        risk: ai.risk,
        priority: ai.priority,
        decision: ai.decision,
        recommendation: ai.recommendation
      });

      Store.audit("student.triageAI", { caseId: next.id, ai });

      // Update UI if ids exist
      UI.set("#sRisk", ai.risk);
      UI.set("#sPriority", ai.priority);
      UI.box("#sRecommendation", ai.recommendation);

      UI.toast("#sResult", "🤖 تم تحليل الحالة بواسطة AI.");
    },

    "student.requestVisit": () => {
      const caseId = getSelectedCaseId();
      const c = findCase(caseId);
      if (!c) return UI.toast("#sResult", "⚠️ أنشئ حالة أولاً.");

      // Ensure AI triage exists
      const ai = c.priority ? { risk:c.risk, priority:c.priority, decision:c.decision, recommendation:c.recommendation }
                            : triageAI({ complaint: c.complaint, vitals: c.vitals });

      const next = upsertCase({ ...c, ...ai, status: "Visit Requested" });

      // Push into doctor queue
      const q = getQueue();
      q.unshift({
        id: Store.uid("REQ"),
        t: Store.now(),
        caseId: next.id,
        studentName: next.studentName || "طالب",
        priority: next.priority
      });
      setQueue(q.slice(0, 50));

      Store.audit("student.requestVisit", { caseId: next.id });

      UI.toast("#sResult", "📨 تم إرسال طلب زيارة للطبيب.");
    },

    /* ===== Doctor ===== */
    "doctor.refresh": () => {
      renderDoctorQueue();
      const id = getSelectedCaseId();
      if (id) renderDoctorSelected(id);
      UI.toast("#dResult", "✅ تم تحديث قائمة الطلبات.");
    },

    "doctor.selectCase": (btn) => {
      const id = btn?.dataset?.id;
      if (!id) return;
      setSelectedCaseId(id);
      renderDoctorSelected(id);
      UI.toast("#dResult", `✅ تم اختيار الحالة: ${id}`);
    },

    "doctor.requestSecondReading": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const vitals2 = genSensors();
      const merged = { ...c, vitals: { ...c.vitals, ...vitals2 }, status: "Second Reading" };
      upsertCase(merged);

      Store.audit("doctor.secondReading", { caseId: id, vitals2 });
      renderDoctorSelected(id);
      UI.toast("#dResult", "📟 تم طلب/توليد قراءة ثانية (Demo).");
    },

    "doctor.runAiAssist": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const ai = triageAI({ complaint: c.complaint, vitals: c.vitals });
      const next = upsertCase({ ...c, ...ai, status: "AI Assisted" });

      Store.audit("doctor.aiAssist", { caseId: id, ai });
      renderDoctorSelected(id);
      UI.toast("#dResult", "🤖 تم تشغيل مساعد الطبيب AI.");
    },

    "doctor.acceptVisit": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      upsertCase({ ...c, status: "Visit Accepted" });
      Store.audit("doctor.acceptVisit", { caseId: id });
      UI.toast("#dResult", "✅ تم قبول الزيارة الافتراضية.");

      // optional: remove from queue
      setQueue(getQueue().filter(x => x.caseId !== id));
      renderDoctorQueue();
    },

    "doctor.rejectVisit": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      upsertCase({ ...c, status: "Visit Rejected" });
      Store.audit("doctor.rejectVisit", { caseId: id });
      UI.toast("#dResult", "⛔ تم رفض الزيارة.");

      setQueue(getQueue().filter(x => x.caseId !== id));
      renderDoctorQueue();
    },

    "doctor.requestParentJoin": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const inbox = Store.read(Store.keys.parentInbox, []);
      inbox.unshift({ id: Store.uid("PMSG"), t: Store.now(), caseId: id, type: "join_request" });
      Store.write(Store.keys.parentInbox, inbox.slice(0, 50));

      upsertCase({ ...c, status: "Parent Requested" });
      Store.audit("doctor.requestParentJoin", { caseId: id });

      UI.toast("#dResult", "👨‍👩‍👦 تم إرسال طلب انضمام لولي الأمر.");
    },

    "doctor.escalateToAdmin": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const tags = new Set([...(c.tags || []), "escalated"]);
      upsertCase({ ...c, tags: [...tags], status: "Escalated to Admin" });
      Store.audit("doctor.escalateAdmin", { caseId: id });

      UI.toast("#dResult", "🏫 تم إشعار الإدارة (Escalated).");
    },

    "doctor.issueSlip": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const dx = $("#dDx")?.value || c.dx || "—";
      const plan = $("#dPlan")?.value || c.plan || "راحة + سوائل + متابعة";
      const next = upsertCase({ ...c, dx, plan, decision: "Slip (راحة)", status: "Slip Issued" });

      Store.audit("doctor.issueSlip", { caseId: id, dx, plan });
      UI.toast("#dResult", "🧾 تم إصدار راحة.");
      renderDoctorSelected(next.id);
    },

    "doctor.createReferral": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const dx = $("#dDx")?.value || c.dx || "—";
      const plan = $("#dPlan")?.value || c.plan || "إحالة لمركز صحي";
      const next = upsertCase({ ...c, dx, plan, decision: "Referral (إحالة)", status: "Referred" });

      Store.audit("doctor.createReferral", { caseId: id, dx, plan });
      UI.toast("#dResult", "🏥 تم إنشاء إحالة.");
      renderDoctorSelected(next.id);
    },

    "doctor.exportReport": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#dResult", "⚠️ اختر حالة أولاً.");

      const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `case-${id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      Store.audit("doctor.exportReport", { caseId: id });
      UI.toast("#dResult", "📄 تم تصدير تقرير (JSON).");
    },

    /* ===== Admin ===== */
    "admin.refresh": () => {
      renderAdminKPIs();
      renderAdminHeatmap();
      renderAdminCases();

      const id = getSelectedCaseId();
      if (id) renderAdminSelected(id);

      UI.toast("#aResult", "✅ تم تحديث لوحة الإدارة.");
    },

    "admin.buildHeatmap": () => {
      renderAdminHeatmap();
      UI.toast("#aResult", "🔥 تم تحديث الـ Heatmap.");
    },

    "admin.seedDemo": () => {
      const demo = [];
      for (let i=0;i<8;i++){
        const vitals = genSensors();
        const complaint = ["صداع","حرارة","ألم بطن","دوخة","سعال","ضيق تنفس","إرهاق","غثيان"][i % 8];
        const ai = triageAI({ complaint, vitals });
        demo.push({
          id: Store.uid("CASE"),
          t: Store.now(),
          studentName: `طالب ${i+1}`,
          complaint,
          vitals,
          ...ai,
          status: "Ready",
          tags: []
        });
      }
      setCases(demo.concat(getCases()).slice(0, 200));
      Store.audit("admin.seedDemo", { n: 8 });

      renderAdminKPIs();
      renderAdminHeatmap();
      renderAdminCases();
      UI.toast("#aResult", "✨ تم توليد بيانات تجريبية.");
    },

    "admin.selectCase": (btn) => {
      const id = btn?.dataset?.id;
      if (!id) return;
      setSelectedCaseId(id);
      renderAdminSelected(id);
      UI.toast("#aResult", `✅ تم اختيار الحالة: ${id}`);
    },

    "admin.notifyParent": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#aResult", "⚠️ اختر حالة أولاً.");

      const inbox = Store.read(Store.keys.parentInbox, []);
      inbox.unshift({ id: Store.uid("PMSG"), t: Store.now(), caseId: id, type: "admin_notify" });
      Store.write(Store.keys.parentInbox, inbox.slice(0, 50));

      Store.audit("admin.notifyParent", { caseId: id });
      UI.toast("#aResult", "👨‍👩‍👦 تم إشعار ولي الأمر.");
    },

    "admin.notifyDoctor": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#aResult", "⚠️ اختر حالة أولاً.");

      // put back in queue as “Admin Reminder”
      const q = getQueue();
      q.unshift({ id: Store.uid("REQ"), t: Store.now(), caseId: id, studentName: c.studentName || "طالب", priority: c.priority || "—" });
      setQueue(q.slice(0, 50));

      Store.audit("admin.notifyDoctor", { caseId: id });
      UI.toast("#aResult", "👨‍⚕️ تم إشعار الطبيب (إعادة إدراج الطلب).");
    },

    "admin.markFollowup": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#aResult", "⚠️ اختر حالة أولاً.");

      const tags = new Set([...(c.tags||[]), "followup"]);
      upsertCase({ ...c, tags: [...tags], status: "Follow-up" });
      Store.audit("admin.followup", { caseId: id });

      renderAdminKPIs();
      renderAdminSelected(id);
      UI.toast("#aResult", "📌 تم وضع الحالة في المتابعة.");
    },

    "admin.markCritical": () => {
      const id = getSelectedCaseId();
      const c = findCase(id);
      if (!c) return UI.toast("#aResult", "⚠️ اختر حالة أولاً.");

      upsertCase({ ...c, priority: "Critical", risk: 90, status: "Critical" });
      Store.audit("admin.critical", { caseId: id });

      renderAdminKPIs();
      renderAdminHeatmap();
      renderAdminSelected(id);
      UI.toast("#aResult", "🚨 تم تصعيد الحالة إلى Critical.");
    },

    "admin.exportAudit": () => {
      const logs = Store.read(Store.keys.audit, []);
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `audit-log.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      UI.toast("#aResult", "🧾 تم تصدير سجل التدقيق.");
    },

    /* ===== Parent ===== */
    "parent.refresh": () => {
      renderParentSummary();
      UI.toast("#pResult", "✅ تم تحديث بيانات ولي الأمر.");
    },

    "parent.approveConsent": () => {
      const id = getSelectedCaseId() || (getCases()[0]?.id || "");
      const c = findCase(id);
      if (!c) return UI.toast("#pResult", "⚠️ لا توجد حالة.");

      upsertCase({ ...c, consent: true, status: "Consent Approved" });
      Store.audit("parent.approveConsent", { caseId: id });
      UI.toast("#pResult", "✅ تمت الموافقة على الزيارة.");
      renderParentSummary();
    },

    "parent.approveProcedure": () => {
      const id = getSelectedCaseId() || (getCases()[0]?.id || "");
      const c = findCase(id);
      if (!c) return UI.toast("#pResult", "⚠️ لا توجد حالة.");

      upsertCase({ ...c, procedureConsent: true, status: "Procedure Approved" });
      Store.audit("parent.approveProcedure", { caseId: id });
      UI.toast("#pResult", "🩹 تمت الموافقة على إجراء بسيط.");
      renderParentSummary();
    },

    "parent.decline": () => {
      const id = getSelectedCaseId() || (getCases()[0]?.id || "");
      const c = findCase(id);
      if (!c) return UI.toast("#pResult", "⚠️ لا توجد حالة.");

      upsertCase({ ...c, consent: false, status: "Declined" });
      Store.audit("parent.decline", { caseId: id });
      UI.toast("#pResult", "⛔ تم الرفض.");
      renderParentSummary();
    },

    "parent.joinVisit": () => {
      // Demo: open visit.html if exists
      Store.audit("parent.joinVisit", { caseId: getSelectedCaseId() || "" });
      UI.toast("#pResult", "🎥 (Demo) فتح جلسة الزيارة الافتراضية…");
      setTimeout(() => {
        // if you have visit.html
        const exists = true;
        if (exists) location.href = "visit.html";
      }, 250);
    },

    "parent.messageDoctor": () => {
      Store.audit("parent.messageDoctor", { caseId: getSelectedCaseId() || "" });
      UI.toast("#pResult", "💬 (Demo) تم إرسال رسالة للطبيب.");
    },

    "parent.downloadReport": () => {
      const id = getSelectedCaseId() || (getCases()[0]?.id || "");
      const c = findCase(id);
      if (!c) return UI.toast("#pResult", "⚠️ لا توجد حالة.");

      const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `parent-report-${id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      Store.audit("parent.downloadReport", { caseId: id });
      UI.toast("#pResult", "📄 تم تحميل التقرير.");
    }
  };

  /* ---------- Public API ---------- */
  const Actions = {
    init(role) {
      // Delegate clicks
      document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;

        const action = el.dataset.action;
        const fn = Handlers[action];
        if (!fn) return; // action not wired yet

        e.preventDefault();
        try {
          fn(el);
        } catch (err) {
          console.error("Action error:", action, err);
        }
      });

      // Boot per role
      if (role === "doctor") {
        renderDoctorQueue();
        const id = getSelectedCaseId();
        if (id) renderDoctorSelected(id);
      }

      if (role === "admin") {
        renderAdminKPIs();
        renderAdminHeatmap();
        renderAdminCases();
        const id = getSelectedCaseId();
        if (id) renderAdminSelected(id);
      }

      if (role === "parent") {
        renderParentSummary();
      }
    }
  };

  window.Actions = Actions;
})();

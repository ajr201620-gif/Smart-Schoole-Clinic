/* ===========================================================
   actions.js — Smart School Clinic OS (PRO)
   - Role-based actions (student/parent/admin/doctor/visit)
   - Button wiring via data-action
   - Local DB (localStorage) + event bus
   - Toast notifications
   - Ready hooks for Firebase (optional later)
   =========================================================== */

(function () {
  "use strict";

  /* ------------------ Helpers ------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const nowISO = () => new Date().toISOString();
  const uid = (p = "id") =>
    `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  const safeText = (el, txt) => { if (el) el.textContent = String(txt ?? ""); };

  /* ------------------ Toast ------------------ */
  function ensureToast() {
    let toast = $(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.innerHTML = `
        <div class="tTitle">تنبيه</div>
        <div class="tMsg">—</div>
      `;
      document.body.appendChild(toast);
    }
    return toast;
  }

  function toast(title, msg, ms = 2200) {
    const t = ensureToast();
    safeText($(".tTitle", t), title);
    safeText($(".tMsg", t), msg);
    t.classList.add("show");
    window.clearTimeout(toast._tm);
    toast._tm = window.setTimeout(() => t.classList.remove("show"), ms);
  }

  /* ------------------ Local DB ------------------ */
  const DB_KEY = "ssc_db_v1";
  const defaults = {
    users: {
      // demo accounts by role
      student: { id: "u_student", name: "طالب", role: "student" },
      parent:  { id: "u_parent",  name: "ولي أمر", role: "parent"  },
      admin:   { id: "u_admin",   name: "إدارة", role: "admin"   },
      doctor:  { id: "u_doctor",  name: "طبيب", role: "doctor"  },
    },
    session: {
      currentUserId: "u_student",
      theme: "dark",
    },
    cases: [],
    visits: [],
    audits: [],
    notifications: [],
  };

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return structuredClone(defaults);
      const data = JSON.parse(raw);
      return { ...structuredClone(defaults), ...data };
    } catch (e) {
      console.warn("DB load failed:", e);
      return structuredClone(defaults);
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  const db = loadDB();

  function audit(action, meta = {}) {
    db.audits.unshift({
      id: uid("audit"),
      at: nowISO(),
      action,
      meta,
      userId: db.session.currentUserId,
    });
    saveDB(db);
    window.bus?.emit?.("audit:update", db.audits[0]);
  }

  function addNotification(toRole, title, message, extra = {}) {
    db.notifications.unshift({
      id: uid("ntf"),
      at: nowISO(),
      toRole,
      title,
      message,
      seen: false,
      ...extra,
    });
    saveDB(db);
    window.bus?.emit?.("notify:update", db.notifications[0]);
  }

  /* ------------------ Role & Permissions ------------------ */
  const ROLE_PERMS = {
    student: new Set([
      "student:new-case",
      "student:start-visit",
      "student:save-symptoms",
      "student:run-sensors",
      "student:submit-ai",
      "common:theme-toggle",
      "common:logout",
      "common:download-report",
    ]),
    parent: new Set([
      "parent:view-summary",
      "parent:approve-consent",
      "parent:request-visit",
      "common:theme-toggle",
      "common:logout",
      "common:download-report",
    ]),
    admin: new Set([
      "admin:view-requests",
      "admin:assign-doctor",
      "admin:mark-critical",
      "admin:export-audit",
      "admin:open-heatmap",
      "admin:open-slips",
      "common:theme-toggle",
      "common:logout",
    ]),
    doctor: new Set([
      "doctor:view-queue",
      "doctor:open-case",
      "doctor:update-decision",
      "doctor:request-followup",
      "doctor:close-case",
      "common:theme-toggle",
      "common:logout",
      "common:download-report",
    ]),
    visit: new Set([
      "visit:checkin",
      "visit:complete",
      "visit:print-slip",
      "common:theme-toggle",
      "common:logout",
      "common:download-report",
    ]),
  };

  function getRoleFromPage() {
    // priority: <body data-page="...">
    const p = document.body?.getAttribute("data-page");
    if (p) return p;

    // fallback from filename
    const path = (location.pathname || "").toLowerCase();
    if (path.includes("student")) return "student";
    if (path.includes("parent")) return "parent";
    if (path.includes("admin")) return "admin";
    if (path.includes("doctor")) return "doctor";
    if (path.includes("visit")) return "visit";
    return "student";
  }

  function currentUser() {
    const u = Object.values(db.users).find(x => x.id === db.session.currentUserId);
    if (u) return u;
    // fallback by role page
    const role = getRoleFromPage();
    return db.users[role] || db.users.student;
  }

  function can(actionId) {
    const role = currentUser().role || getRoleFromPage();
    return ROLE_PERMS[role]?.has(actionId) || false;
  }

  /* ------------------ Theme ------------------ */
  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    db.session.theme = t;
    saveDB(db);
    audit("theme:set", { theme: t });
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || db.session.theme || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
    toast("المظهر", `تم تفعيل وضع ${document.documentElement.getAttribute("data-theme") === "dark" ? "الليل" : "النهار"}`);
  }

  /* ------------------ Data operations ------------------ */
  function createCase({ symptoms = "", vitals = {}, notes = "" } = {}) {
    const user = currentUser();
    const c = {
      id: uid("case"),
      at: nowISO(),
      status: "new",
      priority: "normal",
      risk: "low",
      decision: "pending",
      owner: { id: user.id, name: user.name, role: user.role },
      symptoms,
      vitals: {
        hr: vitals.hr ?? null,
        spo2: vitals.spo2 ?? null,
        temp: vitals.temp ?? null,
        bp: vitals.bp ?? null,
      },
      notes,
      timeline: [{ at: nowISO(), msg: "تم إنشاء الحالة" }],
    };
    db.cases.unshift(c);
    saveDB(db);
    window.bus?.emit?.("case:update", c);
    audit("case:create", { caseId: c.id });
    return c;
  }

  function updateCase(caseId, patch = {}) {
    const idx = db.cases.findIndex(c => c.id === caseId);
    if (idx === -1) return null;
    db.cases[idx] = { ...db.cases[idx], ...patch };
    db.cases[idx].timeline = db.cases[idx].timeline || [];
    db.cases[idx].timeline.unshift({ at: nowISO(), msg: "تحديث" });
    saveDB(db);
    window.bus?.emit?.("case:update", db.cases[idx]);
    audit("case:update", { caseId });
    return db.cases[idx];
  }

  function getLatestCaseForUser() {
    const u = currentUser();
    return db.cases.find(c => c.owner?.id === u.id) || null;
  }

  function createVisit({ caseId } = {}) {
    const v = {
      id: uid("visit"),
      at: nowISO(),
      caseId: caseId || null,
      status: "scheduled",
      checkinAt: null,
      completeAt: null,
    };
    db.visits.unshift(v);
    saveDB(db);
    window.bus?.emit?.("visit:update", v);
    audit("visit:create", { visitId: v.id, caseId: v.caseId });
    return v;
  }

  /* ------------------ UI wiring ------------------ */
  function hydrateUserUI() {
    const u = currentUser();
    // if you have elements like: <span data-user-name></span>
    $$("[data-user-name]").forEach(el => safeText(el, u.name));
    $$("[data-user-role]").forEach(el => safeText(el, u.role));
  }

  function enforcePermissions() {
    // Any clickable element with data-action must be allowed
    $$("[data-action]").forEach(el => {
      const id = el.getAttribute("data-action");
      const ok = can(id);
      if (!ok) {
        el.setAttribute("disabled", "disabled");
        el.classList.add("is-disabled");
        el.title = "غير متاح لهذا الدور";
      } else {
        el.removeAttribute("disabled");
        el.classList.remove("is-disabled");
        el.title = "";
      }
    });
  }

  function onActionClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-action");
    if (!can(id)) {
      toast("صلاحيات", "هذا الزر غير متاح لهذا الدور.");
      return;
    }
    runAction(id, btn);
  }

  /* ------------------ Report helpers ------------------ */
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function buildReport(caseObj) {
    const c = caseObj || getLatestCaseForUser() || db.cases[0];
    if (!c) return "لا يوجد حالات.";
    return [
      "Smart School Clinic OS — تقرير حالة",
      "----------------------------------",
      `Case ID: ${c.id}`,
      `Time: ${c.at}`,
      `Owner: ${c.owner?.name} (${c.owner?.role})`,
      `Status: ${c.status}`,
      `Priority: ${c.priority}`,
      `Risk: ${c.risk}`,
      `Decision: ${c.decision}`,
      "",
      "Symptoms:",
      c.symptoms || "—",
      "",
      "Vitals:",
      `HR: ${c.vitals?.hr ?? "—"}`,
      `SpO2: ${c.vitals?.spo2 ?? "—"}`,
      `Temp: ${c.vitals?.temp ?? "—"}`,
      `BP: ${c.vitals?.bp ?? "—"}`,
      "",
      "Notes:",
      c.notes || "—",
      "",
      "Timeline:",
      ...(c.timeline || []).map(t => `- ${t.at} | ${t.msg}`),
      "",
    ].join("\n");
  }

  /* ------------------ Actions ------------------ */
  function runAction(id, el) {
    const role = currentUser().role || getRoleFromPage();

    // Helpful: find case context
    const caseId =
      el?.getAttribute("data-case-id") ||
      document.body?.getAttribute("data-case-id") ||
      getLatestCaseForUser()?.id ||
      db.cases[0]?.id ||
      null;

    switch (id) {
      /* Common */
      case "common:theme-toggle":
        toggleTheme();
        break;

      case "common:logout":
        toast("خروج", "تم تسجيل الخروج (وضع تجريبي).");
        audit("auth:logout", { role });
        // demo: go home
        setTimeout(() => (location.href = "index.html"), 400);
        break;

      case "common:download-report": {
        const c = caseId ? db.cases.find(x => x.id === caseId) : null;
        downloadText("ssc-report.txt", buildReport(c));
        toast("تقرير", "تم تنزيل التقرير TXT.");
        audit("report:download", { caseId });
        break;
      }

      /* Student */
      case "student:new-case": {
        const symptoms =
          $("#symptoms")?.value ||
          $("#complaint")?.value ||
          $("#txtSymptoms")?.value ||
          "";
        const c = createCase({ symptoms });
        toast("تم", "تم إنشاء حالة جديدة.");
        addNotification("admin", "طلب جديد", "تم إنشاء حالة جديدة وتتطلب مراجعة.", { caseId: c.id });
        break;
      }

      case "student:save-symptoms": {
        const c = caseId ? db.cases.find(x => x.id === caseId) : null;
        if (!c) { toast("تنبيه", "لا توجد حالة لتحديثها."); break; }
        const symptoms =
          $("#symptoms")?.value ||
          $("#complaint")?.value ||
          $("#txtSymptoms")?.value ||
          c.symptoms ||
          "";
        updateCase(c.id, { symptoms });
        toast("تم", "تم حفظ الشكوى/الأعراض.");
        break;
      }

      case "student:run-sensors": {
        const c = caseId ? db.cases.find(x => x.id === caseId) : null;
        if (!c) { toast("تنبيه", "ابدأ بإنشاء حالة أولاً."); break; }

        // demo vitals
        const vitals = {
          hr: 72 + Math.floor(Math.random() * 18),
          spo2: 96 + Math.floor(Math.random() * 3),
          temp: (36.6 + Math.random() * 0.8).toFixed(1),
          bp: `${110 + Math.floor(Math.random()*18)}/${70 + Math.floor(Math.random()*10)}`
        };

        updateCase(c.id, { vitals });
        toast("الحساسات", "تمت محاكاة القياسات وتحديث الحالة.");
        addNotification("doctor", "قياسات جديدة", "وصلت قياسات جديدة لحالة طالب.", { caseId: c.id });
        break;
      }

      case "student:submit-ai": {
        const c = caseId ? db.cases.find(x => x.id === caseId) : null;
        if (!c) { toast("تنبيه", "ابدأ بإنشاء حالة أولاً."); break; }

        // simple triage heuristic (demo)
        const t = Number(c.vitals?.temp ?? 0);
        const hr = Number(c.vitals?.hr ?? 0);
        let risk = "low";
        let priority = "normal";

        if (t >= 38.5 || hr >= 110) { risk = "med"; priority = "high"; }
        if (t >= 39.2 || hr >= 125) { risk = "high"; priority = "critical"; }

        const decision =
          risk === "high" ? "تحويل للطبيب فوراً" :
          risk === "med"  ? "مراجعة تمريض/طبيب خلال اليوم" :
                            "إرشادات منزلية + متابعة";

        updateCase(c.id, { risk, priority, decision, status: "triaged" });
        toast("AI", `الفرز الذكي: ${decision}`);
        addNotification("admin", "فرز ذكي", `تم فرز الحالة (${priority}).`, { caseId: c.id });
        break;
      }

      case "student:start-visit": {
        const c = caseId ? db.cases.find(x => x.id === caseId) : null;
        if (!c) { toast("تنبيه", "ابدأ بإنشاء حالة أولاً."); break; }
        const v = createVisit({ caseId: c.id });
        updateCase(c.id, { status: "visit_scheduled" });
        toast("زيارة", "تم إنشاء زيارة افتراضية/حضورية (تجريبي).");
        addNotification("parent", "موافقة ولي الأمر", "تم إنشاء زيارة وتحتاج موافقتك.", { caseId: c.id, visitId: v.id });
        break;
      }

      /* Parent */
      case "parent:view-summary":
        toast("ولي الأمر", "ملخص الحالة ظاهر (إذا عندك صفحة summary).");
        audit("parent:view-summary");
        break;

      case "parent:approve-consent": {
        // approve latest case pending
        const c = db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالات."); break; }
        updateCase(c.id, { status: "consent_approved" });
        toast("تم", "تمت الموافقة على الموافقة/الإقرار.");
        addNotification("admin", "موافقة ولي الأمر", "تمت الموافقة على الزيارة.", { caseId: c.id });
        break;
      }

      case "parent:request-visit": {
        const c = db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالات."); break; }
        const v = createVisit({ caseId: c.id });
        toast("طلب", "تم إرسال طلب زيارة.");
        addNotification("admin", "طلب زيارة", "ولي الأمر طلب زيارة.", { caseId: c.id, visitId: v.id });
        break;
      }

      /* Admin */
      case "admin:view-requests":
        toast("الإدارة", "عرض الطلبات (تجريبي).");
        audit("admin:view-requests");
        break;

      case "admin:assign-doctor": {
        const c = db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالات."); break; }
        updateCase(c.id, { status: "assigned_to_doctor" });
        toast("تم", "تمت إحالة الحالة للطبيب.");
        addNotification("doctor", "حالة جديدة", "تمت إحالة حالة لك.", { caseId: c.id });
        break;
      }

      case "admin:mark-critical": {
        const c = db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالات."); break; }
        updateCase(c.id, { priority: "critical", risk: "high", status: "critical" });
        toast("تنبيه", "تم تمييز الحالة كحرجة.");
        addNotification("doctor", "حالة حرجة", "حالة حرجة تحتاج تدخل سريع.", { caseId: c.id });
        break;
      }

      case "admin:export-audit": {
        const text = [
          "SSC OS — Audit Log",
          "-------------------",
          ...db.audits.map(a => `${a.at} | ${a.action} | ${JSON.stringify(a.meta || {})}`)
        ].join("\n");
        downloadText("ssc-audit.txt", text);
        toast("تصدير", "تم تنزيل سجل الإجراءات.");
        break;
      }

      case "admin:open-heatmap":
        toast("Heatmap", "لوحة Heatmap (تجريبي).");
        audit("admin:open-heatmap");
        break;

      case "admin:open-slips":
        toast("Slips", "فتح نماذج/تصاريح (تجريبي).");
        audit("admin:open-slips");
        break;

      /* Doctor */
      case "doctor:view-queue":
        toast("الطبيب", "عرض قائمة الحالات (تجريبي).");
        audit("doctor:view-queue");
        break;

      case "doctor:open-case":
        toast("الطبيب", "فتح الحالة (تجريبي).");
        audit("doctor:open-case", { caseId });
        break;

      case "doctor:update-decision": {
        const c = db.cases.find(x => x.id === caseId) || db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالة."); break; }
        const decision =
          $("#decision")?.value ||
          $("#txtDecision")?.value ||
          "تمت مراجعة الحالة — متابعة";
        updateCase(c.id, { decision, status: "doctor_review" });
        toast("قرار", "تم تحديث قرار الطبيب.");
        addNotification("parent", "تحديث طبي", "تم تحديث قرار الطبيب للحالة.", { caseId: c.id });
        break;
      }

      case "doctor:request-followup": {
        const c = db.cases.find(x => x.id === caseId) || db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالة."); break; }
        updateCase(c.id, { status: "followup_required" });
        toast("متابعة", "تم طلب متابعة للحالة.");
        addNotification("student", "متابعة مطلوبة", "فضلاً أكمل استبيان متابعة/مراجعة.", { caseId: c.id });
        break;
      }

      case "doctor:close-case": {
        const c = db.cases.find(x => x.id === caseId) || db.cases[0];
        if (!c) { toast("تنبيه", "لا توجد حالة."); break; }
        updateCase(c.id, { status: "closed" });
        toast("تم", "تم إغلاق الحالة.");
        addNotification("parent", "إغلاق الحالة", "تم إغلاق الحالة بعد المراجعة.", { caseId: c.id });
        break;
      }

      /* Visit */
      case "visit:checkin": {
        const v = db.visits[0];
        if (!v) { toast("تنبيه", "لا توجد زيارة."); break; }
        v.checkinAt = nowISO();
        v.status = "checked_in";
        saveDB(db);
        toast("تسجيل", "تم تسجيل الدخول للزيارة.");
        audit("visit:checkin", { visitId: v.id });
        break;
      }

      case "visit:complete": {
        const v = db.visits[0];
        if (!v) { toast("تنبيه", "لا توجد زيارة."); break; }
        v.completeAt = nowISO();
        v.status = "completed";
        saveDB(db);
        toast("اكتمال", "تم إنهاء الزيارة.");
        audit("visit:complete", { visitId: v.id });
        break;
      }

      case "visit:print-slip":
        toast("طباعة", "تم تجهيز نموذج (تجريبي).");
        audit("visit:print-slip");
        break;

      default:
        toast("تنبيه", `Action غير معروف: ${id}`);
        audit("action:unknown", { id });
        break;
    }
  }

  /* ------------------ Auto wire buttons ------------------ */
  function autoBindKnownButtons() {
    // If you already have buttons without data-action, map by id/class text (best-effort).
    const map = [
      ["#btnTheme", "common:theme-toggle"],
      ["#btnLogout", "common:logout"],
      ["#btnReport", "common:download-report"],

      ["#btnNewCase", "student:new-case"],
      ["#btnSaveSymptoms", "student:save-symptoms"],
      ["#btnRunSensors", "student:run-sensors"],
      ["#btnSubmitAI", "student:submit-ai"],
      ["#btnStartVisit", "student:start-visit"],

      ["#btnApproveConsent", "parent:approve-consent"],
      ["#btnRequestVisit", "parent:request-visit"],
      ["#btnParentSummary", "parent:view-summary"],

      ["#btnAdminRequests", "admin:view-requests"],
      ["#btnAssignDoctor", "admin:assign-doctor"],
      ["#btnMarkCritical", "admin:mark-critical"],
      ["#btnExportAudit", "admin:export-audit"],
      ["#btnHeatmap", "admin:open-heatmap"],
      ["#btnSlips", "admin:open-slips"],

      ["#btnDoctorQueue", "doctor:view-queue"],
      ["#btnOpenCase", "doctor:open-case"],
      ["#btnUpdateDecision", "doctor:update-decision"],
      ["#btnFollowup", "doctor:request-followup"],
      ["#btnCloseCase", "doctor:close-case"],

      ["#btnCheckin", "visit:checkin"],
      ["#btnCompleteVisit", "visit:complete"],
      ["#btnPrintSlip", "visit:print-slip"],
    ];

    map.forEach(([sel, action]) => {
      const el = $(sel);
      if (el && !el.getAttribute("data-action")) el.setAttribute("data-action", action);
    });
  }

  /* ------------------ Boot ------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    // apply saved theme (and prevent white flash)
    applyTheme(db.session.theme || "dark");

    // sync ui
    hydrateUserUI();

    // bind actions
    autoBindKnownButtons();
    enforcePermissions();

    document.addEventListener("click", onActionClick);

    // Helpful starter data
    if (!db.cases.length) {
      createCase({ symptoms: "صداع خفيف / إرهاق", vitals: { hr: 84, spo2: 98, temp: 36.8, bp: "118/76" } });
      updateCase(db.cases[0].id, { status: "triaged", decision: "إرشادات منزلية + متابعة", risk: "low", priority: "normal" });
    }

    toast("جاهز", "تم تفعيل الأزرار والصلاحيات (تجريبي).");
  });

  /* Expose for debugging */
  window.SSC = window.SSC || {};
  window.SSC.db = db;
  window.SSC.toast = toast;
  window.SSC.createCase = createCase;
  window.SSC.updateCase = updateCase;
  window.SSC.addNotification = addNotification;
})();

/* actions.js — Wire up buttons across all portals (Static) */

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const nowISO = () => new Date().toISOString();

  // Defensive: app is created in app-init.js
  const app = () => window.app || null;

  // ---------- UI Helpers ----------
  const toast = (type, msg, ttl) => window.bus?.toast?.({ type, msg, ttl });

  function bindClicks(selectors, fn) {
    selectors.forEach(sel => {
      $$(sel).forEach(el => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          fn(el, e);
        }, { passive: false });
      });
    });
  }

  function setText(sel, value) {
    const el = $(sel);
    if (el) el.textContent = value;
  }

  function setValue(sel, value) {
    const el = $(sel);
    if (el) el.value = value;
  }

  function getValue(sel) {
    const el = $(sel);
    return el ? (el.value || "").trim() : "";
  }

  function setBadge(sel, value) {
    const el = $(sel);
    if (!el) return;
    el.textContent = value;
  }

  function safeRoute(url) {
    try { window.location.href = url; } catch {}
  }

  // ---------- Common IDs & Data Hooks ----------
  // You can put these IDs in HTML (recommended), but we also support data-action on buttons.
  const ACTION_SELECTORS = [
    "[data-action]",
    "#btnGenerateSensors",
    "#btnSimulateSensors",
    "#btnAiTriage",
    "#btnCreateCase",
    "#btnRequestVisit",
    "#btnOpenVisit",
    "#btnJoinParent",
    "#btnApproveVisit",
    "#btnRejectVisit",
    "#btnRequestSecondReading",
    "#btnDoctorAiSuggest",
    "#btnSaveDiagnosis",
    "#btnMakeDecision",
    "#btnCreateSlip",
    "#btnApproveConsent",
    "#btnDeclineConsent",
    "#btnMarkFollowup",
    "#btnResolveCase",
    "#btnExportReport",
    "#btnResetDemo"
  ];

  // ---------- Data getters ----------
  function getLatestCaseId() {
    const A = app();
    if (!A) return null;
    const cases = A.getCases?.() || [];
    if (!cases.length) return null;
    return cases[cases.length - 1].id;
  }

  function readComplaintFromUI() {
    // student complaint box (support multiple IDs)
    return (
      getValue("#complaint") ||
      getValue("#txtComplaint") ||
      getValue("[name='complaint']") ||
      getValue("#studentComplaint") ||
      ""
    );
  }

  function renderStudentViewFromState() {
    const A = app();
    if (!A) return;

    const latest = A.getLatestCase?.();
    const sens = A.getLatestSensors?.();

    // Sensors KPIs (support multiple ID styles)
    if (sens) {
      setBadge("#kpiHR", sens.hr ?? "—");
      setBadge("#kpiTemp", sens.temp ?? "—");
      setBadge("#kpiSpO2", sens.spo2 ?? "—");
      setBadge("#kpiBP", sens.bp ?? "—");

      setBadge("[data-kpi='hr']", sens.hr ?? "—");
      setBadge("[data-kpi='temp']", sens.temp ?? "—");
      setBadge("[data-kpi='spo2']", sens.spo2 ?? "—");
      setBadge("[data-kpi='bp']", sens.bp ?? "—");
    }

    // AI triage results
    if (latest?.triage) {
      setBadge("#kpiRisk", latest.triage.risk ?? "—");
      setBadge("#kpiPriority", latest.triage.priority ?? "—");
      setBadge("#kpiStatus", latest.triage.status ?? "—");
      setBadge("#kpiDecision", latest.triage.decision ?? "—");
      setText("#aiRecommendation", latest.triage.recommendation ?? "");

      setBadge("[data-kpi='risk']", latest.triage.risk ?? "—");
      setBadge("[data-kpi='priority']", latest.triage.priority ?? "—");
      setBadge("[data-kpi='status']", latest.triage.status ?? "—");
      setBadge("[data-kpi='decision']", latest.triage.decision ?? "—");
      const rec = $("[data-kpi='recommendation']");
      if (rec) rec.textContent = latest.triage.recommendation ?? "";
    }
  }

  function renderDoctorViewFromState() {
    const A = app();
    if (!A) return;

    const active = A.getDoctorActiveCase?.();
    if (!active) return;

    // Complaint
    setText("#doctorComplaint", active.complaint || "—");
    const c = $("[data-field='complaint']");
    if (c) c.textContent = active.complaint || "—";

    // Sensors
    const s = active.sensors || A.getLatestSensors?.();
    if (s) {
      setBadge("#docHR", s.hr ?? "—");
      setBadge("#docTemp", s.temp ?? "—");
      setBadge("#docSpO2", s.spo2 ?? "—");
      setBadge("#docBP", s.bp ?? "—");

      $("[data-field='hr']") && ($("[data-field='hr']").textContent = s.hr ?? "—");
      $("[data-field='temp']") && ($("[data-field='temp']").textContent = s.temp ?? "—");
      $("[data-field='spo2']") && ($("[data-field='spo2']").textContent = s.spo2 ?? "—");
      $("[data-field='bp']") && ($("[data-field='bp']").textContent = s.bp ?? "—");
    }

    // AI
    if (active.triage) {
      setBadge("#docRisk", active.triage.risk ?? "—");
      setBadge("#docPriority", active.triage.priority ?? "—");
      setText("#docAiRec", active.triage.recommendation ?? "—");
      setText("#docAiPlan", active.triage.plan ?? "");
    }

    // Visit
    setBadge("#docVisitState", active.visit?.status ?? "—");
  }

  function renderAdminViewFromState() {
    const A = app();
    if (!A) return;
    const stats = A.getAdminStats?.();
    if (stats && window.bus?.applyStats) window.bus.applyStats(stats);

    // Optional admin sections
    const heat = $("#adminHeatmap");
    if (heat && A.getHeatmap?.) {
      const hm = A.getHeatmap();
      heat.innerHTML = hm.html || heat.innerHTML;
    }
  }

  function renderParentViewFromState() {
    const A = app();
    if (!A) return;
    const summary = A.getParentSummary?.();
    if (!summary) return;

    setText("#parentChildName", summary.childName ?? "—");
    setText("#parentLastCase", summary.lastCaseTitle ?? "—");
    setText("#parentStatus", summary.status ?? "—");
    setText("#parentActions", summary.nextSteps ?? "—");

    // list
    const list = $("#parentCasesList");
    if (list && Array.isArray(summary.cases)) {
      list.innerHTML = summary.cases.map(x => `
        <div class="rowCard">
          <div class="rowTitle">${escapeHtml(x.title || "حالة")}</div>
          <div class="rowMeta">${escapeHtml(x.time || "")} • ${escapeHtml(x.status || "")}</div>
        </div>
      `).join("");
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // ---------- Actions ----------
  const handlers = {
    // STUDENT
    "student:generateSensors": () => {
      const A = app(); if (!A) return;
      const sensors = A.simulateSensors?.();
      toast("ok", "تم توليد قراءات محاكاة للحساسات");
      A.audit?.("student.generateSensors", { sensors });
      renderStudentViewFromState();
    },

    "student:aiTriage": () => {
      const A = app(); if (!A) return;
      const complaint = readComplaintFromUI();
      if (!complaint) {
        toast("warn", "اكتب الشكوى أولاً ثم شغّل الفرز الذكي");
        return;
      }
      const result = A.runTriage?.({ complaint });
      toast("ok", `تم الفرز الذكي: ${result?.priority || "—"} / ${result?.risk || "—"}`);
      A.audit?.("student.aiTriage", { complaint, result });
      renderStudentViewFromState();
    },

    "student:createCase": () => {
      const A = app(); if (!A) return;
      const complaint = readComplaintFromUI();
      if (!complaint) {
        toast("warn", "ما نقدر نسجل حالة بدون شكوى 😉");
        return;
      }
      const caseObj = A.createCase?.({ complaint });
      toast("ok", `تم إنشاء حالة رقم ${caseObj?.id || ""}`.trim());
      A.audit?.("student.createCase", { caseId: caseObj?.id });
      renderStudentViewFromState();
    },

    "student:requestVisit": () => {
      const A = app(); if (!A) return;
      const id = getLatestCaseId();
      if (!id) { toast("warn", "ما فيه حالة جاهزة. أنشئ حالة أولاً."); return; }
      const v = A.requestVisit?.({ caseId: id });
      toast("ok", "تم إرسال طلب زيارة افتراضية للطبيب");
      A.audit?.("student.requestVisit", { caseId: id, visit: v });
      // open visit page if exists
      if (location.pathname.endsWith("/student.html") && $("a[href*='visit.html']")) {
        // no-op
      }
      renderStudentViewFromState();
    },

    "student:openVisit": () => {
      // Visit page
      if (location.pathname.endsWith("/visit.html")) return;
      safeRoute("visit.html");
    },

    // DOCTOR
    "doctor:requestSecondReading": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "ما فيه حالة نشطة للطبيب"); return; }
      const sensors2 = A.simulateSensors?.({ mode: "confirm" });
      A.attachSecondReading?.({ caseId: active.id, sensors: sensors2 });
      toast("ok", "تم طلب قراءة ثانية وتسجيلها");
      A.audit?.("doctor.secondReading", { caseId: active.id, sensors2 });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    "doctor:aiSuggest": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "افتح حالة أولاً"); return; }
      const suggestion = A.doctorCopilot?.({ caseId: active.id });
      toast("ok", "تم توليد مساعد الطبيب (AI)");
      A.audit?.("doctor.aiSuggest", { caseId: active.id, suggestion });
      // Try show in textarea
      if ($("#doctorCopilotBox")) $("#doctorCopilotBox").value = suggestion?.note || suggestion?.summary || "";
      if ($("#doctorCopilotOut")) $("#doctorCopilotOut").textContent = suggestion?.note || suggestion?.summary || "";
    },

    "doctor:saveDiagnosis": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "افتح حالة أولاً"); return; }

      const dx = getValue("#doctorDiagnosis") || getValue("#dx") || getValue("[name='diagnosis']");
      const plan = getValue("#doctorPlan") || getValue("#plan") || getValue("[name='plan']");
      if (!dx) { toast("warn", "اكتب التشخيص أولاً"); return; }

      A.saveDiagnosis?.({ caseId: active.id, diagnosis: dx, plan });
      toast("ok", "تم حفظ التشخيص والخطة");
      A.audit?.("doctor.saveDiagnosis", { caseId: active.id, diagnosis: dx });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    "doctor:approveVisit": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      A.setVisitStatus?.({ caseId: active.id, status: "approved" });
      toast("ok", "تم قبول الزيارة الافتراضية");
      A.audit?.("doctor.approveVisit", { caseId: active.id });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    "doctor:rejectVisit": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      A.setVisitStatus?.({ caseId: active.id, status: "rejected" });
      toast("warn", "تم رفض/إلغاء الزيارة الافتراضية");
      A.audit?.("doctor.rejectVisit", { caseId: active.id });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    "doctor:joinParent": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      A.requestParentJoin?.({ caseId: active.id });
      toast("ok", "تم إرسال طلب انضمام ولي الأمر للزيارة");
      A.audit?.("doctor.joinParent", { caseId: active.id });
      renderAdminViewFromState();
    },

    "doctor:makeDecision": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }

      // decision buttons may pass data-decision
      // fallback: read select
      const d =
        getValue("#decision") ||
        getValue("#doctorDecision") ||
        (document.querySelector("[name='decision']")?.value || "").trim() ||
        "";

      const decision = d || "متابعة بالعيادة";
      A.setDecision?.({ caseId: active.id, decision });
      toast("ok", `تم اعتماد القرار: ${decision}`);
      A.audit?.("doctor.decision", { caseId: active.id, decision });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    "doctor:createSlip": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }

      const type = getValue("#slipType") || "راحة";
      const days = Number(getValue("#slipDays") || 1);
      const slip = A.createSlip?.({ caseId: active.id, type, days });
      toast("ok", "تم إصدار مستند/إجراء (Slip)");
      A.audit?.("doctor.slip", { caseId: active.id, slip });
      renderAdminViewFromState();
    },

    "doctor:markFollowup": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      A.markFollowup?.({ caseId: active.id });
      toast("ok", "تم وسم الحالة: تحتاج متابعة");
      A.audit?.("doctor.followup", { caseId: active.id });
      renderAdminViewFromState();
    },

    "doctor:resolveCase": () => {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      A.resolveCase?.({ caseId: active.id });
      toast("ok", "تم إغلاق الحالة");
      A.audit?.("doctor.resolve", { caseId: active.id });
      renderDoctorViewFromState();
      renderAdminViewFromState();
    },

    // ADMIN
    "admin:exportReport": () => {
      const A = app(); if (!A) return;
      const data = A.exportAll?.();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart-clinic-export-${Date.now()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast("ok", "تم تصدير التقرير (JSON)");
      A.audit?.("admin.export", { bytes: blob.size });
    },

    "admin:resetDemo": () => {
      const A = app(); if (!A) return;
      if (!confirm("متأكد؟ سيُحذف كل بيانات العرض التجريبي.")) return;
      A.resetDemo?.();
      toast("ok", "تمت إعادة ضبط بيانات العرض");
      A.audit?.("admin.resetDemo", { at: nowISO() });
      // refresh view
      renderStudentViewFromState();
      renderDoctorViewFromState();
      renderAdminViewFromState();
      renderParentViewFromState();
    },

    // CONSENT (Visit session / parent)
    "consent:approve": () => {
      const A = app(); if (!A) return;
      const id = A.getActiveVisitCaseId?.() || getLatestCaseId();
      if (!id) { toast("warn", "لا توجد حالة لطلب الموافقة"); return; }
      A.setConsent?.({ caseId: id, consent: "approved" });
      toast("ok", "تمت الموافقة");
      A.audit?.("consent.approved", { caseId: id });
    },

    "consent:decline": () => {
      const A = app(); if (!A) return;
      const id = A.getActiveVisitCaseId?.() || getLatestCaseId();
      if (!id) { toast("warn", "لا توجد حالة لطلب الموافقة"); return; }
      A.setConsent?.({ caseId: id, consent: "declined" });
      toast("warn", "تم الرفض");
      A.audit?.("consent.declined", { caseId: id });
    }
  };

  // ---------- Dispatcher ----------
  function dispatch(action, el) {
    // Normalize
    const a = String(action || "").trim();
    if (!a) return;

    // Special case: decision quick buttons
    if (a === "doctor:makeDecision" && el?.dataset?.decision) {
      const A = app(); if (!A) return;
      const active = A.getDoctorActiveCase?.();
      if (!active) { toast("warn", "لا توجد حالة"); return; }
      const decision = el.dataset.decision;
      A.setDecision?.({ caseId: active.id, decision });
      toast("ok", `تم اعتماد القرار: ${decision}`);
      A.audit?.("doctor.decision", { caseId: active.id, decision });
      renderDoctorViewFromState();
      renderAdminViewFromState();
      return;
    }

    const fn = handlers[a];
    if (!fn) {
      toast("warn", `زر غير مفعّل بعد: ${a}`);
      console.warn("[actions] Missing handler:", a);
      return;
    }
    fn(el);
  }

  // ---------- Auto-bind on load ----------
  function bindAll() {
    // data-action buttons
    bindClicks(["[data-action]"], (el) => dispatch(el.dataset.action, el));

    // Named IDs (optional) — if your HTML uses these IDs، بيشتغل فوراً
    const map = [
      ["#btnGenerateSensors, #btnSimulateSensors", "student:generateSensors"],
      ["#btnAiTriage", "student:aiTriage"],
      ["#btnCreateCase", "student:createCase"],
      ["#btnRequestVisit", "student:requestVisit"],
      ["#btnOpenVisit", "student:openVisit"],

      ["#btnRequestSecondReading", "doctor:requestSecondReading"],
      ["#btnDoctorAiSuggest, #btnDoctorAi", "doctor:aiSuggest"],
      ["#btnSaveDiagnosis", "doctor:saveDiagnosis"],
      ["#btnApproveVisit", "doctor:approveVisit"],
      ["#btnRejectVisit", "doctor:rejectVisit"],
      ["#btnJoinParent", "doctor:joinParent"],
      ["#btnMakeDecision", "doctor:makeDecision"],
      ["#btnCreateSlip", "doctor:createSlip"],
      ["#btnMarkFollowup", "doctor:markFollowup"],
      ["#btnResolveCase", "doctor:resolveCase"],

      ["#btnExportReport", "admin:exportReport"],
      ["#btnResetDemo", "admin:resetDemo"],

      ["#btnApproveConsent, #btnConsentApprove", "consent:approve"],
      ["#btnDeclineConsent, #btnConsentDecline", "consent:decline"],
    ];

    map.forEach(([sel, act]) => {
      bindClicks([sel], (el) => dispatch(act, el));
    });

    // Render initial per page
    const p = (location.pathname.split("/").pop() || "").toLowerCase();
    if (p.includes("student")) renderStudentViewFromState();
    if (p.includes("doctor")) renderDoctorViewFromState();
    if (p.includes("admin")) renderAdminViewFromState();
    if (p.includes("parent")) renderParentViewFromState();
  }

  // Wait for DOM + app
  function ready(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  ready(() => {
    bindAll();

    // Live refresh if other scripts emit updates
    window.bus?.on?.("case:update", () => {
      renderStudentViewFromState();
      renderDoctorViewFromState();
      renderAdminViewFromState();
      renderParentViewFromState();
    });

    window.bus?.on?.("sensors:update", () => {
      renderStudentViewFromState();
      renderDoctorViewFromState();
    });

    window.bus?.on?.("visit:update", () => {
      renderDoctorViewFromState();
      renderAdminViewFromState();
      renderParentViewFromState();
    });
  });

})();

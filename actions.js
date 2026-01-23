(() => {
  "use strict";

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const getActiveCaseId = () => SSC.getDB().settings?.activeCaseId || null;
  const setActiveCaseId = (id) => SSC.updateDB(db => { db.settings.activeCaseId = id; return db; });

  const ensureToastHost = () => {
    if ($(".toastWrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "toastWrap";
    document.body.appendChild(wrap);

    SSC.on("toast", (t) => {
      const el = document.createElement("div");
      el.className = "toast";
      el.innerHTML = `<div class="t">${t.title}</div><div class="m">${t.message}</div>`;
      wrap.prepend(el);
      setTimeout(() => el.remove(), 4200);
    });
  };

  const renderBadges = () => {
    const role = SSC_AUTH.getRole();
    const elRole = $("#roleBadge");
    const elP = $("#permBadge");
    if (elRole) elRole.textContent = `Role: ${role}`;
    if (elP) elP.textContent = SSC.getDB().settings?.demoMode ? "Local Demo" : "Live";
  };

  // ---------- Case helpers ----------
  const createCaseFromStudentUI = () => {
    if (!SSC_AUTH.can("case.create")) return SSC.toast("صلاحيات", "غير مسموح");

    const complaint = ($("#complaint")?.value || "").trim();
    if (!complaint) {
      SSC.toast("الشكوى", "اكتب الشكوى أولاً");
      return;
    }

    const vitals = {
      hr: Number($("#v_hr")?.textContent || $("#hr")?.value || 0) || 0,
      spo2: Number($("#v_spo2")?.textContent || $("#spo2")?.value || 0) || 0,
      temp: Number($("#v_temp")?.textContent || $("#temp")?.value || 0) || 0,
      bpSys: Number($("#v_bpSys")?.textContent || $("#bpSys")?.value || 0) || 0,
      bpDia: Number($("#v_bpDia")?.textContent || $("#bpDia")?.value || 0) || 0,
    };

    const triage = SSC_TRIAGE.runTriage({ ...vitals, complaintText: complaint, complaint });

    const c = {
      id: SSC.uid("case"),
      createdAt: SSC.nowISO(),
      updatedAt: SSC.nowISO(),
      student: { name: SSC.getDB().user?.name || "طالب" },
      complaint,
      vitals,
      triage,
      status: "ready",
      history: [{ at: SSC.nowISO(), what: "case.created" }]
    };

    SSC.updateDB((db) => {
      db.cases.unshift(c);
      db.cases = db.cases.slice(0, 300);
      db.settings.activeCaseId = c.id;
      return db;
    });

    SSC.audit("case.create", { caseId: c.id });
    SSC.toast("تم إنشاء الحالة", `Risk ${triage.risk}/100 — ${triage.priorityLabel}`);
    SSC.emit("case.updated", c);

    renderStudentCase(c);
  };

  const renderStudentCase = (c) => {
    if (!c) return;

    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
    setText("#out_risk", c.triage?.risk ?? "—");
    setText("#out_priority", c.triage?.priorityLabel ?? "—");
    setText("#out_rec", c.triage?.recommendation ?? "—");
    setText("#out_decision", c.triage?.suggestedDecision ?? "—");

    const vit = c.vitals || {};
    setText("#v_hr", vit.hr ?? "—");
    setText("#v_spo2", vit.spo2 ?? "—");
    setText("#v_temp", vit.temp ?? "—");
    setText("#v_bp", (vit.bpSys && vit.bpDia) ? `${vit.bpSys}/${vit.bpDia}` : "—");
  };

  const simulateSensorsToStudentUI = (preset="mixed") => {
    if (!SSC_AUTH.can("case.simulateSensors")) return SSC.toast("صلاحيات", "غير مسموح");

    const vit = SSC_SENSORS.simulate(preset);

    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = String(txt); };
    setText("#v_hr", vit.hr);
    setText("#v_spo2", vit.spo2);
    setText("#v_temp", vit.temp);
    setText("#v_bp", `${vit.bpSys}/${vit.bpDia}`);

    SSC.audit("sensors.simulate", { preset });
    SSC.toast("محاكاة الحساسات", `HR ${vit.hr} • SpO₂ ${vit.spo2}% • Temp ${vit.temp}`);
  };

  const requestVisitFromStudent = () => {
    if (!SSC_AUTH.can("visit.request")) return SSC.toast("صلاحيات", "غير مسموح");
    const caseId = getActiveCaseId();
    if (!caseId) return SSC.toast("زيارة افتراضية", "أنشئ حالة أولاً");

    const c = SSC.getDB().cases.find(x => x.id === caseId);
    const v = SSC_VISIT.createVisit({ caseId, fromRole: "student", studentName: c?.student?.name || "طالب" });

    // Open visit page as student
    window.location.href = `visit.html?visit=${encodeURIComponent(v.id)}&as=student`;
  };

  // ---------- Doctor side ----------
  const getSelectedDoctorCase = () => {
    const id = $("#doctorCaseSelect")?.value || getActiveCaseId();
    if (!id) return null;
    return SSC.getDB().cases.find(x => x.id === id) || null;
  };

  const doctorRequestRecheck = () => {
    if (!SSC_AUTH.can("case.requestRecheck")) return SSC.toast("صلاحيات", "غير مسموح");
    const c = getSelectedDoctorCase();
    if (!c) return SSC.toast("قراءة ثانية", "اختر حالة");

    SSC.updateDB(db => {
      const x = db.cases.find(k => k.id === c.id);
      if (!x) return db;
      x.history.unshift({ at: SSC.nowISO(), what: "doctor.requestRecheck" });
      x.status = "recheck_requested";
      return db;
    });

    SSC.audit("case.requestRecheck", { caseId: c.id });
    SSC.toast("طلب قراءة ثانية", "تم إرسال طلب إعادة قياس للطالب (نسخة عرض)");
    SSC.emit("case.updated", SSC.getDB().cases.find(x=>x.id===c.id));
  };

  const doctorIssueSlip = (type) => {
    if (!SSC_AUTH.can("slip.issue")) return SSC.toast("صلاحيات", "غير مسموح");
    const c = getSelectedDoctorCase();
    if (!c) return SSC.toast("إجراء", "اختر حالة");

    const days = Number($("#slipDays")?.value || 1) || 1;
    const notes = ($("#slipNotes")?.value || "").trim();

    SSC_SLIPS.issueSlip({ caseId: c.id, type, days, notes });

    SSC.updateDB(db => {
      const x = db.cases.find(k => k.id === c.id);
      if (!x) return db;
      x.history.unshift({ at: SSC.nowISO(), what: `slip.${type}` });
      x.status = (type === "إحالة") ? "referred" : "rested";
      return db;
    });

    SSC.emit("case.updated", SSC.getDB().cases.find(x=>x.id===c.id));
  };

  const doctorAcceptLatestVisit = () => {
    if (!SSC_AUTH.can("visit.accept")) return SSC.toast("صلاحيات", "غير مسموح");
    const v = SSC.getDB().visits.find(x => x.status === "requested");
    if (!v) return SSC.toast("الزيارات", "لا يوجد طلبات جديدة");
    SSC_VISIT.accept(v.id);
    window.location.href = `visit.html?visit=${encodeURIComponent(v.id)}&as=doctor`;
  };

  const doctorRejectLatestVisit = () => {
    if (!SSC_AUTH.can("visit.reject")) return SSC.toast("صلاحيات", "غير مسموح");
    const v = SSC.getDB().visits.find(x => x.status === "requested");
    if (!v) return SSC.toast("الزيارات", "لا يوجد طلبات جديدة");
    const reason = prompt("سبب الرفض؟ (اختياري)") || "";
    SSC_VISIT.reject(v.id, reason);
  };

  const doctorInviteParent = () => {
    if (!SSC_AUTH.can("visit.inviteParent")) return SSC.toast("صلاحيات", "غير مسموح");
    const id = $("#visitId")?.value?.trim();
    if (!id) return SSC.toast("دعوة ولي الأمر", "اكتب Visit ID أولاً");
    SSC_VISIT.inviteParent(id);
  };

  const doctorAskCopilot = () => {
    if (!SSC_AUTH.can("copilot.ask")) return SSC.toast("صلاحيات", "غير مسموح");

    const c = getSelectedDoctorCase();
    if (!c) return SSC.toast("Copilot", "اختر حالة أولاً");

    const q = ($("#copilotQ")?.value || "").trim();
    const txt = SSC_COPILOT.answer({
      complaint: c.complaint,
      vitals: c.vitals,
      triage: c.triage,
      question: q
    });

    const out = $("#copilotOut");
    if (out) out.value = txt;

    SSC.audit("copilot.ask", { caseId: c.id });
    SSC.toast("Copilot", "تم توليد مساعدة للطبيب");
  };

  // ---------- Admin ----------
  const adminRefresh = () => {
    if (!SSC_AUTH.can("dash.view")) return;
    const s = SSC_ADMIN.stats();

    const set = (id,val) => { const el = $(id); if(el) el.textContent = val; };
    set("#adm_total", s.totalCases);
    set("#adm_critical", s.critical);
    set("#adm_urgent", s.urgent);
    set("#adm_routine", s.routine);
    set("#adm_slips", s.slips);
    set("#adm_follow", s.followUp);

    // render last 12 cases
    const tbody = $("#adm_cases");
    if (tbody) {
      const rows = (SSC.getDB().cases || []).slice(0,12).map(c => {
        const pri = c.triage?.priorityLabel || "—";
        const r = c.triage?.risk ?? "—";
        const st = c.status || "—";
        return `<tr>
          <td><span class="badge">${c.id.slice(-6)}</span></td>
          <td>${c.student?.name || "—"}</td>
          <td>${pri} • ${r}</td>
          <td>${st}</td>
          <td class="small">${new Date(c.createdAt).toLocaleString("ar-SA")}</td>
        </tr>`;
      }).join("");
      tbody.innerHTML = rows || `<tr><td colspan="5" class="small">لا توجد بيانات بعد</td></tr>`;
    }

    const audit = $("#adm_audit");
    if (audit) {
      audit.value = SSC_AUDIT.get(60).map(a => `${a.at} | ${a.role} | ${a.action} | ${JSON.stringify(a.details)}`).join("\n");
    }
  };

  // ---------- Parent ----------
  const parentRefresh = () => {
    if (!SSC_AUTH.can("report.viewChild")) return;

    const list = $("#parent_cases");
    if (list) {
      const cases = SSC_PARENT.myChildCases();
      list.innerHTML = cases.map(c => {
        const pri = c.triage?.priorityLabel || "—";
        const r = c.triage?.risk ?? "—";
        return `<div class="kpi">
          <div class="label">حالة ${c.id.slice(-6)}</div>
          <div class="value">${pri}</div>
          <div class="hint">Risk ${r}/100 • ${new Date(c.createdAt).toLocaleString("ar-SA")}</div>
        </div>`;
      }).join("") || `<div class="small">لا توجد حالات بعد</div>`;
    }

    const v = SSC.getDB().visits.find(x => x.participants?.parent?.invited && (x.status === "accepted" || x.status === "active"));
    const vBox = $("#parent_visit");
    if (vBox) {
      if (!v) vBox.innerHTML = `<div class="small">لا توجد دعوة زيارة حالياً</div>`;
      else vBox.innerHTML = `
        <div class="row">
          <span class="badge">Visit ${v.id.slice(-6)}</span>
          <span class="badge ${v.status === "accepted" ? "warn" : "good"}">${v.status}</span>
          <span class="badge">Room ${v.roomCode}</span>
        </div>
        <div class="row" style="margin-top:10px">
          <button class="btn good" data-action="parent_consent_yes" data-visit="${v.id}">✅ موافقة على الزيارة</button>
          <button class="btn bad" data-action="parent_consent_no" data-visit="${v.id}">⛔ رفض الزيارة</button>
          <a class="btn primary" href="visit.html?visit=${encodeURIComponent(v.id)}&as=parent">🎥 دخول الزيارة</a>
        </div>
      `;
    }
  };

  // ---------- Action router ----------
  const ACTIONS = {
    // Student
    student_sim_mixed: () => simulateSensorsToStudentUI("mixed"),
    student_sim_normal: () => simulateSensorsToStudentUI("normal"),
    student_sim_fever: () => simulateSensorsToStudentUI("fever"),
    student_sim_asthma: () => simulateSensorsToStudentUI("asthma"),
    student_create_case: () => createCaseFromStudentUI(),
    student_request_visit: () => requestVisitFromStudent(),

    // Doctor
    doctor_recheck: () => doctorRequestRecheck(),
    doctor_issue_rest: () => doctorIssueSlip("راحة"),
    doctor_issue_ref: () => doctorIssueSlip("إحالة"),
    doctor_accept_visit: () => doctorAcceptLatestVisit(),
    doctor_reject_visit: () => doctorRejectLatestVisit(),
    doctor_invite_parent: () => doctorInviteParent(),
    doctor_ask_copilot: () => doctorAskCopilot(),

    // Admin
    admin_refresh: () => adminRefresh(),

    // Parent
    parent_refresh: () => parentRefresh(),
    parent_consent_yes: (btn) => {
      const id = btn?.dataset?.visit;
      if (!id) return;
      SSC_PARENT.consentForVisit(id, true);
      parentRefresh();
    },
    parent_consent_no: (btn) => {
      const id = btn?.dataset?.visit;
      if (!id) return;
      SSC_PARENT.consentForVisit(id, false);
      parentRefresh();
    },
  };

  const wireActions = () => {
    ensureToastHost();
    renderBadges();

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const name = btn.dataset.action;
      const fn = ACTIONS[name];
      if (!fn) {
        SSC.toast("زر غير مفعّل", `هذا الزر يحتاج Action: ${name}`);
        return;
      }
      fn(btn);
    });

    // Page-specific auto refresh
    const role = SSC_AUTH.getRole();
    if (role === "admin") setInterval(adminRefresh, 1200);
    if (role === "parent") setInterval(parentRefresh, 1200);

    // If student page: load last case
    const last = SSC.getDB().cases?.[0];
    if (role === "student" && last) renderStudentCase(last);

    if (role === "admin") adminRefresh();
    if (role === "parent") parentRefresh();
  };

  window.addEventListener("DOMContentLoaded", wireActions);

  // Public
  window.SSC_ACTIONS = { ACTIONS };
})();

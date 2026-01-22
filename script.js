/* =========================================================
   Smart School Clinic — Script Controller
   Static / Demo / GitHub Pages Ready
   ========================================================= */

(() => {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const now = () => new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const timeStr = () => `${pad2(now().getHours())}:${pad2(now().getMinutes())}`;

  /* ---------------- State ---------------- */
  const state = {
    cases: [],
    alerts: [],
    lastCase: null
  };

  /* ---------------- Navigation ---------------- */
  function initNav() {
    $$(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const view = btn.dataset.view;
        $$(".view").forEach(v => v.classList.remove("show"));
        $("#view-" + view)?.classList.add("show");
      });
    });
  }

  /* ---------------- Demo Seed ---------------- */
  function seedCases() {
    const demo = [
      { student: "طالب #23", reason: "صداع", priority: "LOW", status: "تم" },
      { student: "طالبة #41", reason: "حمّى", priority: "MED", status: "متابعة" },
      { student: "طالب #18", reason: "ضيق تنفس", priority: "HIGH", status: "تنبيه" }
    ];

    state.cases = demo.map(c => ({
      id: Math.random().toString(36).slice(2, 8),
      time: timeStr(),
      ...c
    }));

    state.lastCase = state.cases[0];
    renderCases();
  }

  /* ---------------- Renderers ---------------- */
  function renderCases() {
    const box = $("#caseRows");
    if (!box) return;

    box.innerHTML = state.cases.slice(0, 6).map(c => `
      <div class="trow">
        <div class="muted">${c.time}</div>
        <div><b>${c.student}</b></div>
        <div>${c.reason}</div>
        <div>${badgePriority(c.priority)}</div>
        <div>${badgeStatus(c.status)}</div>
      </div>
    `).join("");
  }

  function renderAlerts() {
    const box = $("#alertsList");
    if (!box) return;

    if (!state.alerts.length) {
      box.innerHTML = `<div class="empty">لا توجد تنبيهات حالياً</div>`;
      return;
    }

    box.innerHTML = state.alerts.map(a => `
      <div class="alert ${a.level}">
        <div class="a-top">
          <div class="a-title">${a.title}</div>
          <div class="muted">${a.time}</div>
        </div>
        <div class="a-body">${a.body}</div>
      </div>
    `).join("");
  }

  /* ---------------- Badges ---------------- */
  function badgePriority(p) {
    const map = {
      LOW: "low",
      MED: "med",
      HIGH: "high",
      CRIT: "crit"
    };
    return `<span class="pr ${map[p]}">${p}</span>`;
  }

  function badgeStatus(s) {
    const map = {
      "تم": "done",
      "متابعة": "follow",
      "تنبيه": "alert"
    };
    return `<span class="st ${map[s]}">${s}</span>`;
  }

  /* ---------------- Actions ---------------- */
  function bindActions() {
    $("#btnQuickDemo")?.addEventListener("click", () => {
      const c = createRandomCase();
      state.cases.unshift(c);
      state.lastCase = c;
      renderCases();
      simulateAlert(c);
    });

    $("#btnSimAlert")?.addEventListener("click", () => {
      simulateAlert(state.lastCase || createRandomCase());
    });

    $("#btnClearAlerts")?.addEventListener("click", () => {
      state.alerts = [];
      renderAlerts();
    });
  }

  function createRandomCase() {
    const priorities = ["LOW", "MED", "HIGH"];
    const reasons = ["صداع", "حمّى", "إجهاد", "ألم بطن"];
    const priority = priorities[rand(0, 2)];

    return {
      id: Math.random().toString(36).slice(2, 8),
      time: timeStr(),
      student: `طالب #${rand(10, 99)}`,
      reason: reasons[rand(0, reasons.length - 1)],
      priority,
      status: priority === "HIGH" ? "تنبيه" : priority === "MED" ? "متابعة" : "تم"
    };
  }

  function simulateAlert(caseObj) {
    if (!caseObj || caseObj.priority === "LOW") return;

    const alert = {
      time: timeStr(),
      level: caseObj.priority === "HIGH" ? "high" : "crit",
      title: "تنبيه صحي",
      body: `حالة ${caseObj.student} تتطلب انتباه`
    };

    state.alerts.unshift(alert);
    state.alerts = state.alerts.slice(0, 5);
    renderAlerts();
  }

  /* ---------------- Init ---------------- */
  function init() {
    initNav();
    seedCases();
    bindActions();
    renderAlerts();
    console.log("Smart School Clinic — script.js ready");
  }

  init();
})();

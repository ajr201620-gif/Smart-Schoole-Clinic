/* ==========================================================
  Smart School Clinic OS — app-init.js (Backend-ready)
  - Role routing + RBAC
  - Theme lock (prevents "white page" issue)
  - Unified Topbar actions
  - UI helpers (toast/modal/loading)
  - Lightweight "API" layer (mock now, swap later with Firebase)
========================================================== */

(() => {
  "use strict";

  /* ----------------------------- Config ----------------------------- */
  const APP = {
    name: "Smart School Clinic OS",
    version: "2.0.0",
    storage: {
      role: "SC_ROLE",
      user: "SC_USER",
      theme: "SC_THEME", // "dark" | "light"
      lastPage: "SC_LAST_PAGE",
      audit: "SC_AUDIT_LOG",
    },
    routes: {
      index: "index.html",
      student: "student.html",
      doctor: "doctor.html",
      admin: "admin.html",
      parent: "parent.html",
      visit: "visit.html",
      report: "report.html",
      reportView: "report-view.html",
    },
    roles: ["student", "doctor", "admin", "parent"],
  };

  /* ----------------------------- Utils ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const nowISO = () => new Date().toISOString();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function lsGet(key, fallback = null) {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }
  function lsSet(key, value) {
    localStorage.setItem(key, value);
  }

  function pageName() {
    const p = location.pathname.split("/").pop() || "index.html";
    return p.split("?")[0].split("#")[0];
  }

  function isIndex() {
    const p = pageName().toLowerCase();
    return p === "" || p === "index.html";
  }

  function getRoleFromURL() {
    const u = new URL(location.href);
    const r = (u.searchParams.get("role") || "").toLowerCase().trim();
    return APP.roles.includes(r) ? r : null;
  }

  function setRole(role) {
    if (!APP.roles.includes(role)) return;
    lsSet(APP.storage.role, role);
    // default "user"
    const defaultUser = { id: "demo", role, name: roleLabel(role), at: nowISO() };
    lsSet(APP.storage.user, JSON.stringify(defaultUser));
    audit("role:set", { role });
  }

  function getRole() {
    return (lsGet(APP.storage.role, "") || "").toLowerCase().trim();
  }

  function roleLabel(role) {
    switch (role) {
      case "student": return "طالب";
      case "doctor": return "طبيب";
      case "admin": return "إدارة";
      case "parent": return "ولي أمر";
      default: return "زائر";
    }
  }

  function routeForRole(role) {
    switch (role) {
      case "student": return APP.routes.student;
      case "doctor": return APP.routes.doctor;
      case "admin": return APP.routes.admin;
      case "parent": return APP.routes.parent;
      default: return APP.routes.index;
    }
  }

  function go(url) {
    lsSet(APP.storage.lastPage, pageName());
    location.href = url;
  }

  /* ----------------------------- Theme Lock ----------------------------- */
  // This prevents the “white page” issue: apply theme immediately.
  function applyThemeLock() {
    const theme = (lsGet(APP.storage.theme, "dark") || "dark").toLowerCase();
    const html = document.documentElement;
    html.dataset.theme = theme; // allow CSS: html[data-theme="dark"] ...
    document.body.dataset.theme = theme;

    // enforce dark background even if a page missed CSS
    document.body.style.background = theme === "dark"
      ? "radial-gradient(1200px 700px at 75% -20%, rgba(168,85,247,.22), transparent 60%), radial-gradient(900px 600px at 15% 0%, rgba(56,189,248,.18), transparent 55%), linear-gradient(180deg, #050612 0%, #07081a 55%, #060615 100%)"
      : "linear-gradient(180deg, #f7fafc 0%, #eef2ff 100%)";

    document.body.style.minHeight = "100vh";
    document.body.style.color = theme === "dark" ? "rgba(255,255,255,.92)" : "#0b1220";
  }

  function toggleTheme() {
    const cur = (lsGet(APP.storage.theme, "dark") || "dark").toLowerCase();
    const next = cur === "dark" ? "light" : "dark";
    lsSet(APP.storage.theme, next);
    applyThemeLock();
    toast(`تم التبديل إلى وضع ${next === "dark" ? "ليلي" : "نهاري"}`);
    audit("theme:toggle", { next });
  }

  /* ----------------------------- UI Helpers ----------------------------- */
  function ensureToastHost() {
    if ($("#scToastHost")) return;
    const host = document.createElement("div");
    host.id = "scToastHost";
    host.style.cssText = [
      "position:fixed",
      "left:14px",
      "bottom:14px",
      "z-index:99999",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "max-width:min(420px, calc(100vw - 28px))",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(host);
  }

  function toast(msg, kind = "info", ms = 2600) {
    ensureToastHost();
    const host = $("#scToastHost");
    const t = document.createElement("div");
    const bg = kind === "ok" ? "rgba(34,197,94,.18)"
      : kind === "warn" ? "rgba(245,158,11,.18)"
      : kind === "bad" ? "rgba(239,68,68,.18)"
      : "rgba(56,189,248,.16)";
    const bd = kind === "ok" ? "rgba(34,197,94,.35)"
      : kind === "warn" ? "rgba(245,158,11,.35)"
      : kind === "bad" ? "rgba(239,68,68,.35)"
      : "rgba(56,189,248,.30)";

    t.style.cssText = [
      "pointer-events:none",
      "backdrop-filter: blur(10px)",
      "border:1px solid " + bd,
      "background:" + bg,
      "padding:10px 12px",
      "border-radius:12px",
      "box-shadow: 0 12px 40px rgba(0,0,0,.28)",
      "font: 600 13px/1.4 system-ui, -apple-system, Segoe UI, Arial",
      "letter-spacing:.2px",
    ].join(";");
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      t.style.transition = "all .25s ease";
      setTimeout(() => t.remove(), 260);
    }, ms);
  }

  function ensureModalHost() {
    if ($("#scModal")) return;
    const wrap = document.createElement("div");
    wrap.id = "scModal";
    wrap.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:99998",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "background:rgba(0,0,0,.45)",
      "backdrop-filter: blur(6px)",
      "padding:18px",
    ].join(";");

    wrap.innerHTML = `
      <div id="scModalCard" style="
        width:min(720px, 100%);
        border-radius:16px;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(12,12,24,.78);
        box-shadow: 0 20px 70px rgba(0,0,0,.55);
        overflow:hidden;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.10)">
          <div id="scModalTitle" style="font-weight:800;letter-spacing:.2px">نافذة</div>
          <button id="scModalClose" style="
            border:1px solid rgba(255,255,255,.18);
            background:rgba(255,255,255,.06);
            color:rgba(255,255,255,.9);
            border-radius:10px;
            padding:8px 10px;
            cursor:pointer;
          ">إغلاق</button>
        </div>
        <div id="scModalBody" style="padding:14px;color:rgba(255,255,255,.92);line-height:1.7"></div>
        <div id="scModalActions" style="display:flex;gap:10px;justify-content:flex-start;padding:12px 14px;border-top:1px solid rgba(255,255,255,.10)"></div>
      </div>
    `;
    document.body.appendChild(wrap);

    $("#scModalClose").addEventListener("click", hideModal);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) hideModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });
  }

  function showModal({ title = "نافذة", html = "", actions = [] }) {
    ensureModalHost();
    $("#scModalTitle").textContent = title;
    $("#scModalBody").innerHTML = html;
    const a = $("#scModalActions");
    a.innerHTML = "";
    actions.forEach((btn) => {
      const b = document.createElement("button");
      b.textContent = btn.label || "OK";
      b.style.cssText = [
        "border:1px solid rgba(255,255,255,.18)",
        "background:rgba(255,255,255,.06)",
        "color:rgba(255,255,255,.92)",
        "border-radius:12px",
        "padding:10px 12px",
        "cursor:pointer",
        "font-weight:700",
      ].join(";");
      b.addEventListener("click", () => {
        try { btn.onClick && btn.onClick(); } finally { if (btn.close !== false) hideModal(); }
      });
      a.appendChild(b);
    });
    $("#scModal").style.display = "flex";
  }

  function hideModal() {
    const m = $("#scModal");
    if (m) m.style.display = "none";
  }

  function setLoading(on, msg = "جارٍ التحميل…") {
    let el = $("#scLoading");
    if (!el) {
      el = document.createElement("div");
      el.id = "scLoading";
      el.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99997",
        "display:none",
        "align-items:center",
        "justify-content:center",
        "background:rgba(0,0,0,.40)",
        "backdrop-filter: blur(6px)",
      ].join(";");
      el.innerHTML = `
        <div style="
          border:1px solid rgba(255,255,255,.14);
          background: rgba(12,12,24,.72);
          border-radius:16px;
          padding:14px 16px;
          min-width: 240px;
          box-shadow: 0 20px 70px rgba(0,0,0,.55);
        ">
          <div style="font-weight:900;margin-bottom:6px;letter-spacing:.2px">${APP.name}</div>
          <div id="scLoadingMsg" style="opacity:.9">${msg}</div>
        </div>
      `;
      document.body.appendChild(el);
    }
    $("#scLoadingMsg").textContent = msg;
    el.style.display = on ? "flex" : "none";
  }

  /* ----------------------------- Audit ----------------------------- */
  function audit(event, data = {}) {
    const max = 250;
    const log = safeJSONParse(lsGet(APP.storage.audit, "[]"), []);
    log.push({ t: nowISO(), event, page: pageName(), role: getRole() || "none", data });
    while (log.length > max) log.shift();
    lsSet(APP.storage.audit, JSON.stringify(log));
  }

  /* ----------------------------- API (Mock now) ----------------------------- */
  // Backend-ready: replace these with Firebase later without touching UI.
  const API = {
    async createCase(payload) {
      // payload: { studentId, complaint, vitals, triage }
      await sleep(220);
      const id = "CASE-" + Math.random().toString(16).slice(2, 8).toUpperCase();
      const cases = safeJSONParse(lsGet("SC_CASES", "[]"), []);
      const item = { id, ...payload, status: "new", createdAt: nowISO(), updatedAt: nowISO() };
      cases.unshift(item);
      lsSet("SC_CASES", JSON.stringify(cases));
      audit("case:create", { id });
      return item;
    },
    async listCases() {
      await sleep(160);
      return safeJSONParse(lsGet("SC_CASES", "[]"), []);
    },
    async updateCase(id, patch) {
      await sleep(180);
      const cases = safeJSONParse(lsGet("SC_CASES", "[]"), []);
      const i = cases.findIndex(x => x.id === id);
      if (i === -1) throw new Error("Case not found");
      cases[i] = { ...cases[i], ...patch, updatedAt: nowISO() };
      lsSet("SC_CASES", JSON.stringify(cases));
      audit("case:update", { id, patch });
      return cases[i];
    },
    async metrics() {
      await sleep(120);
      const cases = safeJSONParse(lsGet("SC_CASES", "[]"), []);
      const total = cases.length;
      const critical = cases.filter(c => (c.triage?.risk || 0) >= 80).length;
      const follow = cases.filter(c => c.status === "followup").length;
      const slips = cases.filter(c => c.status === "rest").length;
      const referrals = cases.filter(c => c.status === "referred").length;
      return { total, critical, follow, slips, referrals };
    }
  };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ----------------------------- RBAC ----------------------------- */
  const RBAC = {
    student: {
      allow: [
        "genSensors",
        "aiTriage",
        "requestVisit",
        "viewMyReport",
        "notifyParent",
      ],
    },
    doctor: {
      allow: [
        "listCases",
        "openCase",
        "requestSecondReading",
        "aiAssistDiagnosis",
        "approveVisit",
        "rejectVisit",
        "inviteParent",
        "setDecisionRest",
        "setDecisionFollowup",
        "setDecisionRefer",
        "createReport",
      ],
    },
    admin: {
      allow: [
        "viewMetrics",
        "listCases",
        "openCase",
        "auditLog",
        "heatmap",
        "issuePermissionSlip",
        "exportReports",
      ],
    },
    parent: {
      allow: [
        "viewChildStatus",
        "joinVisit",
        "approveConsent",
        "chatWithClinic",
        "viewReport",
      ],
    },
  };

  function hasPerm(action) {
    const r = getRole();
    if (!r || !RBAC[r]) return false;
    return RBAC[r].allow.includes(action);
  }

  // Hide/disable UI items based on permissions:
  // Put data-perm="actionName" on buttons/sections and we handle the rest.
  function applyRBACToDOM() {
    $$("[data-perm]").forEach((el) => {
      const perm = (el.getAttribute("data-perm") || "").trim();
      const ok = hasPerm(perm);
      if (!ok) {
        // hide by default (clean)
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      } else {
        el.style.display = "";
        el.removeAttribute("aria-hidden");
      }
    });

    // For buttons that exist but should be disabled instead of hidden:
    $$("[data-perm-disable]").forEach((el) => {
      const perm = (el.getAttribute("data-perm-disable") || "").trim();
      const ok = hasPerm(perm);
      el.disabled = !ok;
      el.style.opacity = ok ? "1" : ".45";
      el.style.cursor = ok ? "pointer" : "not-allowed";
    });
  }

  /* ----------------------------- Topbar wiring ----------------------------- */
  function wireTopbar() {
    // supports any of these:
    // #btnTheme, [data-action="theme"]
    // #btnHome,  [data-action="home"]
    // #btnBack,  [data-action="back"]
    // #btnLogout,[data-action="logout"]
    const btnTheme = $("#btnTheme") || $('[data-action="theme"]');
    if (btnTheme) btnTheme.addEventListener("click", toggleTheme);

    const btnHome = $("#btnHome") || $('[data-action="home"]');
    if (btnHome) btnHome.addEventListener("click", () => go(APP.routes.index));

    const btnBack = $("#btnBack") || $('[data-action="back"]');
    if (btnBack) btnBack.addEventListener("click", () => go(APP.routes.index));

    const btnLogout = $("#btnLogout") || $('[data-action="logout"]');
    if (btnLogout) btnLogout.addEventListener("click", () => {
      lsSet(APP.storage.role, "");
      lsSet(APP.storage.user, "");
      toast("تم تسجيل الخروج");
      audit("auth:logout");
      go(APP.routes.index);
    });
  }

  /* ----------------------------- Role Router ----------------------------- */
  function initRoleRouting() {
    const urlRole = getRoleFromURL();
    if (urlRole) setRole(urlRole);

    // index: allow picking role via buttons/tiles
    if (isIndex()) {
      // If already have role & user chose "Auto-enter", you can route
      const savedRole = getRole();
      const autoEnter = (lsGet("SC_AUTO_ENTER", "0") === "1");
      if (savedRole && autoEnter) go(routeForRole(savedRole));

      // role pick buttons:
      // any element with [data-role="student|doctor|admin|parent"] triggers role set + nav
      $$("[data-role]").forEach((el) => {
        el.addEventListener("click", () => {
          const role = (el.getAttribute("data-role") || "").toLowerCase().trim();
          if (!APP.roles.includes(role)) return;
          setRole(role);
          toast(`تم اختيار دور: ${roleLabel(role)}`, "ok");
          go(routeForRole(role));
        });
      });

      // optional "auto enter" toggle
      const chk = $("#autoEnter");
      if (chk) {
        chk.checked = (lsGet("SC_AUTO_ENTER", "0") === "1");
        chk.addEventListener("change", () => lsSet("SC_AUTO_ENTER", chk.checked ? "1" : "0"));
      }

      return;
    }

    // non-index pages: ensure role exists
    const r = getRole();
    if (!APP.roles.includes(r)) {
      toast("لم يتم تحديد الدور — سيتم إرجاعك للبوابة", "warn");
      go(APP.routes.index);
      return;
    }

    // ensure user stays within their page (basic guard)
    const p = pageName().toLowerCase();
    const expected = routeForRole(r).toLowerCase();
    const isVisit = p === APP.routes.visit.toLowerCase();
    const isReport = (p === APP.routes.report.toLowerCase() || p === APP.routes.reportView.toLowerCase());

    // allow visit/report shared pages
    if (!isVisit && !isReport && p !== expected) {
      // If user opened wrong page, route to correct one
      go(expected);
      return;
    }

    document.body.dataset.role = r;
    audit("nav:enter", { role: r, page: p });
  }

  /* ----------------------------- Role UI Enhancement ----------------------------- */
  function enhanceRoleHeader() {
    const r = getRole();
    // update any element with [data-role-label]
    $$("[data-role-label]").forEach(el => el.textContent = roleLabel(r));
    // update any element with [data-role-name]
    $$("[data-role-name]").forEach(el => el.textContent = r.toUpperCase());
  }

  /* ----------------------------- Global Hook for actions.js ----------------------------- */
  // actions.js can call window.SC.* safely
  function exposeGlobal() {
    window.SC = window.SC || {};
    window.SC.APP = APP;
    window.SC.API = API;
    window.SC.toast = toast;
    window.SC.modal = showModal;
    window.SC.loading = setLoading;
    window.SC.audit = audit;
    window.SC.role = () => getRole();
    window.SC.hasPerm = hasPerm;
    window.SC.go = go;
    window.SC.routeForRole = routeForRole;

    // lightweight event bus (if your bus.js exists we also support it)
    const listeners = new Map();
    window.SC.on = (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    };
    window.SC.emit = (evt, payload) => {
      const arr = listeners.get(evt) || [];
      arr.forEach(fn => { try { fn(payload); } catch {} });
      // if external Bus exists
      if (window.Bus && typeof window.Bus.emit === "function") {
        try { window.Bus.emit(evt, payload); } catch {}
      }
    };
  }

  /* ----------------------------- Minimal auto wiring for buttons ----------------------------- */
  // You can use: data-action="home|theme|openVisit|..." and later actions.js will take over.
  function wireFallbackActions() {
    $$("[data-action]").forEach((el) => {
      const act = (el.getAttribute("data-action") || "").trim();
      if (!act) return;

      // don't double-bind if already bound
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";

      el.addEventListener("click", async () => {
        // Fallback basic actions (safe, non-breaking)
        if (act === "home") return go(APP.routes.index);
        if (act === "theme") return toggleTheme();
        if (act === "openVisit") return go(APP.routes.visit);
        if (act === "openReport") return go(APP.routes.report);
        if (act === "help") return toast("جاهزين نفعّل كل الأزرار في actions.js 🔥");

        // If actions.js defines window.Actions.do(action, el), call it.
        if (window.Actions && typeof window.Actions.do === "function") {
          return window.Actions.do(act, el);
        }

        toast("هذا الزر سيتم تفعيله في actions.js", "warn");
      });
    });
  }

  /* ----------------------------- Boot ----------------------------- */
  function boot() {
    applyThemeLock();
    exposeGlobal();
    initRoleRouting();
    wireTopbar();
    enhanceRoleHeader();
    applyRBACToDOM();
    wireFallbackActions();

    // mark ready
    document.documentElement.dataset.scReady = "1";
    audit("app:ready", { v: APP.version });

    // Dev hint
    // eslint-disable-next-line no-console
    console.log(`✅ ${APP.name} ready — v${APP.version} — role: ${getRole() || "none"}`);
  }

  // Run ASAP
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

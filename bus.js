/* bus.js — Tiny Event Bus + UI helpers (Static) */

(() => {
  "use strict";

  const listeners = new Map();

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => off(event, fn);
  }

  function off(event, fn) {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(fn);
    if (!set.size) listeners.delete(event);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (e) { console.error("[bus]", event, e); }
    }
    // also DOM CustomEvent
    try { window.dispatchEvent(new CustomEvent(event, { detail: payload })); } catch {}
  }

  // ---------- UI: Toast ----------
  let toastRoot = null;

  function ensureToastRoot() {
    if (toastRoot) return toastRoot;
    toastRoot = document.createElement("div");
    toastRoot.id = "toastRoot";
    toastRoot.style.cssText = `
      position:fixed; inset:auto 18px 18px auto; z-index:99999;
      display:flex; flex-direction:column; gap:10px; align-items:flex-end;
      font-family: system-ui, -apple-system, Segoe UI, Arial;
    `;
    document.body.appendChild(toastRoot);
    return toastRoot;
  }

  function toast({ type = "info", msg = "—", ttl = 2400 } = {}) {
    ensureToastRoot();

    const el = document.createElement("div");
    const icon =
      type === "ok" ? "✅" :
      type === "warn" ? "⚠️" :
      type === "err" ? "⛔" : "ℹ️";

    el.style.cssText = `
      min-width: 220px; max-width: 360px;
      padding: 10px 12px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      background: rgba(18,20,30,.82);
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 10px 28px rgba(0,0,0,.35);
      color: rgba(255,255,255,.92);
      font-size: 13px;
      transform: translateY(8px);
      opacity: 0;
      transition: transform .18s ease, opacity .18s ease;
    `;

    el.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <div style="font-size:16px; line-height:1; margin-top:1px;">${icon}</div>
        <div style="line-height:1.45;">
          <div style="font-weight:700; margin-bottom:2px;">${type === "ok" ? "تم" : type === "warn" ? "تنبيه" : type === "err" ? "خطأ" : "معلومة"}</div>
          <div style="opacity:.92">${escapeHtml(msg)}</div>
        </div>
      </div>
    `;

    toastRoot.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(() => el.remove(), 220);
    }, ttl);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // ---------- UI: Stats bind ----------
  function setText(sel, txt) {
    const el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }

  function applyStats(stats) {
    if (!stats) return;
    // IDs (preferred)
    const map = {
      "#kpiRequests": stats.requests,
      "#kpiCases": stats.cases,
      "#kpiCritical": stats.critical,
      "#kpiFollowup": stats.followup,
    };
    Object.entries(map).forEach(([k, v]) => setText(k, String(v ?? 0)));

    // data-kpi fallback
    document.querySelectorAll("[data-kpi]").forEach(el => {
      const key = el.getAttribute("data-kpi");
      if (key && stats[key] != null) el.textContent = String(stats[key]);
    });
  }

  // Listen to actions updates (if any)
  on("stats:update", applyStats);
  on("toast", toast);

  // Expose
  window.bus = { on, off, emit, toast, applyStats };

})();

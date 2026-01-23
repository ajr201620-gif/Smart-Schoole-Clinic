(() => {
  "use strict";

  const DB_KEY = "ssc_os_v1";

  const nowISO = () => new Date().toISOString();
  const uid = (p="id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  const load = () => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("DB load failed", e);
      return null;
    }
  };

  const save = (db) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  };

  const freshDB = () => ({
    meta: { version: 1, createdAt: nowISO(), updatedAt: nowISO() },
    user: { role: "guest", name: "ضيف" },
    cases: [],          // student triage cases
    visits: [],         // visit sessions
    consents: [],       // parent consents
    slips: [],          // rest/referral slips
    audit: [],          // audit log
    notifications: [],  // toasts/inbox
    settings: { demoMode: true }
  });

  const getDB = () => {
    const db = load();
    return db || freshDB();
  };

  const updateDB = (fn) => {
    const db = getDB();
    const next = fn(db) || db;
    next.meta.updatedAt = nowISO();
    save(next);
    return next;
  };

  // Simple event bus
  const listeners = new Map();
  const on = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  };
  const emit = (event, payload) => {
    listeners.get(event)?.forEach((h) => {
      try { h(payload); } catch (e) { console.error(e); }
    });
  };

  // Audit + toast
  const audit = (action, details = {}) => {
    updateDB((db) => {
      db.audit.unshift({
        id: uid("audit"),
        at: nowISO(),
        role: db.user?.role || "guest",
        action,
        details
      });
      db.audit = db.audit.slice(0, 400);
      return db;
    });
    emit("audit", { action, details });
  };

  const toast = (title, message) => {
    const t = { id: uid("toast"), at: nowISO(), title, message };
    updateDB((db) => {
      db.notifications.unshift(t);
      db.notifications = db.notifications.slice(0, 120);
      return db;
    });
    emit("toast", t);
  };

  // Helpers
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Public
  window.SSC = {
    DB_KEY,
    nowISO,
    uid,
    getDB,
    updateDB,
    on,
    emit,
    audit,
    toast,
    clamp,
    pick
  };
})();

/* auth.js — Lightweight Role Identity (Static)
   - Saves identity per role for demo + RBAC display
   - Works with app-init.js (role stored in SC_ROLE / SC_USER)
*/

(() => {
  "use strict";

  const KEY = {
    ROLE: "SC_ROLE",
    USER: "SC_USER",
    AUTO: "SC_AUTO_ENTER"
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function lsGet(k, d = null) {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  }
  function lsSet(k, v) { localStorage.setItem(k, v); }

  function safeParse(s, d) {
    try { return JSON.parse(s); } catch { return d; }
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

  function getRole() {
    return (lsGet(KEY.ROLE, "") || "").toLowerCase().trim();
  }

  function setRole(role) {
    lsSet(KEY.ROLE, role);
  }

  function getUser() {
    return safeParse(lsGet(KEY.USER, "{}"), {});
  }

  function setUser(obj) {
    lsSet(KEY.USER, JSON.stringify(obj));
  }

  function defaultIdentity(role) {
    const base = {
      id: "demo",
      role,
      at: new Date().toISOString(),
      name: roleLabel(role) + " (Demo)",
    };

    if (role === "student") {
      base.schoolId = "S-1001";
      base.grade = "ثاني متوسط";
      base.age = 13;
    }
    if (role === "doctor") {
      base.name = "د. الطبيب (Demo)";
      base.license = "LIC-0001";
    }
    if (role === "admin") {
      base.name = "إدارة المدرسة (Demo)";
      base.department = "إدارة / صحة مدرسية";
    }
    if (role === "parent") {
      base.name = "ولي الأمر (Demo)";
      base.nationalId = "1XXXXXXXXX";
      base.childSchoolId = "S-1001";
    }
    return base;
  }

  function applyIdentityToDOM() {
    const role = getRole();
    const user = getUser();

    // update any placeholders
    $$("[data-user-name]").forEach(el => el.textContent = user.name || "—");
    $$("[data-user-role]").forEach(el => el.textContent = roleLabel(role));
    $$("[data-user-id]").forEach(el => el.textContent = user.schoolId || user.nationalId || user.license || "—");
  }

  // Optional login form (if exists):
  // #loginName, #loginId, #loginRole, #btnLogin
  function wireLoginFormIfExists() {
    const btn = $("#btnLogin");
    const roleSel = $("#loginRole");
    const nameEl = $("#loginName");
    const idEl = $("#loginId");

    if (!btn || !roleSel) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const role = (roleSel.value || "").toLowerCase().trim();
      if (!role) return window.bus?.toast?.({ type: "warn", msg: "اختر الدور أولاً" });

      const base = defaultIdentity(role);
      base.name = (nameEl?.value || "").trim() || base.name;

      // id meaning depends on role
      const id = (idEl?.value || "").trim();
      if (role === "student") base.schoolId = id || base.schoolId;
      if (role === "parent") base.nationalId = id || base.nationalId;
      if (role === "doctor") base.license = id || base.license;
      if (role === "admin") base.department = id || base.department;

      setRole(role);
      setUser(base);

      // Auto enter option
      const auto = $("#autoEnter");
      if (auto) lsSet(KEY.AUTO, auto.checked ? "1" : "0");

      window.bus?.toast?.({ type: "ok", msg: `تم تسجيل الدخول كـ ${roleLabel(role)}` });
      applyIdentityToDOM();

      // Go to role page
      if (window.SC?.routeForRole) {
        location.href = window.SC.routeForRole(role);
      } else {
        // fallback
        const map = { student: "student.html", doctor: "doctor.html", admin: "admin.html", parent: "parent.html" };
        location.href = map[role] || "index.html";
      }
    });
  }

  function ensureIdentity() {
    const role = getRole();
    const user = getUser();
    if (!role) return;
    if (!user || !user.role) {
      setUser(defaultIdentity(role));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureIdentity();
    wireLoginFormIfExists();
    applyIdentityToDOM();
  });

  // Expose if needed
  window.Auth = { getRole, setRole, getUser, setUser, defaultIdentity };

})();

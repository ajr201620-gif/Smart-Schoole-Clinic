/* app-init.js — Smart School Clinic OS
   - Detect role from URL/body
   - Apply theme persistently
   - Wire global Back
   - Boot Actions for the page
*/

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const App = {
    keys: {
      theme: "SSCOS_THEME",
      role: "SSCOS_ROLE"
    },
    getRole() {
      // 1) from body attribute: <body data-role="student">
      const byBody = document.body?.dataset?.role;
      if (byBody) return byBody;

      // 2) from URL filename
      const p = (location.pathname || "").toLowerCase();
      if (p.includes("student")) return "student";
      if (p.includes("doctor")) return "doctor";
      if (p.includes("admin")) return "admin";
      if (p.includes("parent")) return "parent";
      if (p.includes("visit")) return "visit";
      return "portal";
    },
    setTheme(next) {
      const theme = next || localStorage.getItem(App.keys.theme) || "dark";
      localStorage.setItem(App.keys.theme, theme);
      document.documentElement.setAttribute("data-theme", theme);

      // Optional: update button label if present
      const btn = $("#btnTheme");
      if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
    },
    toggleTheme() {
      const cur = localStorage.getItem(App.keys.theme) || "dark";
      App.setTheme(cur === "dark" ? "light" : "dark");
    },
    wireGlobal() {
      // Theme button (if your header has it)
      const btnTheme = $("#btnTheme");
      if (btnTheme) btnTheme.addEventListener("click", App.toggleTheme);

      // Back buttons (any element with data-action="nav.back")
      document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action='nav.back']");
        if (!el) return;
        e.preventDefault();
        history.length > 1 ? history.back() : (location.href = "index.html");
      });
    },
    boot() {
      const role = App.getRole();
      localStorage.setItem(App.keys.role, role);

      // Apply theme early
      App.setTheme();

      // wire global interactions
      App.wireGlobal();

      // Boot Actions if exists
      if (window.Actions && typeof window.Actions.init === "function") {
        window.Actions.init(role);
      }
    }
  };

  window.AppInit = App;

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", App.boot);
  } else {
    App.boot();
  }
})();

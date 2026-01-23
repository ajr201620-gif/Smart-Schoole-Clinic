/* ===========================================================
   Smart Clinic OS — RBAC UI Shell
   - Role-based nav + actions
   - Clean topbar (1 primary action + status)
   - Auto-hide elements with [data-roles]
   =========================================================== */

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const ROLES = {
    student: {
      label: "بوابة الطالب",
      badge: "Student",
      home: "student.html",
      primary: { text: "🎥 زيارة افتراضية", href: "visit.html?role=student", id: "actVisit" },
      nav: [
        { text: "🏠 الرئيسية", href: "student.html" },
        { text: "🩺 طلب زيارة", href: "student.html#request", key: "R" },
        { text: "📚 إرشاد صحي", href: "student.html#coach", key: "C" },
        { text: "🧾 تقريري", href: "report.html#me", key: "P" }
      ],
      quick: [
        { text: "🩺 طلب زيارة", id: "qRequest", kind: "action" },
        { text: "🎥 دخول الزيارة", href: "visit.html?role=student", kind: "link" },
        { text: "📣 بلاغ بسيط", id: "qReport", kind: "action" }
      ]
    },

    doctor: {
      label: "بوابة الطبيب",
      badge: "Doctor",
      home: "doctor.html",
      primary: { text: "🎥 زيارة افتراضية", href: "visit.html?role=doctor", id: "actVisit" },
      nav: [
        { text: "🏠 الرئيسية", href: "doctor.html" },
        { text: "📥 الطلبات", href: "doctor.html#inbox", key: "I" },
        { text: "🧠 التشخيص", href: "doctor.html#dx", key: "D" },
        { text: "🧾 التقارير", href: "report.html", key: "P" }
      ],
      quick: [
        { text: "📥 فتح آخر طلب", id: "qOpenLatest", kind: "action" },
        { text: "🧠 إنشاء تشخيص", id: "qNewDx", kind: "action" },
        { text: "🎥 دخول الزيارة", href: "visit.html?role=doctor", kind: "link" }
      ]
    },

    admin: {
      label: "إدارة المدرسة",
      badge: "Admin",
      home: "admin.html",
      primary: { text: "📊 لوحة المدرسة", href: "admin.html#dash", id: "actDash" },
      nav: [
        { text: "🏠 الرئيسية", href: "admin.html" },
        { text: "📊 لوحة المؤشرات", href: "admin.html#dash", key: "K" },
        { text: "🧯 البلاغات", href: "admin.html#alerts", key: "A" },
        { text: "🧾 تقارير عامة", href: "report.html#school", key: "P" }
      ],
      quick: [
        { text: "📊 مؤشرات اليوم", id: "qKPIs", kind: "action" },
        { text: "🧯 أحدث تنبيه", id: "qLatestAlert", kind: "action" },
        { text: "🧾 تقرير أسبوعي", href: "report.html#school", kind: "link" }
      ]
    },

    parent: {
      label: "بوابة ولي الأمر",
      badge: "Parent",
      home: "parent.html",
      primary: { text: "📨 تواصل/زيارة", href: "visit.html?role=student", id: "actVisitParent" },
      nav: [
        { text: "🏠 الرئيسية", href: "parent.html" },
        { text: "👦 ملف الابن", href: "parent.html#child", key: "F" },
        { text: "✅ موافقات", href: "parent.html#consent", key: "C" },
        { text: "🧾 التقارير", href: "report.html#parent", key: "P" }
      ],
      quick: [
        { text: "✅ موافقة/رفض", id: "qConsent", kind: "action" },
        { text: "🧾 آخر تقرير", href: "report.html#parent", kind: "link" },
        { text: "📞 طلب تواصل", id: "qCall", kind: "action" }
      ]
    }
  };

  function getRole() {
    const urlRole = new URLSearchParams(location.search).get("role");
    const stored = localStorage.getItem("SC_ROLE");
    const role = (urlRole || stored || document.documentElement.getAttribute("data-role") || "student").toLowerCase();
    return ROLES[role] ? role : "student";
  }

  function setRole(role) {
    localStorage.setItem("SC_ROLE", role);
  }

  function applyRoleVisibility(role) {
    // Any element with data-roles="doctor,admin" etc.
    $$("[data-roles]").forEach(el => {
      const allowed = (el.getAttribute("data-roles") || "")
        .split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
      el.style.display = allowed.includes(role) ? "" : "none";
    });
  }

  function mountShell(role) {
    const cfg = ROLES[role];

    // role chip
    const chip = $("#scRoleChip");
    if (chip) chip.textContent = cfg.badge;

    // title
    const ttl = $("#scRoleTitle");
    if (ttl) ttl.textContent = cfg.label;

    // primary action
    const pa = $("#scPrimaryAction");
    if (pa) {
      pa.textContent = cfg.primary.text;
      pa.setAttribute("href", cfg.primary.href);
      pa.setAttribute("data-role", role);
    }

    // nav
    const nav = $("#scNav");
    if (nav) {
      nav.innerHTML = cfg.nav.map(item => `
        <a class="sc-nav-item" href="${item.href}">
          <span class="sc-nav-ico">•</span>
          <span>${item.text}</span>
        </a>
      `).join("");
    }

    // quick actions
    const qa = $("#scQuick");
    if (qa) {
      qa.innerHTML = cfg.quick.map(q => {
        if (q.kind === "link") {
          return `<a class="sc-qa" href="${q.href}">${q.text}</a>`;
        }
        return `<button class="sc-qa" data-action="${q.id}">${q.text}</button>`;
      }).join("");
    }

    // status
    const st = $("#scStatus");
    if (st) st.textContent = "🟢 Ready";

    applyRoleVisibility(role);
  }

  function bindGlobalActions(role) {
    const cfg = ROLES[role];

    // Quick action buttons
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-action");

      // Minimal demo actions (you can wire BUS here)
      if (id === "qRequest") return alert("تم فتح نموذج طلب زيارة (اربطه بإنشاء Request عبر BUS)");
      if (id === "qReport") return alert("فتح نموذج بلاغ بسيط (Student)");
      if (id === "qOpenLatest") return alert("فتح آخر طلب (Doctor) — اربطه بـ SCBUS.load().requests[0]");
      if (id === "qNewDx") return alert("إنشاء تشخيص جديد (Doctor)");
      if (id === "qKPIs") return alert("مؤشرات اليوم (Admin)");
      if (id === "qLatestAlert") return alert("أحدث تنبيه (Admin)");
      if (id === "qConsent") return alert("موافقة/رفض (Parent)");
      if (id === "qCall") return alert("طلب تواصل (Parent)");
    });

    // Role switcher (for demo only)
    const sw = $("#scRoleSwitch");
    if (sw) {
      sw.addEventListener("change", () => {
        const r = sw.value;
        setRole(r);
        location.href = ROLES[r].home;
      });
    }
  }

  // Public mount
  window.SCRBAC = {
    mount() {
      const role = getRole();
      mountShell(role);
      bindGlobalActions(role);

      // keep role switch value
      const sw = $("#scRoleSwitch");
      if (sw) sw.value = role;
    }
  };
})();

/* ===========================================================
   rbac.js
   - Role Based Access Control (RBAC)
   - Controls buttons by: data-action + data-allow
   - Exposes: window.RBAC
   =========================================================== */

(function () {
  const ROLES = {
    student: "student",
    doctor: "doctor",
    admin: "admin",
    parent: "parent",
  };

  /** ✅ الصلاحيات (عدّلها براحتك) */
  const PERMS = {
    student: [
      "visit.create",
      "triage.run",
      "cases.view.mine",
      "report.view.mine",
      "notify.send",
      "profile.view",
      "profile.update",
      "help.open",
      "logout",
    ],
    doctor: [
      "cases.view.all",
      "case.open",
      "case.update",
      "case.decide",
      "triage.override",
      "report.write",
      "report.view.all",
      "followup.create",
      "audit.view",
      "help.open",
      "logout",
    ],
    admin: [
      "requests.view",
      "requests.approve",
      "requests.reject",
      "cases.view.all",
      "case.assign",
      "users.view",
      "users.invite",
      "roles.manage",
      "heatmap.view",
      "audit.view",
      "settings.manage",
      "help.open",
      "logout",
    ],
    parent: [
      "child.link",
      "child.view",
      "cases.view.child",
      "report.view.child",
      "consent.manage",
      "notify.read",
      "help.open",
      "logout",
    ],
  };

  /** alias actions => perms */
  const ACTION_TO_PERM = {
    // student
    "btnVisit": "visit.create",
    "btnTriage": "triage.run",
    "btnMyCases": "cases.view.mine",
    "btnMyReport": "report.view.mine",
    "btnNotify": "notify.send",

    // doctor
    "btnCases": "cases.view.all",
    "btnOpenCase": "case.open",
    "btnUpdateCase": "case.update",
    "btnDecision": "case.decide",
    "btnFollowup": "followup.create",
    "btnAudit": "audit.view",

    // admin
    "btnRequests": "requests.view",
    "btnApprove": "requests.approve",
    "btnReject": "requests.reject",
    "btnAssign": "case.assign",
    "btnUsers": "users.view",
    "btnInvite": "users.invite",
    "btnRoles": "roles.manage",
    "btnHeatmap": "heatmap.view",
    "btnSettings": "settings.manage",

    // parent
    "btnLinkChild": "child.link",
    "btnChildCases": "cases.view.child",
    "btnChildReport": "report.view.child",
    "btnConsent": "consent.manage",

    // common
    "btnHelp": "help.open",
    "btnLogout": "logout",
  };

  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  function getRoleFromPage() {
    // الأولوية: body[data-page] ثم localStorage ROLE
    const bodyRole = document.body?.getAttribute("data-page");
    const stored = localStorage.getItem("ROLE");
    return (bodyRole || stored || "student").toLowerCase();
  }

  function setRole(role) {
    role = (role || "").toLowerCase();
    if (!PERMS[role]) role = "student";
    localStorage.setItem("ROLE", role);
    // كمان نخليه attribute عشان CSS if needed
    document.documentElement.setAttribute("data-role", role);
    return role;
  }

  function hasPerm(role, perm) {
    role = (role || "student").toLowerCase();
    const list = PERMS[role] || [];
    return list.includes(perm);
  }

  function getPermForEl(el) {
    // 1) data-allow="perm.name"
    const allow = el.getAttribute("data-allow");
    if (allow) return allow.trim();

    // 2) data-action="btnSomething"
    const act = el.getAttribute("data-action") || el.id;
    if (act && ACTION_TO_PERM[act]) return ACTION_TO_PERM[act];

    return null;
  }

  function lockEl(el, reason = "لا تملك صلاحية") {
    el.classList.add("isDisabled");
    el.setAttribute("aria-disabled", "true");
    el.setAttribute("data-disabled-reason", reason);
    // لبعض العناصر اللي مو button
    if ("disabled" in el) el.disabled = true;
    el.style.pointerEvents = "none";
    el.style.opacity = "0.55";
    el.style.filter = "grayscale(15%)";

    // tooltip بسيط
    el.title = reason;
  }

  function unlockEl(el) {
    el.classList.remove("isDisabled");
    el.removeAttribute("aria-disabled");
    el.removeAttribute("data-disabled-reason");
    if ("disabled" in el) el.disabled = false;
    el.style.pointerEvents = "";
    el.style.opacity = "";
    el.style.filter = "";
    el.title = "";
  }

  function applyRBAC(root = document) {
    const role = setRole(getRoleFromPage());

    // كل زر/عنصر له data-allow أو data-action
    const items = root.querySelectorAll("[data-allow],[data-action],button[id],a[id]");
    items.forEach((el) => {
      const perm = getPermForEl(el);
      if (!perm) return;

      if (hasPerm(role, perm)) unlockEl(el);
      else lockEl(el, `صلاحية مطلوبة: ${perm}`);
    });

    // عناصر خاصة: data-role-only="admin,doctor"
    root.querySelectorAll("[data-role-only]").forEach((el) => {
      const allowRoles = el.getAttribute("data-role-only")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

      if (allowRoles.includes(role)) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });

    return role;
  }

  /** زر سريع لتبديل الدور (للتجربة فقط) */
  function mountRoleSwitcher() {
    const host = document.querySelector("[data-role-switcher]");
    if (!host) return;

    host.innerHTML = `
      <div class="roleSwitch">
        <span class="roleLabel">الدور:</span>
        <select id="roleSel">
          <option value="student">طالب</option>
          <option value="doctor">طبيب</option>
          <option value="admin">الإدارة</option>
          <option value="parent">ولي الأمر</option>
        </select>
        <button class="btn ghost" id="btnRoleApply">تطبيق</button>
      </div>
    `;

    const sel = host.querySelector("#roleSel");
    sel.value = getRoleFromPage();

    host.querySelector("#btnRoleApply").addEventListener("click", () => {
      setRole(sel.value);
      applyRBAC();
      // لو تبغى يعيد تحميل الصفحة: location.reload();
      if (window.FB?.logSession) window.FB.logSession({ page: document.body?.getAttribute("data-page") || "unknown", role: sel.value });
    });
  }

  /** API */
  window.RBAC = {
    ROLES,
    PERMS,
    ACTION_TO_PERM,
    getRoleFromPage,
    setRole,
    hasPerm,
    applyRBAC,
    mountRoleSwitcher,
  };

  document.addEventListener("DOMContentLoaded", () => {
    // تطبيق تلقائي
    applyRBAC();

    // إذا حاط data-role-switcher بالصفحة نفعّله
    mountRoleSwitcher();

    // سجّل جلسة بالدور الحالي (اختياري)
    if (window.FB?.logSession) {
      const role = getRoleFromPage();
      const page = document.body?.getAttribute("data-page") || "unknown";
      window.FB.logSession({ page, role });
    }
  });
})();

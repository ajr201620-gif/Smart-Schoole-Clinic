(() => {
  "use strict";

  const ROLES = [
    { key: "student", label: "طالب" },
    { key: "doctor",  label: "طبيب" },
    { key: "admin",   label: "إدارة" },
    { key: "parent",  label: "ولي أمر" },
  ];

  const roleHome = (role) => {
    switch (role) {
      case "student": return "student.html";
      case "doctor":  return "doctor.html";
      case "admin":   return "admin.html";
      case "parent":  return "parent.html";
      default: return "index.html";
    }
  };

  const setRole = (role, name) => {
    const ok = ROLES.some(r => r.key === role);
    if (!ok) role = "guest";
    SSC.updateDB((db) => {
      db.user.role = role;
      db.user.name = name || db.user.name || "مستخدم";
      return db;
    });
    SSC.audit("auth.setRole", { role, name: name || "" });
    SSC.toast("تم اختيار البوابة", `تم دخول بوابة: ${role}`);
    window.location.href = roleHome(role);
  };

  const getRole = () => SSC.getDB().user?.role || "guest";

  // Permission matrix
  const can = (perm) => {
    const role = getRole();
    const map = {
      student: new Set([
        "case.create",
        "case.simulateSensors",
        "triage.run",
        "visit.request",
        "report.viewSelf"
      ]),
      doctor: new Set([
        "case.viewAll",
        "case.requestRecheck",
        "triage.run",
        "visit.accept",
        "visit.reject",
        "visit.join",
        "visit.inviteParent",
        "slip.issue",
        "protocols.view",
        "copilot.ask"
      ]),
      admin: new Set([
        "dash.view",
        "cases.viewAll",
        "slips.viewAll",
        "audit.view"
      ]),
      parent: new Set([
        "consent.manage",
        "visit.join",
        "report.viewChild"
      ])
    };
    return map[role]?.has(perm) || false;
  };

  window.SSC_AUTH = { ROLES, setRole, getRole, roleHome, can };
})();

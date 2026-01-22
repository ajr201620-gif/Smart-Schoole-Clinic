/* =========================================================
   RBAC Demo — Smart Clinic OS
   Roles: staff, school, student, parent
   GitHub Pages friendly (localStorage)
   ========================================================= */

(() => {
  "use strict";

  const ROLE_KEY = "sc_role";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // صلاحيات حسب الدور (مبسطة)
  const PERMS = {
    staff:   { dashboard:1, triage:1, alerts:1, reports:1, iot:1, about:1, manageUsers:0, viewSensitive:1 },
    school:  { dashboard:1, triage:0, alerts:1, reports:1, iot:0, about:1, manageUsers:1, viewSensitive:0 },
    student: { dashboard:0, triage:1, alerts:0, reports:0, iot:0, about:1, manageUsers:0, viewSensitive:0 },
    parent:  { dashboard:0, triage:0, alerts:1, reports:1, iot:0, about:1, manageUsers:0, viewSensitive:1 }
  };

  function getRole(){
    return localStorage.getItem(ROLE_KEY) || "school"; // افتراضي: إدارة
  }

  function setRole(role){
    localStorage.setItem(ROLE_KEY, role);
    applyRBAC();
  }

  function roleLabel(role){
    return role === "staff" ? "العيادة (طبيب/تمريض)"
      : role === "school" ? "إدارة المدرسة"
      : role === "student" ? "طالب"
      : role === "parent" ? "ولي أمر"
      : role;
  }

  function ensureRoleSwitchUI(){
    // زر صغير أعلى اليمين للتبديل (Demo)
    const top = document.querySelector(".topbar .top-actions");
    if(!top) return;

    if($("#roleSwitch")) return;

    const wrap = document.createElement("div");
    wrap.id = "roleSwitch";
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";

    const pill = document.createElement("div");
    pill.className = "badge";
    pill.id = "rolePill";
    pill.textContent = "Role: —";

    const sel = document.createElement("select");
    sel.id = "roleSelect";
    sel.style.padding = "10px 12px";
    sel.style.borderRadius = "14px";
    sel.style.border = "1px solid var(--stroke)";
    sel.style.background = "var(--panel)";
    sel.style.color = "var(--text)";
    sel.innerHTML = `
      <option value="staff">العيادة (طبيب/تمريض)</option>
      <option value="school">إدارة المدرسة</option>
      <option value="student">طالب</option>
      <option value="parent">ولي أمر</option>
    `;

    sel.value = getRole();
    sel.addEventListener("change", () => setRole(sel.value));

    wrap.appendChild(pill);
    wrap.appendChild(sel);

    // دخّله قبل زر الديمو
    const demoBtn = $("#btnQuickDemo");
    if(demoBtn) top.insertBefore(wrap, demoBtn);
    else top.appendChild(wrap);
  }

  function allow(view){
    const role = getRole();
    const p = PERMS[role] || PERMS.school;
    return !!p[view];
  }

  function applyRBAC(){
    ensureRoleSwitchUI();

    const role = getRole();
    const pill = $("#rolePill");
    if(pill) pill.textContent = "الدور: " + roleLabel(role);

    // اخفاء/اظهار أزرار القائمة حسب الدور
    $$(".nav-item").forEach(btn => {
      const v = btn.dataset.view; // dashboard/triage/alerts/reports/iot/about
      btn.style.display = allow(v) ? "" : "none";
    });

    // إذا المستخدم واقف على صفحة ممنوعة، نحوله لأول صفحة مسموحة
    const active = $(".nav-item.active")?.dataset.view || "dashboard";
    if(!allow(active)){
      const first = $$(".nav-item").find(b => b.style.display !== "none");
      first?.click();
    }

    // إخفاء عناصر حساسة (أمثلة)
    // - بروتوكول/ملاحظات سريرية: للعيادة وولي الأمر فقط
    const canSensitive = (PERMS[role] || PERMS.school).viewSensitive;

    // في صفحة التقارير: اخفِ فقرة "ملاحظات" للمدرسة/الطالب
    const reportBox = $("#reportBox");
    if(reportBox){
      reportBox.style.filter = canSensitive ? "none" : "blur(3px)";
      reportBox.title = canSensitive ? "" : "محتوى حساس — مخفي حسب الصلاحيات (Demo)";
    }

    // في triage: المدرسة/ولي الأمر ما يشوفونها أساسًا
    // في alerts: الطالب ما يشوفها

    // تحديث شارة النظام
    const st = $("#sysStatus");
    if(st) st.textContent = "System: Role applied (" + roleLabel(role) + ")";
    try{ window.ClinicEngine?.log?.("RBAC applied: " + role, "info"); }catch(_){}
  }

  // init
  window.SCRBAC = { getRole, setRole, applyRBAC };
  document.addEventListener("DOMContentLoaded", applyRBAC);
})();

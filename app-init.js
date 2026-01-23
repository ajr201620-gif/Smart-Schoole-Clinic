document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Smart Clinic OS booting...");

  // تأكيد تحميل الوحدات
  if (window.Auth) Auth.init();
  if (window.Bus) Bus.init();

  // تحديد الدور
  const role = localStorage.getItem("role") || "student";
  document.body.dataset.role = role;

  // تفعيل الواجهات حسب الدور
  if (role === "student" && window.StudentUI) StudentUI.init();
  if (role === "doctor" && window.DoctorUI) DoctorUI.init();
  if (role === "admin" && window.AdminUI) AdminUI.init();
  if (role === "parent" && window.ParentUI) ParentUI.init();

  console.log("✅ UI Ready for role:", role);
});

/* =========================================================
   Smart School Clinic OS — Auth/Role (Static)
   - Stores role in localStorage
   - Guards role pages
   ========================================================= */

(function(){
  const ROLE_KEY = "SC_ROLE";
  const LAST_KEY = "SC_LAST_ROLE";

  const ROLES = ["student","doctor","admin","parent"];

  function getRole(){
    return (localStorage.getItem(ROLE_KEY) || "").toLowerCase();
  }

  function setRole(role){
    role = (role || "").toLowerCase();
    if(!ROLES.includes(role)) return false;
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(LAST_KEY, role);
    return true;
  }

  function clearRole(){
    localStorage.removeItem(ROLE_KEY);
  }

  function requireRole(required){
    const current = getRole();
    if(current === required) return true;

    // Allow if role passed via query (?role=doctor)
    try{
      const qs = new URLSearchParams(location.search);
      const qRole = (qs.get("role")||"").toLowerCase();
      if(qRole && ROLES.includes(qRole)){
        setRole(qRole);
        return qRole === required;
      }
    }catch(_){}

    // Redirect to index if missing/wrong
    location.href = "index.html";
    return false;
  }

  function roleToHome(role){
    const map = {
      student:"student.html",
      doctor:"doctor.html",
      admin:"admin.html",
      parent:"parent.html"
    };
    return map[role] || "index.html";
  }

  function goHome(){
    const r = getRole();
    location.href = roleToHome(r);
  }

  // Auto-guard per page based on filename (optional)
  function autoGuard(){
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    if(file === "student.html") requireRole("student");
    if(file === "doctor.html")  requireRole("doctor");
    if(file === "admin.html")   requireRole("admin");
    if(file === "parent.html")  requireRole("parent");
  }

  window.SCAUTH = {
    ROLES,
    getRole,
    setRole,
    clearRole,
    requireRole,
    roleToHome,
    goHome,
    autoGuard
  };

  // Run on load for role pages
  try{ autoGuard(); }catch(_){}
})();

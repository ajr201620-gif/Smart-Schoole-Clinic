/* =========================================================
   Audit + Users (Demo) — Smart Clinic OS
   - Audit log persisted in localStorage
   - Admin-only Users & Roles page (Demo)
   - Hooks into actions without breaking existing code
   ========================================================= */

(() => {
  "use strict";

  const AUDIT_KEY = "sc_audit_log";
  const USERS_KEY = "sc_users_demo";
  const ROLE_KEY  = "sc_role";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const pad2 = (n)=> String(n).padStart(2,"0");
  const ts = ()=>{
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  function role(){ return localStorage.getItem(ROLE_KEY) || "school"; }

  function loadAudit(){
    try{
      const x = localStorage.getItem(AUDIT_KEY);
      return x ? JSON.parse(x) : [];
    }catch(_){ return []; }
  }
  function saveAudit(rows){
    localStorage.setItem(AUDIT_KEY, JSON.stringify(rows.slice(0, 200)));
  }

  function audit(action, meta={}){
    const entry = {
      t: ts(),
      role: role(),
      action,
      meta
    };
    const rows = loadAudit();
    rows.unshift(entry);
    saveAudit(rows);

    // Mirror into engine log if exists
    try{ window.ClinicEngine?.log?.(`AUDIT: ${action}`, "info"); }catch(_){}

    // Refresh UI if visible
    try{ renderAuditTable(); }catch(_){}
  }

  // Seed demo users
  function loadUsers(){
    try{
      const x = localStorage.getItem(USERS_KEY);
      if(x) return JSON.parse(x);
    }catch(_){}
    const users = [
      { id:"U-CLN-01", name:"طاقم العيادة", role:"staff", scope:"مدرسة A", status:"Active" },
      { id:"U-ADM-01", name:"إدارة المدرسة", role:"school", scope:"مدرسة A", status:"Active" },
      { id:"U-STD-23", name:"طالب #23", role:"student", scope:"مدرسة A", status:"Active" },
      { id:"U-PAR-23", name:"ولي أمر #23", role:"parent", scope:"مدرسة A", status:"Active" }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }

  function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function roleLabel(r){
    return r==="staff" ? "العيادة"
      : r==="school" ? "إدارة"
      : r==="student" ? "طالب"
      : r==="parent" ? "ولي أمر" : r;
  }

  /* ---------------- Add Admin Nav Item ---------------- */
  function addAdminNav(){
    // يظهر فقط لدور school
    if(role() !== "school") return;

    const nav = $(".nav");
    if(!nav) return;

    if($(`.nav-item[data-view="users"]`)) return;

    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.view = "users";
    btn.innerHTML = `<span class="ico">👥</span><span>Users & Roles</span>`;
    nav.appendChild(btn);
  }

  /* ---------------- Add Users View ---------------- */
  function addUsersView(){
    // view container
    const views = $(".views");
    if(!views) return;

    if($("#view-users")) return;

    const v = document.createElement("section");
    v.className = "view";
    v.id = "view-users";

    v.innerHTML = `
      <div class="section-head">
        <div>
          <h2>إدارة المستخدمين والصلاحيات</h2>
          <div class="muted">Demo — لإظهار مفهوم RBAC والتدقيق</div>
        </div>
        <div class="section-actions">
          <button class="btn" id="btnAddUser">إضافة مستخدم (Demo)</button>
          <button class="btn ghost" id="btnExportUsers">تصدير Users</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <h3>Users</h3>
            <div class="muted small">نطاق المدرسة</div>
          </div>
          <div class="table" id="usersTable"></div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Audit Log</h3>
            <div class="muted small">آخر 40 حدث</div>
          </div>
          <div class="table" id="auditTable"></div>
          <div class="card-actions">
            <button class="btn ghost" id="btnClearAudit">مسح السجل</button>
            <button class="btn" id="btnExportAudit">تصدير Audit</button>
          </div>
        </div>
      </div>
    `;

    views.appendChild(v);
  }

  /* ---------------- Render Tables ---------------- */
  function renderUsersTable(){
    const box = $("#usersTable");
    if(!box) return;

    const users = loadUsers();

    box.innerHTML = `
      <div class="trow thead">
        <div>ID</div><div>الاسم</div><div>الدور</div><div>النطاق</div><div>الحالة</div>
      </div>
      ${users.map(u => `
        <div class="trow">
          <div class="muted">${u.id}</div>
          <div><b>${u.name}</b></div>
          <div><span class="badge">${roleLabel(u.role)}</span></div>
          <div>${u.scope}</div>
          <div><span class="st ${u.status==="Active" ? "done" : "follow"}">${u.status}</span></div>
        </div>
      `).join("")}
    `;
  }

  function renderAuditTable(){
    const box = $("#auditTable");
    if(!box) return;

    const rows = loadAudit().slice(0, 40);

    if(!rows.length){
      box.innerHTML = `<div class="empty">لا يوجد سجل حتى الآن</div>`;
      return;
    }

    box.innerHTML = `
      <div class="trow thead">
        <div>الوقت</div><div>الدور</div><div>الحدث</div><div colspan="2">تفاصيل</div>
      </div>
      ${rows.map(r => `
        <div class="trow">
          <div class="muted">${r.t}</div>
          <div><span class="badge">${roleLabel(r.role)}</span></div>
          <div><b>${r.action}</b></div>
          <div class="muted" style="grid-column:4 / -1;">${escapeMeta(r.meta)}</div>
        </div>
      `).join("")}
    `;
  }

  function escapeMeta(meta){
    try{
      const s = JSON.stringify(meta);
      return s.length > 140 ? s.slice(0, 140) + "…" : s;
    }catch(_){
      return "—";
    }
  }

  /* ---------------- Bind actions ---------------- */
  function bindAdminActions(){
    $("#btnAddUser")?.addEventListener("click", ()=>{
      const users = loadUsers();
      const id = `U-NEW-${Math.floor(Math.random()*900+100)}`;
      users.unshift({ id, name:"مستخدم جديد", role:"student", scope:"مدرسة A", status:"Active" });
      saveUsers(users);
      renderUsersTable();
      audit("USER_ADDED", { id, role:"student" });
    });

    $("#btnExportUsers")?.addEventListener("click", ()=>{
      const users = loadUsers();
      download("users.json", JSON.stringify(users, null, 2));
      audit("USERS_EXPORTED", { count: users.length });
    });

    $("#btnClearAudit")?.addEventListener("click", ()=>{
      localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
      renderAuditTable();
      audit("AUDIT_CLEARED", {});
    });

    $("#btnExportAudit")?.addEventListener("click", ()=>{
      const rows = loadAudit();
      download("audit.json", JSON.stringify(rows, null, 2));
      audit("AUDIT_EXPORTED", { count: rows.length });
    });
  }

  function download(filename, text){
    const blob = new Blob([text], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  /* ---------------- Hook existing buttons to audit ---------------- */
  function hookCommonActions(){
    // Role switch auditing (if roleSelect exists)
    const sel = $("#roleSelect");
    if(sel){
      sel.addEventListener("change", ()=>{
        audit("ROLE_SWITCH", { to: sel.value });
      });
    }

    // Engine sync
    $("#btnSyncSensors")?.addEventListener("click", ()=> audit("SENSORS_SYNC_CLICK", {}));
    // Some portals buttons (if present)
    $("#pStaffSync")?.addEventListener("click", ()=> audit("SENSORS_SYNC_CLICK", { from:"staffPortal" }));
    $("#pSchoolExport")?.addEventListener("click", ()=> audit("ADMIN_EXPORT_CLICK", {}));
    $("#pParentAck")?.addEventListener("click", ()=> audit("PARENT_ACK", {}));
    $("#pParentConsent")?.addEventListener("click", ()=> audit("PARENT_CONSENT", {}));
  }

  /* ---------------- Ensure view switching includes new view ---------------- */
  function rebindNavForNewItems(){
    // your nav init is in script.js, but new button appended later needs handler.
    // We'll attach a delegated click on .nav (safe)
    const nav = $(".nav");
    if(!nav) return;
    if(nav.dataset.delegated === "1") return;
    nav.dataset.delegated = "1";

    nav.addEventListener("click", (e)=>{
      const btn = e.target.closest(".nav-item");
      if(!btn) return;

      $$(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.dataset.view;
      $$(".view").forEach(v => v.classList.remove("show"));
      $(`#view-${view}`)?.classList.add("show");

      audit("NAV_OPEN", { view });
      // render tables when opening users page
      if(view === "users"){
        renderUsersTable();
        renderAuditTable();
      }
    });
  }

  function init(){
    // Seed data
    loadUsers();

    // Only show admin user management for school role
    addAdminNav();
    addUsersView();
    rebindNavForNewItems();

    // initial renders if currently on users view
    renderUsersTable();
    renderAuditTable();

    bindAdminActions();
    hookCommonActions();

    audit("APP_BOOT", { page: location.pathname || "index", theme: document.documentElement.dataset.theme || "dark" });
  }

  document.addEventListener("DOMContentLoaded", init);

  // expose audit for others
  window.SCAUDIT = { audit };
})();

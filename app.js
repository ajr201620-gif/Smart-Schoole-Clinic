// SSC V3 app.js — role routing + mode toggle
(function(){
  const $=(s,r=document)=>r.querySelector(s);

  const MODE_KEY="SSC_MODE";
  const DEFAULT_MODE="dark";

  function setMode(mode){
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem(MODE_KEY, mode);
  }

  function initMode(){
    const saved = localStorage.getItem(MODE_KEY) || DEFAULT_MODE;
    setMode(saved);
    const btn = $("#btnMode");
    if(btn) btn.textContent = saved === "dark" ? "☀️" : "🌙";
  }

  function toggleMode(){
    const cur = document.documentElement.getAttribute("data-mode") || DEFAULT_MODE;
    const next = cur === "dark" ? "light" : "dark";
    setMode(next);
    const btn = $("#btnMode");
    if(btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
  }

  function setRole(role){
    localStorage.setItem("ROLE", role);
  }

  function setName(){
    const name = localStorage.getItem("USER_NAME") || "زائر";
    document.querySelectorAll("[data-user-name]").forEach(el=>el.textContent=name);
  }

  function go(role){
    const map = { student:"student.html", doctor:"doctor.html", admin:"admin.html", parent:"parent.html" };
    setRole(role);
    location.href = map[role] || "index.html";
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // default mode attribute
    if(!document.documentElement.getAttribute("data-mode")){
      document.documentElement.setAttribute("data-mode", DEFAULT_MODE);
    }
    initMode();
    setName();

    $("#btnMode")?.addEventListener("click", toggleMode);

    const nameInput = $("#nameInput");
    const btnSaveName = $("#btnSaveName");
    if(nameInput) nameInput.value = localStorage.getItem("USER_NAME") || "";
    btnSaveName?.addEventListener("click", ()=>{
      const v = (nameInput?.value || "").trim();
      if(!v) return alert("اكتب اسمك");
      localStorage.setItem("USER_NAME", v);
      setName();
    });

    document.querySelectorAll("[data-go-role]").forEach(el=>{
      el.addEventListener("click", ()=>go(el.dataset.goRole));
      el.setAttribute("tabindex","0");
      el.addEventListener("keydown",(e)=>{
        if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(el.dataset.goRole); }
      });
    });
  });
})();

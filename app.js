// SSC V2 app.js — simple role routing
(function(){
  const $=(s,r=document)=>r.querySelector(s);

  function setRole(role){
    localStorage.setItem("ROLE", role);
  }
  function setName(){
    const name = localStorage.getItem("USER_NAME") || "زائر";
    document.querySelectorAll("[data-user-name]").forEach(el=>el.textContent=name);
  }

  function go(role){
    const map = {
      student: "student.html",
      doctor: "doctor.html",
      admin: "admin.html",
      parent: "parent.html"
    };
    setRole(role);
    location.href = map[role] || "index.html";
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    setName();

    // quick set name
    const nameInput = $("#nameInput");
    const btnSaveName = $("#btnSaveName");
    if(nameInput){
      nameInput.value = localStorage.getItem("USER_NAME") || "";
    }
    btnSaveName?.addEventListener("click", ()=>{
      const v = (nameInput?.value || "").trim();
      if(!v) return alert("اكتب اسمك");
      localStorage.setItem("USER_NAME", v);
      setName();
      alert("تم ✅");
    });

    // role cards
    document.querySelectorAll("[data-go-role]").forEach(el=>{
      el.addEventListener("click", ()=>go(el.dataset.goRole));
    });
  });
})();

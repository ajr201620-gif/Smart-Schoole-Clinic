// ui.js — Theme switcher for data-ui
(function(){
  const KEY="UI_MODE";
  const order=["pro","clean","neo"];

  function apply(v){
    document.documentElement.setAttribute("data-ui", v);
    localStorage.setItem(KEY, v);
  }

  function init(){
    const saved = localStorage.getItem(KEY) || "pro";
    apply(saved);

    document.addEventListener("click", (e)=>{
      const btn = e.target.closest?.("[data-ui-toggle]");
      if(!btn) return;
      const cur = document.documentElement.getAttribute("data-ui") || "pro";
      const idx = order.indexOf(cur);
      const next = order[(idx+1+order.length)%order.length];
      apply(next);
      btn.textContent = next === "pro" ? "PRO" : next === "clean" ? "CLEAN" : "NEO";
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();

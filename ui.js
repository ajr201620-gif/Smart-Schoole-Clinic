// ui.js — tiny premium polish (reveal + auto tag)
(() => {
  const reveal = () => {
    document.querySelectorAll(".hero__left, .hero__right, .card").forEach((el) => {
      el.setAttribute("data-reveal", "1");
    });
    requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]").forEach((el, i) => {
        setTimeout(() => el.classList.add("on"), 60 + i * 60);
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal);
  } else {
    reveal();
  }
})();

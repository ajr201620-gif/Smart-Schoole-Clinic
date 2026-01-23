/* ===========================================================
   Student Notification Banner
   =========================================================== */
(function(){
  const $ = (s)=>document.querySelector(s);
  function load(){ return window.SCBUS?.load?.() || {cases:[]}; }

  function latestCase(){
    const bus = load();
    return (bus.cases||[])[0] || null;
  }

  function message(c){
    if(!c) return null;
    switch(c.status){
      case "APPROVED_BY_PARENT":
        return { type:"ok", text:"✅ تمت موافقة ولي الأمر. سيتم تنفيذ الخطة الطبية." };
      case "REJECTED_BY_PARENT":
        return { type:"warn", text:"⛔ لم تتم الموافقة. تم تحويلك لمتابعة داخل المدرسة." };
      case "FOLLOW_UP":
        return { type:"info", text:"ℹ️ حالتك تحت المتابعة. الرجاء البقاء قريبًا من العيادة." };
      case "REFERRED":
        return { type:"danger", text:"🚨 حالتك تحتاج إحالة. الرجاء التوجه حسب التوجيهات." };
      case "VISIT_ENDED":
        return { type:"info", text:"📄 انتهت الزيارة. يمكنك الاطلاع على التقرير." };
      default:
        return null;
    }
  }

  function mount(){
    const c = latestCase();
    const msg = message(c);
    if(!msg) return;

    const banner = document.createElement("div");
    banner.style.cssText = `
      padding:12px 16px;
      border-radius:14px;
      margin-bottom:12px;
      font-weight:800;
      border:1px solid rgba(0,0,0,.08);
      background:
        ${msg.type==="ok" ? "#e6fffa" :
          msg.type==="warn" ? "#fff7ed" :
          msg.type==="danger" ? "#fee2e2" : "#eef2ff"};
    `;
    banner.textContent = msg.text;

    const root = document.getElementById("scPageContent") || document.body;
    root.prepend(banner);
  }

  window.SCSTUDENT = { mount };
})();

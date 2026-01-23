/* =========================================================
   Smart School Clinic OS — Student Status Notification
   - Shows a smart banner based on latest case status
   ========================================================= */

(function(){
  const $ = (s)=>document.querySelector(s);

  function loadBus(){
    try{
      return window.SCBUS?.load?.() || { cases: [] };
    }catch(e){
      return { cases: [] };
    }
  }

  function latestCase(){
    const bus = loadBus();
    return (bus.cases || [])[0] || null;
  }

  function statusMessage(c){
    if(!c) return null;

    switch(c.status){
      case "OPEN":
        return { type:"info", text:"ℹ️ تم استلام شكواك وجاري مراجعتها من الطبيب." };

      case "OPEN_VIRTUAL":
        return { type:"ok", text:"🎥 تم فتح زيارة افتراضية. الرجاء الدخول فورًا." };

      case "VISIT_ENDED":
        return { type:"info", text:"📄 انتهت الزيارة. يمكنك الاطلاع على التقرير." };

      case "CONSENT_REQUIRED":
        return { type:"warn", text:"⏳ بانتظار موافقة ولي الأمر على الإجراء." };

      case "APPROVED_BY_PARENT":
        return { type:"ok", text:"✅ تمت موافقة ولي الأمر. سيتم تنفيذ الخطة." };

      case "REJECTED_BY_PARENT":
        return { type:"warn", text:"⛔ لم تتم الموافقة. تم تحويلك للمتابعة داخل المدرسة." };

      case "FOLLOW_UP":
        return { type:"info", text:"🔄 حالتك تحت المتابعة. الرجاء البقاء قريبًا من العيادة." };

      case "REFERRED":
        return { type:"danger", text:"🚨 حالتك تحتاج إحالة. الرجاء اتباع التوجيهات فورًا." };

      default:
        return null;
    }
  }

  function bannerStyle(type){
    switch(type){
      case "ok":
        return "background:#0f766e;color:#e6fffa;border:1px solid #14b8a6";
      case "warn":
        return "background:#78350f;color:#fff7ed;border:1px solid #f59e0b";
      case "danger":
        return "background:#7f1d1d;color:#fee2e2;border:1px solid #ef4444";
      default:
        return "background:#1e293b;color:#e5e7eb;border:1px solid rgba(255,255,255,.15)";
    }
  }

  function mount(){
    const c = latestCase();
    const msg = statusMessage(c);
    if(!msg) return;

    const banner = document.createElement("div");
    banner.style.cssText = `
      ${bannerStyle(msg.type)};
      padding:14px 16px;
      border-radius:16px;
      font-weight:900;
      margin-bottom:14px;
      box-shadow:0 12px 30px rgba(0,0,0,.35);
    `;
    banner.textContent = msg.text;

    const root = $("#scPageContent") || document.body;
    root.prepend(banner);
  }

  window.SCSTUDENT = { mount };
})();

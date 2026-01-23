/* ===========================================================
   Permission Slip Generator (offline demo)
   - Creates an official slip object stored in BUS
   - Can generate printable HTML
   =========================================================== */
(function(){
  const esc = (x)=>String(x??"").replace(/[&<>"]/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));
  const now = ()=> new Date().toISOString();

  function loadBus(){ return window.SCBUS?.load?.() || {cases:[], requests:[], alerts:[], slips:[]}; }
  function saveBus(bus){ window.SCBUS?.save?.(bus); }

  function getCase(bus, caseId){
    return (bus.cases||[]).find(c=>String(c.id)===String(caseId)) || null;
  }

  function createSlip(caseId, actionLabel, extra={}){
    const bus = loadBus();
    const c = getCase(bus, caseId);
    if(!c) return null;

    bus.slips = bus.slips || [];

    const slip = {
      id: "SLIP-" + caseId + "-" + Date.now(),
      caseId: caseId,
      createdAt: now(),
      action: actionLabel || "موافقة إجراء",
      studentName: c.studentName || "طالب (Demo)",
      priority: c.priority || c.ai?.priority || "—",
      risk: (c.riskScore ?? c.ai?.risk ?? "—"),
      complaint: c.requestDesc || c.desc || c.complaint || "—",
      plan: c.plan || c.ai?.recommendation || "—",
      consent: c.consent || "APPROVED",
      ...extra
    };

    bus.slips.unshift(slip);

    // تنبيه الإدارة
    try{
      window.SCBUS.pushAlert("admin", "MED", "سند موافقة جديد", `Case ${caseId}`, { caseId, slipId: slip.id });
    }catch(_){}

    saveBus(bus);
    return slip;
  }

  function slipHTML(slip){
    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Permission Slip</title>
<style>
 body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f6f7fb;margin:0;padding:24px;color:#111}
 .paper{max-width:850px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:18px}
 .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
 .brand{font-weight:900;font-size:18px}
 .tag{font-size:12px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;background:#fafafa}
 .row{display:flex;gap:10px;padding:7px 0;border-bottom:1px dashed #eef0f4}
 .row:last-child{border-bottom:none}
 .k{min-width:160px;color:#6b7280;font-size:12px}
 .v{flex:1;font-size:12px;font-weight:700}
 pre{white-space:pre-wrap;margin:0;font-size:12px}
 .sig{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
 .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
 .muted{color:#6b7280;font-size:11px;margin-top:10px}
 @media print{body{background:#fff;padding:0}.paper{border:none;border-radius:0}}
</style>
</head>
<body>
<div class="paper">
  <div class="top">
    <div>
      <div class="brand">سند موافقة رسمي — Smart Clinic OS</div>
      <div class="muted">Slip: ${esc(slip.id)} • Created: ${esc(new Date(slip.createdAt).toLocaleString("ar-SA"))}</div>
    </div>
    <div class="tag">Consent: ${esc(slip.consent)}</div>
  </div>

  <div class="row"><div class="k">رقم الحالة</div><div class="v">${esc(slip.caseId)}</div></div>
  <div class="row"><div class="k">الطالب</div><div class="v">${esc(slip.studentName)}</div></div>
  <div class="row"><div class="k">الإجراء المطلوب</div><div class="v">${esc(slip.action)}</div></div>
  <div class="row"><div class="k">Priority / Risk</div><div class="v">${esc(slip.priority)} • ${esc(slip.risk)}/100</div></div>

  <h3 style="margin:16px 0 8px;font-size:14px">الشكوى</h3>
  <div class="box"><pre>${esc(slip.complaint)}</pre></div>

  <h3 style="margin:16px 0 8px;font-size:14px">الخطة</h3>
  <div class="box"><pre>${esc(slip.plan)}</pre></div>

  <div class="sig">
    <div class="box">
      <b>توقيع ولي الأمر</b>
      <div style="height:60px"></div>
      <div class="muted">الاسم/التوقيع</div>
    </div>
    <div class="box">
      <b>اعتماد المدرسة</b>
      <div style="height:60px"></div>
      <div class="muted">الختم/التوقيع</div>
    </div>
  </div>

  <div class="muted">ملاحظة: هذا نموذج عرض (Demo).</div>
</div>
</body>
</html>`;
  }

  function openSlip(slip){
    const html = slipHTML(slip);
    const w = window.open();
    if(w){ w.document.open(); w.document.write(html); w.document.close(); }
  }

  window.SCSLIP = { createSlip, openSlip };
})();

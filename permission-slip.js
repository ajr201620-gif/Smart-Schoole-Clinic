/* =========================================================
   Smart School Clinic OS — Permission Slip Generator
   - Creates printable consent slip
   - Opens in new window (no backend)
   ========================================================= */

(function(){
  const KEY = "SC_SLIPS";

  function load(){
    try{
      return JSON.parse(localStorage.getItem(KEY)) || [];
    }catch(e){
      return [];
    }
  }

  function save(list){
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function createSlip(caseId, title, payload={}){
    const slips = load();
    const slip = {
      id: "SLIP-" + Date.now(),
      caseId,
      title,
      guardianName: payload.guardianName || "—",
      guardianPhone: payload.guardianPhone || "—",
      signedAt: payload.signedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    slips.unshift(slip);
    save(slips);
    return slip;
  }

  function slipHTML(slip){
    const esc = (x)=>String(x??"").replace(/[&<>"]/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));
    return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>سند موافقة رسمي</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f6f7fb;color:#111;margin:0;padding:24px}
.paper{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:18px}
.brand{font-weight:900;font-size:18px}
.sub{color:#6b7280;font-size:12px;margin-top:4px}
.row{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #eef0f4}
.row:last-child{border-bottom:none}
.k{min-width:160px;color:#6b7280;font-size:12px}
.v{flex:1;font-size:13px;font-weight:700}
.notice{margin-top:14px;font-size:12px;color:#374151}
@media print{body{background:#fff;padding:0}.paper{border:none;border-radius:0}}
</style>
</head>
<body>
  <div class="paper">
    <div class="brand">Smart Clinic OS — سند موافقة</div>
    <div class="sub">وثيقة إلكترونية (Demo)</div>

    <div class="row"><div class="k">رقم السند</div><div class="v">${esc(slip.id)}</div></div>
    <div class="row"><div class="k">رقم الحالة</div><div class="v">${esc(slip.caseId)}</div></div>
    <div class="row"><div class="k">العنوان</div><div class="v">${esc(slip.title)}</div></div>

    <div class="row"><div class="k">اسم ولي الأمر</div><div class="v">${esc(slip.guardianName)}</div></div>
    <div class="row"><div class="k">رقم الجوال</div><div class="v">${esc(slip.guardianPhone)}</div></div>
    <div class="row"><div class="k">وقت التوقيع</div><div class="v">${esc(new Date(slip.signedAt).toLocaleString("ar-SA"))}</div></div>

    <div class="notice">
      أقرّ أنا ولي الأمر بالموافقة الإلكترونية على الخطة/الإجراء المذكور في التقرير الطبي
      الخاص بالحالة أعلاه، وأتحمل المسؤولية النظامية لذلك.
    </div>

    <div class="notice" style="margin-top:18px">
      توقيع إلكتروني (Demo) — Smart School Clinic OS
    </div>
  </div>
</body>
</html>`;
  }

  function openSlip(slip){
    const w = window.open("", "_blank");
    if(!w) return;
    w.document.open();
    w.document.write(slipHTML(slip));
    w.document.close();
  }

  window.SCSLIP = {
    createSlip,
    openSlip
  };
})();

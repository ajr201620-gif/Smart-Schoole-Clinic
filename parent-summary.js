/* =========================================================
   Smart School Clinic OS — Parent Summary (Simple)
   ========================================================= */

(function(){
  function line(k,v){ return `${k}: ${v ?? "—"}`; }

  function sum(c){
    const v = c.vitals || {};
    const ai = c.ai || {};
    const status = c.status || "—";
    const pri = c.priority || ai.priority || "—";
    const risk = (c.riskScore ?? ai.risk ?? "—");
    const rec = c.decision || ai.recommendation || "—";
    const complaint = c.requestDesc || c.desc || c.complaint || "—";

    let nextStep = "متابعة الحالة داخل المدرسة حسب التوجيهات.";
    if(status === "CONSENT_REQUIRED") nextStep = "مطلوب موافقتك على الإجراء داخل التقرير الرسمي.";
    if(status === "OPEN_VIRTUAL") nextStep = "يرجى الدخول للزيارة الافتراضية إذا طُلب ذلك.";
    if(status === "REFERRED") nextStep = "يرجى التوجه حسب الإحالة/التوجيهات فورًا.";

    return [
      "📌 ملخص مبسط لولي الأمر",
      "—".repeat(42),
      line("رقم الحالة", c.id),
      line("اسم الطالب", c.studentName || "—"),
      "",
      "📝 الشكوى:",
      complaint,
      "",
      "📟 قراءات مختصرة:",
      line("الحرارة", v.temp ? (v.temp+"°C") : "—"),
      line("النبض", v.hr ? (v.hr+" bpm") : "—"),
      line("الأكسجين", v.spo2 ? (v.spo2+"%") : "—"),
      line("الضغط", v.bp || "—"),
      "",
      "🤖 التقدير الذكي:",
      line("الأولوية", pri),
      line("مستوى الخطورة", risk + "/100"),
      line("التوصية", rec),
      "",
      "✅ الخطوة التالية:",
      nextStep,
      "—".repeat(42),
      "ملاحظة: هذا نموذج عرض (Demo)."
    ].join("\n");
  }

  window.SCPARENT = { sum };
})();

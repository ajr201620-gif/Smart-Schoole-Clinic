/* =========================================================
   Smart School Clinic OS — Doctor Copilot (Offline Demo)
   - Generates summary + DDx + red flags + plan draft
   ========================================================= */

(function(){
  const up = (s)=> (s||"").toString().toUpperCase();

  function build(caseObj){
    const v = caseObj.vitals || {};
    const ai = caseObj.ai || {};
    const pri = caseObj.priority || ai.priority || "LOW";
    const risk = (caseObj.riskScore ?? ai.risk ?? 0);

    const redFlags = [];
    if(v.spo2 <= 93) redFlags.push("انخفاض الأكسجين");
    if(v.temp >= 39) redFlags.push("حمّى عالية");
    if(v.hr >= 130) redFlags.push("تسرّع شديد بالنبض");
    if((ai.flags||[]).includes("Respiratory")) redFlags.push("أعراض تنفسية");
    if((ai.flags||[]).includes("Neuro")) redFlags.push("علامات عصبية محتملة");

    const ddx = [];
    if(v.temp >= 38 && (caseObj.requestDesc||"").includes("تعب")) ddx.push("عدوى فيروسية/نزلة");
    if((caseObj.requestDesc||"").includes("صداع")) ddx.push("صداع توتري/جفاف");
    if((caseObj.requestDesc||"").includes("بطن") || (caseObj.requestDesc||"").includes("غثيان")) ddx.push("اضطراب هضمي/تسمم بسيط");
    if(v.spo2 <= 93) ddx.push("اشتباه مشكلة تنفسية/ربو");

    if(ddx.length===0) ddx.push("تقييم عام + متابعة");

    const plan = [];
    plan.push("قراءة ثانية إذا استمرت الأعراض أو كانت القراءات غير متسقة");
    plan.push("إرشاد صحي + سوائل + راحة");
    if(pri==="HIGH" || pri==="CRIT") plan.push("زيارة افتراضية عاجلة + إشعار ولي الأمر");
    if(pri==="CRIT") plan.push("تصعيد/إحالة حسب البروتوكول");

    const summaryLines = [];
    summaryLines.push("📌 ملخص Copilot للطبيب");
    summaryLines.push("—".repeat(44));
    summaryLines.push(`Case: ${caseObj.id}`);
    summaryLines.push(`Student: ${caseObj.studentName || "—"}`);
    summaryLines.push(`Complaint: ${caseObj.requestDesc || "—"}`);
    summaryLines.push("");
    summaryLines.push("Vitals:");
    summaryLines.push(`- Temp: ${v.temp ?? "—"}°C`);
    summaryLines.push(`- HR: ${v.hr ?? "—"} bpm`);
    summaryLines.push(`- SpO₂: ${v.spo2 ?? "—"}%`);
    summaryLines.push(`- BP: ${v.bp ?? "—"}`);
    summaryLines.push("");
    summaryLines.push(`AI: Priority=${pri} • Risk=${risk}/100`);
    summaryLines.push(`Recommendation: ${ai.recommendation || "—"}`);
    summaryLines.push("");
    summaryLines.push("🚩 Red Flags:");
    summaryLines.push(redFlags.length ? redFlags.map(x=>"• "+x).join("\n") : "• لا يوجد");
    summaryLines.push("");
    summaryLines.push("🧠 Differential Dx (DDx):");
    summaryLines.push(ddx.map(x=>"• "+x).join("\n"));
    summaryLines.push("");
    summaryLines.push("🧾 Plan Draft:");
    summaryLines.push(plan.map(x=>"• "+x).join("\n"));
    summaryLines.push("—".repeat(44));

    return {
      summary: summaryLines.join("\n"),
      redFlags,
      ddx,
      plan
    };
  }

  window.SCDocAI = { build };
})();

/* ===========================================================
   AI TRIAGE (client-side demo)
   - input: complaint + vitals
   - output: risk, priority, recommendation, flags
   =========================================================== */
(function(){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const has=(t,arr)=>arr.some(w=>t.includes(w));

  function triage({complaint="", vitals={}}){
    const txt = (complaint||"").toLowerCase();

    const temp = Number(vitals.temp ?? 0);
    const hr   = Number(vitals.hr ?? 0);
    const spo2 = Number(vitals.spo2 ?? 0);
    const bpS  = Number((vitals.bp||"").split("/")[0]||0);
    const bpD  = Number((vitals.bp||"").split("/")[1]||0);

    let risk = 10;
    const flags = [];

    // symptom keywords
    const resp = ["ضيق","تنفس","كحة","كتمة","صفير","ربو","اختناق","صدر"];
    const fever= ["حمى","حرارة","سخونة","قشعريرة"];
    const gi   = ["مغص","اسهال","إسهال","قيء","استفراغ","غثيان"];
    const neuro= ["دوخة","صداع","اغماء","إغماء","تشنج","تشوش","نوبة"];
    const pain = ["ألم","وجع","جرح","نزيف","كسر","التواء"];

    if (has(txt, resp))  { risk += 18; flags.push("Resp"); }
    if (has(txt, fever)) { risk += 10; flags.push("Fever"); }
    if (has(txt, gi))    { risk += 8;  flags.push("GI"); }
    if (has(txt, neuro)) { risk += 18; flags.push("Neuro"); }
    if (has(txt, pain))  { risk += 6;  flags.push("Pain"); }

    // vitals scoring (simple but believable)
    if (temp >= 39.5) risk += 30;
    else if (temp >= 38.5) risk += 22;
    else if (temp >= 37.6) risk += 10;

    if (hr >= 145) risk += 28;
    else if (hr >= 125) risk += 18;
    else if (hr >= 110) risk += 10;

    if (spo2 > 0 && spo2 <= 90) risk += 45;
    else if (spo2 > 0 && spo2 <= 93) risk += 32;
    else if (spo2 > 0 && spo2 <= 95) risk += 18;

    if (bpS && (bpS <= 90 || bpD <= 55)) risk += 15;
    if (bpS && (bpS >= 145 || bpD >= 95)) risk += 10;

    risk = clamp(Math.round(risk), 5, 100);

    let priority = "LOW";
    if (risk >= 80) priority = "CRIT";
    else if (risk >= 60) priority = "HIGH";
    else if (risk >= 35) priority = "MED";

    const recommendation =
      priority==="CRIT" ? "طارئ: تواصل فوري + احتمالية إحالة" :
      priority==="HIGH" ? "عالي: زيارة افتراضية للطبيب + إشعار ولي الأمر" :
      priority==="MED" ? "متوسط: متابعة عيادة مدرسية + إعادة قراءة عند الحاجة" :
      "منخفض: إرشاد صحي + راحة + متابعة ذاتية";

    const requireParentConsent = (priority==="HIGH" || priority==="CRIT");
    const suggestReRead = (priority==="MED" || priority==="HIGH");

    return { risk, priority, recommendation, flags, requireParentConsent, suggestReRead };
  }

  window.SCAI = { triage };
})();

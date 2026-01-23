/* =========================================================
   Smart School Clinic OS — AI Triage (Offline Demo)
   - Calculates Risk (0–100)
   - Determines Priority: LOW | MED | HIGH | CRIT
   - Generates Recommendation
   ========================================================= */

(function(){
  const clamp = (n, a, b)=> Math.max(a, Math.min(b, n));
  const low = (s)=> (s||"").toLowerCase();

  function scoreVitals(v){
    let s = 0;

    if(v.temp >= 39) s += 25;
    else if(v.temp >= 38) s += 15;
    else if(v.temp >= 37.5) s += 8;

    if(v.hr >= 130) s += 25;
    else if(v.hr >= 110) s += 15;
    else if(v.hr >= 100) s += 8;

    if(v.spo2 <= 90) s += 30;
    else if(v.spo2 <= 93) s += 20;
    else if(v.spo2 <= 95) s += 10;

    if(v.bp){
      const [sys] = v.bp.split("/").map(Number);
      if(sys >= 160 || sys <= 90) s += 10;
    }

    return s;
  }

  function scoreComplaint(text){
    const t = low(text);
    let s = 0;

    if(t.includes("ألم صدر") || t.includes("تنفس") || t.includes("ضيق")) s += 30;
    if(t.includes("إغماء") || t.includes("تشنج")) s += 30;
    if(t.includes("صداع شديد")) s += 20;
    if(t.includes("قيء") || t.includes("استفراغ") || t.includes("إسهال")) s += 10;
    if(t.includes("دوخة") || t.includes("تعب")) s += 5;

    return s;
  }

  function priorityFrom(risk){
    if(risk >= 80) return "CRIT";
    if(risk >= 60) return "HIGH";
    if(risk >= 35) return "MED";
    return "LOW";
  }

  function recommendation(priority){
    switch(priority){
      case "CRIT":
        return "تدخل عاجل + إشعار فوري للطبيب وولي الأمر";
      case "HIGH":
        return "زيارة افتراضية سريعة + قراءة ثانية";
      case "MED":
        return "متابعة وراحة + تقييم طبي";
      default:
        return "إرشاد صحي وراحة";
    }
  }

  function triage(vitals, complaint){
    const vScore = scoreVitals(vitals);
    const cScore = scoreComplaint(complaint);
    const risk = clamp(vScore + cScore, 0, 100);
    const priority = priorityFrom(risk);

    return {
      risk,
      priority,
      recommendation: recommendation(priority),
      flags: buildFlags(vitals, complaint)
    };
  }

  function buildFlags(v, text){
    const f = [];
    const t = low(text);

    if(v.temp >= 38.5) f.push("Fever");
    if(v.hr >= 120) f.push("Tachycardia");
    if(v.spo2 <= 93) f.push("LowSpO2");
    if(t.includes("تنفس") || t.includes("صدر")) f.push("Respiratory");
    if(t.includes("إغماء") || t.includes("تشنج")) f.push("Neuro");

    return f;
  }

  window.SCAI = { triage };
})();

(() => {
  "use strict";

  const scoreRisk = ({ hr, spo2, temp, bpSys, bpDia, complaintText }) => {
    let risk = 0;

    // Vitals heuristics (demo)
    if (hr >= 130 || hr <= 45) risk += 35;
    else if (hr >= 110 || hr <= 55) risk += 18;

    if (spo2 <= 92) risk += 40;
    else if (spo2 <= 95) risk += 18;

    if (temp >= 39.0) risk += 30;
    else if (temp >= 38.0) risk += 18;
    else if (temp <= 35.0) risk += 18;

    if (bpSys >= 160 || bpDia >= 110) risk += 25;
    else if (bpSys >= 140 || bpDia >= 95) risk += 14;

    const t = (complaintText || "").toLowerCase();
    const redFlags = ["ضيق", "تنفس", "إغماء", "نزيف", "تشنج", "ألم صدر", "حساسية شديدة", "تورم"];
    if (redFlags.some(k => t.includes(k.toLowerCase()))) risk += 20;

    return SSC.clamp(Math.round(risk), 0, 100);
  };

  const toPriority = (risk) => {
    if (risk >= 70) return { code: "critical", label: "حرج", color: "bad" };
    if (risk >= 45) return { code: "urgent", label: "عاجل", color: "warn" };
    return { code: "routine", label: "اعتيادي", color: "good" };
  };

  const recommendation = (risk, complaintText) => {
    if (risk >= 70) {
      return [
        "تقييم طبي عاجل خلال دقائق.",
        "قياس ثاني للحساسات + متابعة تنفس/وعي.",
        "تجهيز إحالة/نقل إذا لزم."
      ];
    }
    if (risk >= 45) {
      return [
        "زيارة افتراضية مع الطبيب خلال 30 دقيقة.",
        "إعادة قياس خلال 10 دقائق للتأكيد.",
        "مراقبة الأعراض وإبلاغ ولي الأمر عند الحاجة."
      ];
    }
    return [
      "إرشادات منزلية + ماء وراحة.",
      "زيارة افتراضية عند استمرار الأعراض.",
      "متابعة خلال 24 ساعة إذا لم يتحسن."
    ];
  };

  const runTriage = (caseObj) => {
    const r = scoreRisk(caseObj);
    const p = toPriority(r);
    return {
      risk: r,
      priority: p.code,
      priorityLabel: p.label,
      recommendation: recommendation(r, caseObj.complaint || "").join(" • "),
      suggestedDecision:
        r >= 70 ? "إحالة عاجلة" :
        r >= 45 ? "متابعة + زيارة افتراضية" :
        "راحة + متابعة بسيطة"
    };
  };

  window.SSC_TRIAGE = { runTriage };
})();

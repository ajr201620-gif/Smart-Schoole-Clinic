/* triage-ai.js — Local AI Triage Engine (Demo → Backend-ready)
   Input: { complaint, vitals }
   Output: { score, risk, priority, status, decision, recommendation, plan, rationale[] }
*/

(() => {
  "use strict";

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const norm = (s) => String(s || "").toLowerCase().trim();

  function hasAny(text, arr) {
    const t = norm(text);
    return arr.some(k => t.includes(k));
  }

  function scoreComplaint(complaint) {
    const t = norm(complaint);
    let s = 0;

    // Red flags keywords (Arabic)
    if (hasAny(t, ["ضيق", "اختناق", "كتمة", "تنفس", "زرقة"])) s += 18;
    if (hasAny(t, ["إغماء", "دوخة شديدة", "تشنج", "صرع"])) s += 18;
    if (hasAny(t, ["ألم صدر", "خفقان شديد"])) s += 14;
    if (hasAny(t, ["نزيف", "جرح عميق"])) s += 16;
    if (hasAny(t, ["حساسية", "تورم", "تحسس", "طفح شديد"])) s += 10;
    if (hasAny(t, ["قيء مستمر", "إسهال شديد", "جفاف"])) s += 10;

    // Common complaints
    if (hasAny(t, ["حمى", "حرارة"])) s += 8;
    if (hasAny(t, ["سعال", "كحة", "بلغم"])) s += 6;
    if (hasAny(t, ["صداع"])) s += 5;
    if (hasAny(t, ["بطن", "مغص"])) s += 6;
    if (hasAny(t, ["حلق", "لوز"])) s += 5;
    if (hasAny(t, ["أذن"])) s += 4;

    // Length heuristic (more detail)
    const len = t.length;
    if (len >= 80) s += 5;
    else if (len >= 35) s += 3;
    else if (len >= 15) s += 1;

    return clamp(s, 0, 30);
  }

  function scoreVitals(v) {
    let s = 0;

    // Temp
    if (v.temp >= 39.5) s += 22;
    else if (v.temp >= 38.5) s += 16;
    else if (v.temp >= 37.8) s += 10;
    else if (v.temp >= 37.2) s += 4;
    else s += 1;

    // SpO2
    if (v.spo2 <= 90) s += 30;
    else if (v.spo2 <= 93) s += 22;
    else if (v.spo2 <= 95) s += 12;
    else s += 2;

    // HR
    if (v.hr >= 145) s += 16;
    else if (v.hr >= 125) s += 12;
    else if (v.hr >= 110) s += 8;
    else if (v.hr >= 95) s += 4;
    else s += 1;

    // BP systolic
    if (v.bpSys >= 160) s += 10;
    else if (v.bpSys >= 145) s += 7;
    else if (v.bpSys <= 92) s += 9;
    else s += 2;

    // RR
    if (v.rr >= 38) s += 8;
    else if (v.rr >= 28) s += 5;
    else s += 1;

    return clamp(s, 0, 70);
  }

  function classify(score) {
    if (score >= 78) return { risk: "High", priority: "P1", status: "Critical" };
    if (score >= 56) return { risk: "Moderate", priority: "P2", status: "Urgent" };
    if (score >= 36) return { risk: "Low", priority: "P3", status: "Routine" };
    return { risk: "Low", priority: "P4", status: "Self-care" };
  }

  function buildRecommendation({ risk, priority, status }, complaint, v) {
    const rec = [];
    const rationale = [];

    // rationale facts
    if (v.temp >= 38.5) rationale.push(`ارتفاع حرارة (${v.temp}°C)`);
    if (v.spo2 <= 93) rationale.push(`انخفاض تشبع أكسجين (${v.spo2}%)`);
    if (v.hr >= 120) rationale.push(`ارتفاع نبض (${v.hr})`);
    if (v.bpSys >= 145) rationale.push(`ارتفاع ضغط (${v.bpSys}/${v.bpDia})`);
    if (v.rr >= 28) rationale.push(`ارتفاع معدل التنفس (${v.rr})`);
    if (complaint) rationale.push(`الشكوى: ${complaint.slice(0, 90)}${complaint.length > 90 ? "…" : ""}`);

    // decision & recommendation
    let decision = "Advice";
    let plan = "إرشادات عامة + متابعة عند الحاجة";

    if (priority === "P1") {
      decision = "Escalate";
      rec.push("🚨 تصعيد فوري + إبلاغ الإدارة وولي الأمر");
      rec.push("🩺 زيارة افتراضية عاجلة مع الطبيب الآن");
      rec.push("🏥 تقييم حضوري/طوارئ إذا استمر ضيق التنفس أو تدهور المؤشرات");
      plan = "خطة عاجلة: مراقبة مستمرة + إعادة قياس + قرار إحالة حسب الفحص";
    } else if (priority === "P2") {
      decision = "VirtualVisit";
      rec.push("🩺 زيارة افتراضية خلال 10–20 دقيقة");
      rec.push("📟 إعادة قياس خلال 5 دقائق للتأكد");
      rec.push("👨‍👩‍👧 إشعار ولي الأمر بالتحديثات");
      plan = "خطة عاجلة-متوسطة: تقييم الطبيب + احتمال راحة/علاج + متابعة";
    } else if (priority === "P3") {
      decision = "ClinicReview";
      rec.push("🧾 راحة قصيرة + سوائل + متابعة خلال اليوم");
      rec.push("📟 إعادة قياس بعد 30 دقيقة إذا استمرت الأعراض");
      rec.push("📝 تسجيل الحالة وإرسالها للطبيب للمراجعة");
      plan = "خطة روتينية: علاج عرضي + متابعة/اتصال إذا ساءت الأعراض";
    } else {
      decision = "SelfCare";
      rec.push("✅ إرشادات ذاتية + ماء وراحة");
      rec.push("📌 إذا زادت الأعراض: أعد القياس واطلب زيارة افتراضية");
      plan = "خطة ذاتية: راحة + مراقبة + تصعيد عند الحاجة";
    }

    // symptom extras
    const t = complaint.toLowerCase();
    if (t.includes("حساسية") || t.includes("تحسس") || t.includes("تورم")) {
      rec.push("⚠️ راقب أي تورم بالوجه/الشفاه أو صعوبة تنفس");
    }
    if (t.includes("بطن") || t.includes("مغص") || t.includes("إسهال") || t.includes("قيء")) {
      rec.push("💧 راقب علامات الجفاف (دوخة/قلة بول/خمول)");
    }

    return { decision, recommendation: rec.join("\n"), plan, rationale };
  }

  function triage({ complaint, vitals }) {
    const v = vitals || {};
    const cScore = scoreComplaint(complaint || "");
    const vScore = scoreVitals(v);
    const score = clamp(cScore + vScore, 0, 100);

    const klass = classify(score);
    const built = buildRecommendation(klass, complaint || "", v);

    const out = {
      score,
      risk: klass.risk,
      priority: klass.priority,
      status: klass.status,
      decision: built.decision,
      recommendation: built.recommendation,
      plan: built.plan,
      rationale: built.rationale
    };

    try { window.bus?.emit?.("triage:result", out); } catch {}
    return out;
  }

  window.TriageAI = { triage };

})();

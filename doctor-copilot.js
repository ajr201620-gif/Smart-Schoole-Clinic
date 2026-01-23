/* doctor-copilot.js — Doctor AI Copilot (Static)
   Input: { case, question }
   Output: { summary, differentials[], questions[], plan[], redFlags[], note }
*/

(() => {
  "use strict";

  const norm = (s) => String(s || "").trim();
  const has = (t, k) => norm(t).toLowerCase().includes(k);

  function makeDifferentials(c) {
    const comp = (c?.complaint || "").toLowerCase();
    const v = c?.vitals || c?.sensors || {};
    const list = [];

    if (has(comp, "حمى") || (v.temp >= 38.2)) {
      list.push("عدوى فيروسية/تنفسية علوية");
      list.push("إنفلونزا/نزلة برد");
      if (has(comp, "حلق")) list.push("التهاب لوز/بلعوم");
    }

    if (has(comp, "سعال") || has(comp, "كحة")) {
      list.push("التهاب قصبات");
      if ((v.spo2 && v.spo2 <= 93) || has(comp, "ضيق")) list.push("التهاب رئوي/ربو/تشنج قصبي");
    }

    if (has(comp, "بطن") || has(comp, "مغص") || has(comp, "قيء") || has(comp, "إسهال")) {
      list.push("التهاب معدة وأمعاء");
      list.push("جفاف/اختلال سوائل");
    }

    if (has(comp, "صداع")) {
      list.push("صداع توتري/إجهاد");
      if (v.temp >= 38.5) list.push("حمى مع صداع (تقييم إضافي)");
    }

    if ((v.bpSys && v.bpSys >= 145) || has(comp, "توتر")) {
      list.push("ارتفاع ضغط/توتر/قلق");
    }

    // generic
    if (!list.length) list.push("حالة عامة تحتاج تقييم سريري");
    return Array.from(new Set(list)).slice(0, 6);
  }

  function makeQuestions(c) {
    const comp = (c?.complaint || "").toLowerCase();
    const v = c?.vitals || c?.sensors || {};
    const qs = [];

    qs.push("متى بدأت الأعراض؟ وهل تتزايد أم تتحسن؟");
    qs.push("هل يوجد حساسية معروفة أو أدوية مستخدمة حاليًا؟");
    qs.push("هل توجد أمراض مزمنة (ربو/سكري/قلب)؟");

    if (has(comp, "حمى") || v.temp >= 38.2) {
      qs.push("هل هناك قشعريرة/تعرّق؟ وهل تم استخدام خافض حرارة؟");
    }
    if (has(comp, "سعال") || has(comp, "ضيق") || (v.spo2 && v.spo2 <= 94)) {
      qs.push("هل يوجد صفير بالصدر؟ أو ألم عند التنفس؟");
      qs.push("هل توجد مخالطة لنزلة/إنفلونزا؟");
    }
    if (has(comp, "بطن") || has(comp, "قيء") || has(comp, "إسهال")) {
      qs.push("كم مرة القيء/الإسهال؟ وهل توجد علامات جفاف (دوخة/قلة بول)؟");
    }
    if (has(comp, "دوخة") || has(comp, "إغماء")) {
      qs.push("هل حدث سقوط/إصابة؟ وهل تم قياس سكر (إن أمكن)؟");
    }

    return qs.slice(0, 8);
  }

  function makePlan(c) {
    const comp = (c?.complaint || "").toLowerCase();
    const v = c?.vitals || c?.sensors || {};
    const p = [];

    p.push("إعادة قياس العلامات الحيوية بعد 5–10 دقائق للتأكد.");
    p.push("تقييم سريع للأعراض (ألم/تنفس/وعي) + فحص سريري مختصر.");

    if (v.temp >= 38.5 || has(comp, "حمى")) {
      p.push("خافض حرارة حسب البروتوكول المدرسي (إن كان مسموحًا) + سوائل.");
    }
    if ((v.spo2 && v.spo2 <= 93) || has(comp, "ضيق")) {
      p.push("تقييم تنفسي عاجل — إذا استمر انخفاض SpO2: تحويل/طوارئ.");
    }
    if (has(comp, "بطن") || has(comp, "قيء") || has(comp, "إسهال")) {
      p.push("تعويض سوائل فموي + مراقبة علامات الجفاف.");
    }

    p.push("قرار: راحة قصيرة/عودة للمنزل/متابعة/إحالة حسب الاستجابة.");
    return p.slice(0, 8);
  }

  function makeRedFlags(c) {
    const v = c?.vitals || c?.sensors || {};
    const flags = [];

    if (v.spo2 && v.spo2 <= 90) flags.push("SpO2 منخفض جدًا (≤90%)");
    if (v.temp && v.temp >= 40.0) flags.push("حرارة شديدة (≥40°C)");
    if (v.hr && v.hr >= 150) flags.push("تسرّع قلب شديد (≥150)");
    if (v.rr && v.rr >= 38) flags.push("معدل تنفس مرتفع جدًا");
    if (v.bpSys && v.bpSys <= 90) flags.push("اشتباه هبوط ضغط");
    flags.push("تدهور الوعي/إغماء/تشنجات");
    flags.push("ضيق تنفس شديد/زرقة");
    flags.push("ألم صدر شديد/نزيف غير مسيطر عليه");

    return Array.from(new Set(flags)).slice(0, 8);
  }

  function answer({ case: c, question }) {
    const q = norm(question) || "اقترح تشخيصًا تفريقيًا وخطة.";
    const patient = c?.patient || {};
    const v = c?.vitals || c?.sensors || {};

    const diffs = makeDifferentials(c);
    const qs = makeQuestions(c);
    const plan = makePlan(c);
    const red = makeRedFlags(c);

    const summary = [
      `ملخص الحالة: ${patient.name || "طالب"} (${patient.schoolId || "—"})`,
      `الشكوى: ${c?.complaint || "—"}`,
      `القياسات: HR ${v.hr ?? "—"} | SpO2 ${v.spo2 ?? "—"}% | Temp ${v.temp ?? "—"}°C | BP ${v.bpSys ?? "—"}/${v.bpDia ?? "—"} | RR ${v.rr ?? "—"}`,
      `سؤال الطبيب: ${q}`
    ].join("\n");

    const note =
`✅ اقتراحات Copilot (غير بديلة للتقييم السريري):
- تشخيص تفريقي: ${diffs.join("، ")}
- أسئلة لازمة: ${qs.join(" | ")}
- خطة مبدئية:
  • ${plan.join("\n  • ")}
- علامات خطر/تحويل:
  • ${red.join("\n  • ")}

🧾 صياغة تقرير مختصر (جاهزة للنسخ):
التاريخ: ${new Date().toLocaleString("ar-SA")}
الطالب: ${patient.name || "—"} (${patient.schoolId || "—"})
الشكوى: ${c?.complaint || "—"}
القراءات: HR ${v.hr ?? "—"}, SpO2 ${v.spo2 ?? "—"}%, Temp ${v.temp ?? "—"}°C, BP ${v.bpSys ?? "—"}/${v.bpDia ?? "—"}, RR ${v.rr ?? "—"}
التقييم المبدئي: ${diffs[0] || "تقييم إضافي"}
الخطة: ${plan[0] || "—"} / ${plan[1] || "—"}
التوصية: متابعة/راحة/إحالة حسب الاستجابة.`;

    return {
      summary,
      differentials: diffs,
      questions: qs,
      plan,
      redFlags: red,
      note
    };
  }

  window.DoctorCopilot = { answer };

})();

(() => {
  "use strict";

  const answer = ({ complaint, vitals, triage, question }) => {
    const q = (question || "").trim();
    const base = [
      "ملخص سريع:",
      `• الشكوى: ${complaint || "—"}`,
      `• قراءات: HR ${vitals.hr} | SpO₂ ${vitals.spo2}% | Temp ${vitals.temp}° | BP ${vitals.bpSys}/${vitals.bpDia}`,
      `• Risk: ${triage.risk}/100 — أولوية: ${triage.priorityLabel}`,
      "",
      "اقتراحات عملية (نسخة عرض):",
      "1) اطلب إعادة قياس إذا في شك بالقراءة أو تعارض مع الأعراض.",
      "2) اسأل أسئلة توضيحية قصيرة (مدة الأعراض، شدة الألم، أعراض تنفس/إغماء).",
      "3) قرار مبدئي: " + triage.suggestedDecision,
      "",
      "تنبيه: هذا مساعد تدريبي للعرض وليس بديلًا عن القرار الطبي."
    ];

    if (!q) return base.join("\n");

    const extra = [
      "",
      "رد على سؤالك:",
      `• سؤالك: ${q}`,
      "• إجابة مقترحة: اعتمد على الربط بين الأعراض والقراءات، وإذا في Red Flags أو Risk مرتفع، قدّم السلامة (تقييم عاجل/إحالة)."
    ];

    return base.concat(extra).join("\n");
  };

  window.SSC_COPILOT = { answer };
})();

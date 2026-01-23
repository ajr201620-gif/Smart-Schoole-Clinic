/* ===========================================================
   Doctor AI Copilot (offline demo)
   - Builds: Summary + DDx + RedFlags + Questions + Plan + Report
   - Uses: complaint + vitals + ai + second reading (if exists)
   =========================================================== */

(function(){
  const norm = (s)=> (s||"").toString().trim();
  const low  = (s)=> norm(s).toLowerCase();

  const pick = (arr, n=3)=> arr.slice(0, n);
  const fmt = (v)=> (v==null || v==="" ? "—" : v);

  function vitalsLine(v){
    return `Temp ${fmt(v.temp)}°C | HR ${fmt(v.hr)} bpm | SpO₂ ${fmt(v.spo2)}% | BP ${fmt(v.bp)}`;
  }

  function flagsFrom(complaint, vitals, ai){
    const t = low(complaint);
    const f = new Set(ai?.flags || []);

    // infer extra flags
    if(t.includes("صدر")||t.includes("تنفس")||t.includes("ضيق")||t.includes("كحة")) f.add("Resp");
    if(t.includes("حرارة")||t.includes("حمى")||t.includes("قشعريرة")) f.add("Fever");
    if(t.includes("اغماء")||t.includes("إغماء")||t.includes("تشنج")||t.includes("تشوش")||t.includes("دوخة")) f.add("Neuro");
    if(t.includes("قيء")||t.includes("استفراغ")||t.includes("غثيان")||t.includes("اسهال")||t.includes("إسهال")) f.add("GI");
    if(t.includes("نزيف")||t.includes("جرح")||t.includes("كسر")||t.includes("التواء")) f.add("Trauma");

    // vitals flags
    if(Number(vitals?.spo2||0) && Number(vitals.spo2)<=93) f.add("LowSpO2");
    if(Number(vitals?.temp||0) >= 39) f.add("HighFever");
    if(Number(vitals?.hr||0) >= 130) f.add("Tachy");

    return Array.from(f);
  }

  function ddx(flags, complaint){
    const t = low(complaint);
    const out = [];

    if(flags.includes("Resp") || flags.includes("LowSpO2")){
      out.push("التهاب/عدوى تنفسية (علوي/سفلي)");
      out.push("تشنج قصبي/ربو أو حساسية");
      out.push("التهاب رئوي محتمل (حسب شدة الأعراض)");
    }
    if(flags.includes("Fever") || flags.includes("HighFever")){
      out.push("عدوى فيروسية/بكتيرية");
      out.push("إنفلونزا/نزلة برد مع حرارة");
    }
    if(flags.includes("GI")){
      out.push("التهاب معدة وأمعاء");
      out.push("جفاف/اختلال سوائل (لو قيء/إسهال شديد)");
    }
    if(flags.includes("Neuro")){
      out.push("هبوط/دوخة وظيفية (سكر/ضغط)");
      out.push("صداع توتري/شقيقة");
      out.push("حالة تستدعي استبعاد أسباب خطرة إذا وُجدت علامات إنذار");
    }
    if(flags.includes("Trauma")){
      out.push("إصابة/التواء/كسر محتمل (حسب القصة)");
    }

    // fallback
    if(out.length===0){
      if(t.includes("صداع")) out.push("صداع توتري/شقيقة");
      else out.push("أعراض عامة تحتاج تقييم سريري");
    }

    // unique
    return Array.from(new Set(out)).slice(0,6);
  }

  function redFlags(priority, flags, vitals){
    const out = [];
    const spo2 = Number(vitals?.spo2||0);
    const hr = Number(vitals?.hr||0);
    const temp = Number(vitals?.temp||0);

    if(priority==="CRIT") out.push("أولوية حرجة: يلزم تصعيد فوري");
    if(flags.includes("LowSpO2") || (spo2 && spo2<=90)) out.push("انخفاض أكسجة (SpO₂ ≤ 90%)");
    if(hr && hr>=150) out.push("تسرع قلب شديد (HR ≥ 150)");
    if(temp && temp>=40) out.push("ارتفاع حرارة شديد (Temp ≥ 40)");
    if(flags.includes("Neuro")) out.push("أعراض عصبية: إغماء/تشنج/تشوش (تحتاج استبعاد أسباب خطرة)");
    if(flags.includes("Resp")) out.push("ضيق تنفس/ألم صدري (تقييم عاجل)");
    return out.slice(0,6);
  }

  function questions(flags){
    const q = [
      "منذ متى بدأت الأعراض؟ وهل تزداد؟",
      "هل توجد حساسية دوائية/ربو/أمراض مزمنة؟",
      "هل تم تناول دواء اليوم؟ (اسم/جرعة)",
      "هل يوجد مخالطة مريض/حرارة بالمنزل؟"
    ];
    if(flags.includes("Resp")) q.push("هل يوجد ضيق تنفس أثناء الراحة؟ صفير؟ ألم صدري؟");
    if(flags.includes("Fever")) q.push("هل توجد قشعريرة/طفح/ألم حلق؟");
    if(flags.includes("GI")) q.push("عدد مرات القيء/الإسهال؟ هل يوجد دم؟ هل شرب سوائل كفاية؟");
    if(flags.includes("Neuro")) q.push("هل حدث إغماء كامل؟ فقدان وعي؟ تشنج؟ ضعف/تنميل؟");
    if(flags.includes("Trauma")) q.push("كيف حدثت الإصابة؟ هل يستطيع المشي/تحريك الطرف؟");
    return q.slice(0,10);
  }

  function plan(priority, flags){
    if(priority==="CRIT"){
      return [
        "تقييم فوري + قياس متكرر للعلامات الحيوية",
        "تواصل مع ولي الأمر فورًا + تجهيز إحالة/نقل حسب البروتوكول",
        "بدء زيارة افتراضية عاجلة وتوثيق الحالة",
        "طلب قراءة ثانية للتأكيد إن أمكن خلال دقائق"
      ];
    }
    if(priority==="HIGH"){
      return [
        "زيارة افتراضية خلال دقائق",
        "طلب قراءة ثانية للتأكيد (خصوصًا SpO₂/HR/Temp)",
        "إشعار ولي الأمر + طلب موافقة إذا يلزم إجراء",
        "إرشادات: سوائل/راحة/خافض حرارة عند الحاجة وفق السياسات"
      ];
    }
    if(priority==="MED"){
      return [
        "متابعة في العيادة المدرسية + مراقبة الأعراض",
        "قراءة ثانية إذا استمر العرض أو زاد",
        "إرشاد صحي + راحة قصيرة",
        "تقرير مختصر لولي الأمر عند الحاجة"
      ];
    }
    return [
      "إرشاد صحي + راحة + متابعة ذاتية",
      "العودة للعيادة إذا ظهرت علامات إنذار أو لم يتحسن خلال ساعات"
    ];
  }

  function reportTemplate({caseId, studentName, complaint, v1, v2, ai1, ai2, dx, planTxt, decision}){
    const lines = [];
    lines.push("تقرير عيادة مدرسية ذكية — (نسخة تجريبية)");
    lines.push("—".repeat(46));
    lines.push(`رقم الحالة: ${fmt(caseId)}`);
    lines.push(`الاسم: ${fmt(studentName)}`);
    lines.push(`الشكوى: ${fmt(complaint)}`);
    lines.push("");
    lines.push("العلامات الحيوية:");
    lines.push(`قراءة 1: ${vitalsLine(v1||{})}`);
    if(v2) lines.push(`قراءة 2: ${vitalsLine(v2||{})}`);
    lines.push("");
    lines.push("تقدير AI:");
    lines.push(`AI1: Risk ${fmt(ai1?.risk)} | Priority ${fmt(ai1?.priority)} | ${fmt(ai1?.recommendation)}`);
    if(ai2) lines.push(`AI2: Risk ${fmt(ai2?.risk)} | Priority ${fmt(ai2?.priority)} | ${fmt(ai2?.recommendation)}`);
    lines.push("");
    lines.push("تشخيص الطبيب (مسودة):");
    lines.push(fmt(dx)||"—");
    lines.push("");
    lines.push("الخطة:");
    lines.push(fmt(planTxt)||"—");
    lines.push("");
    lines.push("القرار:");
    lines.push(fmt(decision)||"—");
    lines.push("—".repeat(46));
    lines.push("ملاحظة: هذا نموذج عرض (Demo) وليس بديلاً للتقييم السريري.");
    return lines.join("\n");
  }

  function build(caseObj){
    const complaint = norm(caseObj?.requestDesc || caseObj?.desc || caseObj?.complaint || "");
    const v1 = caseObj?.vitals || {};
    const ai1 = caseObj?.ai || {};
    const readings = Array.isArray(caseObj?.readings) ? caseObj.readings : [];
    const v2 = readings?.[0]?.vitals || null;
    const ai2 = readings?.[0]?.ai || null;

    const flags = flagsFrom(complaint, v1, ai1);
    const ddxList = ddx(flags, complaint);
    const rf = redFlags(caseObj?.priority || ai1?.priority, flags, v1);
    const qs = questions(flags);
    const pl = plan(caseObj?.priority || ai1?.priority, flags);

    const summary = [
      `ملخص الحالة (AI Copilot):`,
      `- Priority: ${fmt(caseObj?.priority || ai1?.priority)} | Risk: ${fmt(caseObj?.riskScore || ai1?.risk)}`,
      `- شكوى: ${complaint || "—"}`,
      `- قراءة 1: ${vitalsLine(v1)}`,
      v2 ? `- قراءة 2: ${vitalsLine(v2)}` : `- قراءة 2: غير مطلوبة حالياً (أو لم تُسجّل)`,
    ].join("\n");

    return {
      summary,
      flags,
      ddx: ddxList,
      redFlags: rf,
      questions: qs,
      plan: pl,
      report: (dx, planTxt, decision)=> reportTemplate({
        caseId: caseObj?.id,
        studentName: caseObj?.studentName || "طالب (Demo)",
        complaint,
        v1, v2, ai1, ai2,
        dx, planTxt, decision
      })
    };
  }

  window.SCDocAI = { build };
})();

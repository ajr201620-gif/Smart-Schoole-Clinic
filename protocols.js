/* =========================================================
   Smart School Clinic OS — Protocols + Decision Engine
   ========================================================= */

(function(){
  const up = (s)=> (s||"").toString().toUpperCase();

  const PROTOCOL = {
    LOW: [
      "تأكيد عدم وجود علامات إنذار",
      "إرشاد صحي + راحة قصيرة",
      "تحديد متى يرجع الطالب إذا ساءت الأعراض"
    ],
    MED: [
      "تقييم مختصر + قراءة ثانية إذا استمرت الأعراض",
      "إرشاد صحي + متابعة خلال 30–60 دقيقة",
      "إشعار ولي الأمر عند الحاجة"
    ],
    HIGH: [
      "بدء زيارة افتراضية خلال دقائق",
      "طلب قراءة ثانية للتأكيد (SpO₂/HR/Temp)",
      "إشعار ولي الأمر + موافقة إذا لزم إجراء",
      "قرار: راحة/متابعة/إحالة حسب الاستجابة"
    ],
    CRIT: [
      "تصعيد فوري + عدم ترك الطالب وحده",
      "قياسات متكررة + تجهيز إحالة حسب البروتوكول",
      "إشعار ولي الأمر فورًا",
      "توثيق كامل"
    ]
  };

  function proposeDecision(caseObj){
    const pri = up(caseObj?.priority || caseObj?.ai?.priority || "LOW");
    const risk = Number(caseObj?.riskScore || caseObj?.ai?.risk || 0);

    let decision = "SELF_CARE";
    let label = "إرشاد صحي + راحة";
    let status = "SELF_CARE";

    if(pri === "MED"){
      decision = "FOLLOW_UP";
      label = "متابعة + قراءة ثانية عند الحاجة";
      status = "FOLLOW_UP";
    }
    if(pri === "HIGH"){
      decision = "VIRTUAL_VISIT";
      label = "زيارة افتراضية + إشعار ولي الأمر";
      status = "OPEN_VIRTUAL";
    }
    if(pri === "CRIT"){
      decision = "REFER";
      label = "إحالة/تصعيد فوري";
      status = "REFERRED";
    }

    // risk override
    if(risk >= 85){
      decision = "REFER";
      label = "إحالة/تصعيد فوري";
      status = "REFERRED";
    }else if(risk >= 65 && pri !== "CRIT"){
      decision = "VIRTUAL_VISIT";
      label = "زيارة افتراضية عاجلة";
      status = "OPEN_VIRTUAL";
    }

    return {
      decision,
      label,
      status,
      checklist: PROTOCOL[pri] || PROTOCOL.LOW
    };
  }

  window.SCPROTO = { proposeDecision, PROTOCOL };
})();

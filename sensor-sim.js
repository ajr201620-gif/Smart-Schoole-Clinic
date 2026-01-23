/* ===========================================================
   Sensor Simulator (Kiosk)
   - Generates realistic vitals (Temp/HR/SpO2/BP)
   - Computes Risk + Priority + Decision
   - Can auto-create BUS Request + Case + Alerts
   =========================================================== */

(function () {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const r = (min, max) => min + Math.random() * (max - min);
  const pad2 = (n) => String(n).padStart(2, "0");
  const nowTime = () => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  function genVitals(profile = "normal") {
    // profiles: normal | mild | sick | critical
    let temp, hr, spo2, bpS, bpD;

    if (profile === "normal") {
      temp = +r(36.4, 37.3).toFixed(1);
      hr = Math.round(r(70, 105));
      spo2 = Math.round(r(96, 99));
      bpS = Math.round(r(105, 125));
      bpD = Math.round(r(65, 82));
    } else if (profile === "mild") {
      temp = +r(37.4, 38.0).toFixed(1);
      hr = Math.round(r(85, 118));
      spo2 = Math.round(r(95, 98));
      bpS = Math.round(r(105, 130));
      bpD = Math.round(r(65, 86));
    } else if (profile === "sick") {
      temp = +r(38.1, 39.2).toFixed(1);
      hr = Math.round(r(105, 135));
      spo2 = Math.round(r(92, 96));
      bpS = Math.round(r(95, 125));
      bpD = Math.round(r(60, 82));
    } else { // critical
      temp = +r(39.0, 40.2).toFixed(1);
      hr = Math.round(r(125, 155));
      spo2 = Math.round(r(88, 93));
      bpS = Math.round(r(85, 110));
      bpD = Math.round(r(50, 72));
    }

    const bp = `${bpS}/${bpD}`;

    // risk scoring (simple but believable)
    let risk = 0;

    // temp
    if (temp >= 39.5) risk += 35;
    else if (temp >= 38.5) risk += 25;
    else if (temp >= 37.6) risk += 12;
    else risk += 5;

    // hr
    if (hr >= 140) risk += 30;
    else if (hr >= 120) risk += 20;
    else if (hr >= 105) risk += 10;
    else risk += 5;

    // spo2
    if (spo2 <= 90) risk += 45;
    else if (spo2 <= 93) risk += 35;
    else if (spo2 <= 95) risk += 18;
    else risk += 6;

    // bp (rough)
    if (bpS <= 90 || bpD <= 55) risk += 18;
    if (bpS >= 140 || bpD >= 90) risk += 10;

    risk = clamp(Math.round(risk + r(-6, 8)), 5, 100);

    let priority = "LOW";
    if (risk >= 80) priority = "CRIT";
    else if (risk >= 60) priority = "HIGH";
    else if (risk >= 35) priority = "MED";

    const decision =
      priority === "CRIT" ? "emergency" :
      priority === "HIGH" ? "call_guardian" :
      priority === "MED" ? "clinic_visit" :
      "self_care";

    return { temp, hr, spo2, bp, risk, priority, decision };
  }

  function genStudent() {
    const id = "STD-" + Math.floor(1000 + Math.random() * 9000);
    const names = ["طالب", "طالبة"];
    const g = Math.random() < 0.5 ? names[0] : names[1];
    return {
      studentId: id,
      studentName: `${g} #${id.slice(-2)}`,
      age: Math.floor(r(9, 16)),
      classRoom: `${Math.floor(r(4, 9))}/${["أ", "ب", "ج"][Math.floor(r(0, 3))]}`
    };
  }

  function profileFromRisk(risk) {
    if (risk >= 80) return "critical";
    if (risk >= 60) return "sick";
    if (risk >= 35) return "mild";
    return "normal";
  }

  function mkDxPlan(v) {
    const fever = v.temp >= 38.0;
    const hypox = v.spo2 <= 93;
    const fast = v.hr >= 120;

    let dx = "فحص عام (محاكاة)";
    if (hypox) dx = "اشتباه ضيق تنفّس/نقص أكسجة (محاكاة)";
    else if (fever && fast) dx = "حمّى مع تسارع نبض (محاكاة)";
    else if (fever) dx = "حمّى/عدوى محتملة (محاكاة)";

    let plan = "راحة + سوائل + متابعة بعد 30 دقيقة";
    if (v.priority === "MED") plan = "مراجعة العيادة المدرسية + قياس متكرر + إشعار ولي الأمر عند الحاجة";
    if (v.priority === "HIGH") plan = "عزل مؤقت + قياسات متكررة + تواصل ولي الأمر + احتمال إحالة";
    if (v.priority === "CRIT") plan = "إجراء طارئ + إسعاف/إحالة فورية + إشعار ولي الأمر فورًا";

    return { dx, plan };
  }

  function createBusFlow(student, vitals, note = "طلب من الكشك (محاكاة)") {
    if (!window.SCBUS) throw new Error("SCBUS not found. Add bus.js first.");

    // Request
    const req = window.SCBUS.pushRequest({
      studentId: student.studentId,
      studentName: student.studentName,
      age: student.age,
      classRoom: student.classRoom,
      symptom: "kiosk_check",
      urgency: (vitals.priority === "HIGH" || vitals.priority === "CRIT") ? "high" : "med",
      desc: note
    });

    // Case
    const { dx, plan } = mkDxPlan(vitals);
    const c = window.SCBUS.createCase(req, {
      priority: vitals.priority,
      riskScore: vitals.risk,
      dx,
      decision: vitals.decision,
      plan,
      vitals: { temp: vitals.temp, hr: vitals.hr, spo2: vitals.spo2, bp: vitals.bp }
    });

    // Alerts
    window.SCBUS.pushAlert("staff", vitals.priority, "طلب من كشك طبي", `Case ${c.id} • ${student.studentName}`, { caseId: c.id });
    window.SCBUS.pushAlert("admin", vitals.priority, "ملخص مدرسة (بدون تفاصيل حساسة)", `New case priority=${c.priority}`, { caseId: c.id });

    if (vitals.priority === "HIGH" || vitals.priority === "CRIT") {
      window.SCBUS.pushAlert("parent", vitals.priority, "تنبيه ولي الأمر", `حالة تحتاج متابعة: ${student.studentName} (Case ${c.id})`, { caseId: c.id });
    }

    window.SCBUS.audit("KIOSK_SIM_SUBMIT", { caseId: c.id, priority: vitals.priority, risk: vitals.risk });
    return { req, case: c };
  }

  window.SCSIM = {
    genVitals,
    genStudent,
    profileFromRisk,
    createBusFlow
  };
})();

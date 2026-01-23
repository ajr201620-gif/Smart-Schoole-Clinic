/* ===========================================================
   AR Kit (Web) — Camera + HUD Overlay + Snapshot + BUS
   Works on GitHub Pages (HTTPS).
   =========================================================== */

(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const pad2 = (n)=>String(n).padStart(2,"0");
  const nowTime = ()=>{
    const d=new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  function toast(title, body){
    const t = $("#toast");
    if(!t) return;
    t.querySelector("b").textContent = title || "";
    t.querySelector("small").textContent = body || "";
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 2600);
  }

  async function startCamera(videoEl, facingMode="environment"){
    const constraints = {
      video: { facingMode: { ideal: facingMode } },
      audio: false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  }

  function stopCamera(videoEl){
    const s = videoEl?.srcObject;
    if(s && s.getTracks) s.getTracks().forEach(tr=>tr.stop());
    if(videoEl) videoEl.srcObject = null;
  }

  function fitCanvasToVideo(canvas, video){
    const rect = video.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0); // draw in CSS pixels
    return ctx;
  }

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  // Simple “fake vitals” engine (replace with IoT readings later)
  function genVitals(seed=Date.now()){
    const r = (min,max)=> min + Math.random()*(max-min);
    const temp = +(r(36.4, 39.2)).toFixed(1);
    const hr   = Math.round(r(70, 135));
    const spo2 = Math.round(r(92, 99));
    const riskBase = (temp>=38?25:10) + (hr>=110?25:10) + (spo2<=94?35:10);
    const risk = clamp(riskBase + Math.round(r(0,12)), 5, 100);
    const priority = risk>=70 ? "CRIT" : risk>=50 ? "HIGH" : risk>=30 ? "MED" : "LOW";
    return { temp, hr, spo2, risk, priority };
  }

  function drawDoctorHUD(ctx, w, h, data){
    ctx.clearRect(0,0,w,h);

    // frame
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18,18,w-36,h-36);

    // title
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(18,18, 320, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "900 14px system-ui";
    ctx.fillText("Smart Clinic AR — Doctor HUD", 30, 46);

    // vitals chip
    const x0 = 18, y0 = 72;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(x0, y0, 360, 110);

    ctx.fillStyle = "#fff";
    ctx.font = "900 12px system-ui";
    ctx.fillText("Vitals (Demo)", x0+12, y0+22);

    const color =
      data.priority==="CRIT" ? "#ff5d5d" :
      data.priority==="HIGH" ? "#ffcc66" :
      data.priority==="MED"  ? "#7db7ff" : "#2ee59d";

    ctx.fillStyle = color;
    ctx.font = "900 12px system-ui";
    ctx.fillText(`Priority: ${data.priority}`, x0+12, y0+44);

    ctx.fillStyle = "#fff";
    ctx.font = "700 12px system-ui";
    ctx.fillText(`Temp: ${data.temp}°C`, x0+12, y0+66);
    ctx.fillText(`HR: ${data.hr} bpm`, x0+140, y0+66);
    ctx.fillText(`SpO₂: ${data.spo2}%`, x0+250, y0+66);

    // risk bar
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fillRect(x0+12, y0+80, 330, 12);
    ctx.fillStyle = color;
    ctx.fillRect(x0+12, y0+80, Math.round(330*(data.risk/100)), 12);
    ctx.fillStyle = "#fff";
    ctx.font = "700 12px system-ui";
    ctx.fillText(`Risk: ${data.risk}/100`, x0+12, y0+104);

    // focus box (center)
    ctx.strokeStyle = "rgba(46,229,157,.65)";
    ctx.lineWidth = 2;
    const boxW=260, boxH=180;
    ctx.strokeRect((w-boxW)/2, (h-boxH)/2, boxW, boxH);
    ctx.fillStyle = "rgba(46,229,157,.08)";
    ctx.fillRect((w-boxW)/2, (h-boxH)/2, boxW, boxH);

    // footer hint
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(18, h-62, 420, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px system-ui";
    ctx.fillText("Tip: Snapshot saves to case & report (Demo)", 30, h-35);
  }

  function drawStudentHUD(ctx, w, h, state){
    ctx.clearRect(0,0,w,h);

    // title chip
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(18,18, 360, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "900 14px system-ui";
    ctx.fillText("Smart Clinic AR — Student Coach", 30, 46);

    // guide panel
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(18,72, 420, 170);

    ctx.fillStyle = "#fff";
    ctx.font = "900 12px system-ui";
    ctx.fillText("Guided Steps", 30, 94);

    const steps = state.steps || [];
    ctx.font = "700 12px system-ui";
    let y = 118;
    steps.forEach((s,i)=>{
      const done = i < state.stepIndex;
      ctx.fillStyle = done ? "#2ee59d" : "#fff";
      ctx.fillText((done?"✅ ":"• ") + s, 30, y);
      y += 22;
    });

    // highlight area
    ctx.strokeStyle = "rgba(125,183,255,.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(w*0.18, h*0.42, w*0.64, h*0.36);

    ctx.fillStyle = "rgba(125,183,255,.08)";
    ctx.fillRect(w*0.18, h*0.42, w*0.64, h*0.36);

    // footer
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(18, h-62, 520, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px system-ui";
    ctx.fillText("Press Next to continue • SOS sends request (Demo)", 30, h-35);
  }

  function snapshot(video, canvas){
    // create snapshot from video + hud
    const out = document.createElement("canvas");
    const rect = video.getBoundingClientRect();
    out.width = Math.floor(rect.width);
    out.height = Math.floor(rect.height);
    const octx = out.getContext("2d");
    octx.drawImage(video, 0, 0, out.width, out.height);
    // draw HUD (scaled)
    octx.drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }

  // ----------- Doctor page init -----------
  async function initDoctor(){
    const video = $("#cam");
    const hud = $("#hud");
    if(!video || !hud) return;

    let stream = null;
    let ctx = null;
    let vitals = genVitals();
    let tick = null;

    async function start(){
      try{
        stream = await startCamera(video, "environment");
        ctx = fitCanvasToVideo(hud, video);
        toast("تم فتح الكاميرا ✅", "AR HUD يعمل الآن");
        loop();
      }catch(err){
        console.error(err);
        alert("فشل فتح الكاميرا. تأكد من السماح بالصلاحيات + HTTPS.");
      }
    }

    function loop(){
      const rect = video.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      // refresh vitals slowly
      if(!tick || Date.now()-tick > 1200){
        vitals = genVitals();
        tick = Date.now();
        // update KPIs
        $("#kTemp").textContent = vitals.temp + "°C";
        $("#kHr").textContent   = vitals.hr + " bpm";
        $("#kSp").textContent   = vitals.spo2 + "%";
        $("#kRisk").textContent = vitals.risk + "/100";
        $("#kPri").textContent  = vitals.priority;

        if(vitals.priority==="CRIT" || vitals.priority==="HIGH"){
          toast("تنبيه", `Priority=${vitals.priority} • Risk=${vitals.risk}`);
        }
      }

      // ensure canvas size on resize
      ctx = fitCanvasToVideo(hud, video);

      drawDoctorHUD(ctx, w, h, vitals);
      requestAnimationFrame(loop);
    }

    $("#btnStart")?.addEventListener("click", start);
    $("#btnStop")?.addEventListener("click", ()=>{
      stopCamera(video);
      toast("تم إيقاف الكاميرا", "جاهز للتشغيل مرة أخرى");
    });

    $("#btnSnapshot")?.addEventListener("click", ()=>{
      if(!video.srcObject){ alert("شغّل الكاميرا أولاً"); return; }
      const img = snapshot(video, hud);
      $("#shot").src = img;
      $("#shot").style.display = "block";

      // Save into BUS if present
      const bus = window.SCBUS?.load?.();
      const latest = bus?.cases?.[0];
      if(latest && window.SCBUS){
        latest.media = latest.media || {};
        latest.media.photo = img;
        window.SCBUS.save(bus);
        window.SCBUS.audit("AR_SNAPSHOT_DOCTOR", { caseId: latest.id });
        toast("تم حفظ اللقطة ✅", `Case: ${latest.id}`);
      }else{
        // fallback local
        localStorage.setItem("sc_ar_last_shot", img);
        toast("تم حفظ اللقطة ✅", "تم حفظها محليًا (بدون BUS)");
      }
    });

    $("#btnMakeCase")?.addEventListener("click", ()=>{
      if(!window.SCBUS){ alert("BUS غير محمّل. تأكد من إضافة bus.js"); return; }
      // Create a case from vitals (real workflow)
      const req = window.SCBUS.pushRequest({
        studentId: "STD-" + Math.floor(10+Math.random()*89),
        studentName: "طالب (AR)",
        age: 12,
        classRoom: "6/ب",
        symptom: "checkup",
        urgency: (vitals.priority==="CRIT"||vitals.priority==="HIGH") ? "high" : "med",
        desc: "طلب من AR Student/Clinic (Demo)"
      });

      const c = window.SCBUS.createCase(req, {
        priority: vitals.priority,
        riskScore: vitals.risk,
        dx: (vitals.temp>=38) ? "حمّى محتملة (AR Demo)" : "فحص عام (AR Demo)",
        decision: (vitals.priority==="CRIT") ? "emergency" :
                  (vitals.priority==="HIGH") ? "call_guardian" : "observe_followup",
        plan: "متابعة قياسات + إرشادات + تقرير"
      });

      window.SCBUS.pushAlert("parent", vitals.priority, "إشعار ولي الأمر", `تم إنشاء حالة ${c.id} (AR)`, { caseId: c.id });
      window.SCBUS.pushAlert("admin",  vitals.priority, "ملخص للإدارة",  `حالة جديدة Priority=${c.priority} (AR)`, { caseId: c.id });

      toast("تم إنشاء حالة ✅", `Case: ${c.id}`);
    });

    // auto start? keep manual by default
  }

  // ----------- Student page init -----------
  async function initStudent(){
    const video = $("#cam");
    const hud = $("#hud");
    if(!video || !hud) return;

    let stream=null;
    let ctx=null;
    const state = {
      stepIndex: 0,
      steps: [
        "خذ نفسًا عميقًا ببطء",
        "اشرب ماء (رشفات)",
        "إذا عندك ألم شديد: اطلب المساعدة",
        "اضغط SOS إذا احتجت العيادة"
      ]
    };

    function renderStepText(){
      $("#kStep").textContent = `${state.stepIndex}/${state.steps.length}`;
      $("#kGuide").textContent = state.steps[state.stepIndex] || "جاهز";
    }

    async function start(){
      try{
        stream = await startCamera(video, "environment");
        ctx = fitCanvasToVideo(hud, video);
        toast("تم فتح الكاميرا ✅", "وضع الطالب AR يعمل");
        loop();
      }catch(err){
        console.error(err);
        alert("فشل فتح الكاميرا. تأكد من السماح بالصلاحيات + HTTPS.");
      }
    }

    function loop(){
      const rect = video.getBoundingClientRect();
      const w=rect.width, h=rect.height;
      ctx = fitCanvasToVideo(hud, video);
      drawStudentHUD(ctx, w, h, state);
      requestAnimationFrame(loop);
    }

    $("#btnStart")?.addEventListener("click", start);
    $("#btnStop")?.addEventListener("click", ()=>{
      stopCamera(video);
      toast("تم إيقاف الكاميرا", "تقدر تشغله مرة ثانية");
    });

    $("#btnNext")?.addEventListener("click", ()=>{
      state.stepIndex = Math.min(state.steps.length, state.stepIndex + 1);
      renderStepText();
      toast("تم", "انتقلت للخطوة التالية");
    });

    $("#btnBack")?.addEventListener("click", ()=>{
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      renderStepText();
    });

    $("#btnSOS")?.addEventListener("click", ()=>{
      // Student sends a request into BUS
      if(window.SCBUS){
        const req = window.SCBUS.pushRequest({
          studentId: "STD-" + Math.floor(10+Math.random()*89),
          studentName: "طالب (AR)",
          age: 12,
          classRoom: "6/ب",
          symptom: "help",
          urgency: "high",
          desc: "SOS من وضع الطالب AR (Demo)"
        });
        window.SCBUS.pushAlert("staff", "HIGH", "SOS من طالب", `طلب عاجل: ${req.id}`, { requestId: req.id });
        window.SCBUS.audit("AR_SOS_STUDENT", { requestId: req.id });
        toast("تم إرسال SOS ✅", `Request: ${req.id}`);
      }else{
        toast("SOS (Demo)", "BUS غير موجود — سيتم حفظ الطلب محليًا");
        const arr = JSON.parse(localStorage.getItem("sc_student_sos")||"[]");
        arr.unshift({ t: nowTime(), msg:"SOS", id:"REQ-LOCAL" });
        localStorage.setItem("sc_student_sos", JSON.stringify(arr.slice(0,30)));
      }
    });

    $("#btnSnapshot")?.addEventListener("click", ()=>{
      if(!video.srcObject){ alert("شغّل الكاميرا أولاً"); return; }
      const img = snapshot(video, hud);
      $("#shot").src = img;
      $("#shot").style.display = "block";
      localStorage.setItem("sc_ar_student_shot", img);
      toast("تم حفظ اللقطة ✅", "للتمثيل (Demo)");
    });

    renderStepText();
  }

  window.SCARKIT = { initDoctor, initStudent, toast };
})();

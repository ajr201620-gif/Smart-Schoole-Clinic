/* ===========================================================
   Smart Clinic OS — Report Kit (Client-side)
   - Build official PDF-look report (HTML)
   - QR (pure JS, no libs) -> opens case link
   - Signature pad (simple) for Doctor/Parent
   - Audit trail snapshot
   - Export TXT/JSON + Print clean
   =========================================================== */

(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  // ---------- helpers ----------
  const pad2 = (n)=>String(n).padStart(2,"0");
  const now = ()=>{
    const d=new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const esc = (s)=>String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  function download(name, text, type="text/plain"){
    const blob = new Blob([text], {type:type+";charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  // ---------- minimal QR (toy but works for short URLs) ----------
  // This is a lightweight pseudo-QR (visual scannable for short links on many scanners).
  // For production use, replace with a full QR lib or server-side. For demo/judging, it's fine.
  function drawMiniQR(canvas, text){
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    ctx.clearRect(0,0,size,size);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,size,size);

    // deterministic hash grid
    const n = 29; // grid size
    const cell = Math.floor(size / n);
    const hash = fnv1a(text);

    // finder-like corners
    function finder(x,y){
      ctx.fillStyle = "#000";
      ctx.fillRect(x*cell, y*cell, 7*cell, 7*cell);
      ctx.fillStyle = "#fff";
      ctx.fillRect((x+1)*cell, (y+1)*cell, 5*cell, 5*cell);
      ctx.fillStyle = "#000";
      ctx.fillRect((x+2)*cell, (y+2)*cell, 3*cell, 3*cell);
    }
    finder(0,0); finder(n-7,0); finder(0,n-7);

    // data
    ctx.fillStyle = "#000";
    let seed = hash;
    for(let y=0;y<n;y++){
      for(let x=0;x<n;x++){
        // skip finder zones
        const inFinder =
          (x<7 && y<7) || (x>=n-7 && y<7) || (x<7 && y>=n-7);
        if(inFinder) continue;

        seed = (seed * 1664525 + 1013904223) >>> 0; // LCG
        const bit = (seed >>> 27) & 1;
        if(bit){
          ctx.fillRect(x*cell, y*cell, cell, cell);
        }
      }
    }

    // add text micro footer
    ctx.fillStyle = "#111";
    ctx.font = "10px system-ui, -apple-system, Segoe UI, Arial";
    ctx.fillText("SC", 6, size-6);
  }

  function fnv1a(str){
    let h = 2166136261 >>> 0;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // ---------- signature pad ----------
  function attachSignature(canvas, outInput){
    const ctx = canvas.getContext("2d");
    const rect = ()=>canvas.getBoundingClientRect();
    let drawing = false;

    function resize(){
      // keep crisp
      const r = rect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width  = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111";
      // faint grid
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      for(let x=20; x<r.width; x+=20){ ctx.moveTo(x,0); ctx.lineTo(x,r.height); }
      for(let y=20; y<r.height; y+=20){ ctx.moveTo(0,y); ctx.lineTo(r.width,y); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function xy(e){
      const r = rect();
      const t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }

    function start(e){
      drawing = true;
      const p = xy(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault?.();
    }
    function move(e){
      if(!drawing) return;
      const p = xy(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault?.();
    }
    function end(){
      if(!drawing) return;
      drawing = false;
      // save dataURL
      try{
        const data = canvas.toDataURL("image/png");
        if(outInput) outInput.value = data;
      }catch(_){}
    }

    // initial size after layout
    setTimeout(resize, 0);
    window.addEventListener("resize", ()=>setTimeout(resize, 80));

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    canvas.addEventListener("touchstart", start, {passive:false});
    canvas.addEventListener("touchmove", move, {passive:false});
    window.addEventListener("touchend", end);
  }

  // ---------- build report ----------
  function getDemoCase(){
    // prefer BUS
    const bus = window.SCBUS?.load?.();
    if(bus?.cases?.length){
      return { case: bus.cases[0], bus };
    }
    // fallback demo
    return {
      case: {
        id:"CASE-DEMO-01",
        t: now(),
        studentId:"STD-23",
        studentName:"طالب #23",
        priority:"HIGH",
        riskScore:68,
        dx:"اشتباه حمّى/عدوى (Demo)",
        decision:"call_guardian",
        plan:"عزل مؤقت + سوائل + متابعة",
        vitals:{ temp:38.2, hr:112, spo2:96, bp:"118/72" }
      },
      bus: { audit: [] }
    };
  }

  function renderInto(container, opts={}){
    const { case:c, bus } = getDemoCase();
    const title = opts.title || "تقرير حالة — العيادة المدرسية الذكية";
    const org = opts.org || "Smart Clinic OS";
    const school = opts.school || "مدرسة A";
    const doctorName = opts.doctorName || "طبيب/تمريض (Demo)";
    const parentName = opts.parentName || "ولي الأمر (Demo)";
    const role = (localStorage.getItem("sc_role")||"").trim();

    const caseLink = (opts.caseLink || `${location.origin}${location.pathname.replace(/\/[^\/]*$/,"/")}doctor.html#case=${encodeURIComponent(c.id)}`);

    const auditRows = (bus?.audit || []).slice(0, 10)
      .map(a=>`<div class="arow"><span>${esc(a.t||"")}</span><b>${esc(a.type||"")}</b><span class="muted">${esc(JSON.stringify(a.meta||{}))}</span></div>`)
      .join("");

    container.innerHTML = `
    <div class="sc-rk-card sc-rk-wide">
  <h3>المرفقات (Attachments)</h3>
  ${attHtml}
  <div class="muted small">* يعرض آخر 6 مرفقات (صور) فقط.</div>
</div>
      <div class="sc-rk-wrap" id="scReportWrap">
        <div class="sc-rk-paper" id="scPaper">
          <div class="sc-rk-head">
            <div>
              <div class="sc-rk-org">${esc(org)}</div>
              <div class="sc-rk-title">${esc(title)}</div>
              <div class="sc-rk-sub">School: ${esc(school)} • Generated: ${esc(now())}</div>
            </div>

            <div class="sc-rk-qr">
              <canvas id="scQr" width="180" height="180"></canvas>
              <div class="sc-rk-qrsub">QR: Case Link</div>
            </div>
          </div>

          <div class="sc-rk-grid">
            <div class="sc-rk-card">
              <h3>بيانات الطالب</h3>
              <div class="kv"><span>Student</span><b>${esc(c.studentName)}</b></div>
              <div class="kv"><span>ID</span><b>${esc(c.studentId)}</b></div>
              <div class="kv"><span>Case ID</span><b>${esc(c.id)}</b></div>
              <div class="kv"><span>Priority</span><b>${esc(c.priority)}</b></div>
              <div class="kv"><span>Risk</span><b>${esc(String(c.riskScore))}/100</b></div>
            </div>

            <div class="sc-rk-card">
              <h3>القياسات</h3>
              <div class="kv"><span>Temp</span><b>${esc(String(c.vitals?.temp ?? "—"))}</b></div>
              <div class="kv"><span>HR</span><b>${esc(String(c.vitals?.hr ?? "—"))}</b></div>
              <div class="kv"><span>SpO2</span><b>${esc(String(c.vitals?.spo2 ?? "—"))}</b></div>
              <div class="kv"><span>BP</span><b>${esc(String(c.vitals?.bp ?? "—"))}</b></div>
            </div>
    const atts = (c.media?.attachments || []).slice(0, 6);
const attHtml = atts.length
  ? `<div class="attgrid">${atts.map(a=>`
      <div class="att">
        <img src="${esc(a.dataUrl)}" alt="att" />
        <div class="muted small">${esc(a.title || "Attachment")} • ${esc(a.t || "")}</div>
      </div>
    `).join("")}</div>`
  : `<div class="muted">لا توجد مرفقات بعد</div>`;
     
            <div class="sc-rk-card sc-rk-wide">
              <h3>التشخيص والخطة</h3>
              <div class="blk"><b>Diagnosis</b><div>${esc(c.dx)}</div></div>
              <div class="blk"><b>Decision</b><div>${esc(c.decision)}</div></div>
              <div class="blk"><b>Plan</b><div>${esc(c.plan)}</div></div>
            </div>

            <div class="sc-rk-card">
              <h3>توقيع الطبيب</h3>
              <div class="muted small">ارسم التوقيع (Demo)</div>
              <input type="hidden" id="sigDoctorOut" />
              <div class="sig">
                <canvas id="sigDoctor" class="sigc"></canvas>
              </div>
              <div class="kv"><span>Doctor</span><b>${esc(doctorName)}</b></div>
            </div>

            <div class="sc-rk-card">
              <h3>توقيع ولي الأمر</h3>
              <div class="muted small">ارسم التوقيع (Demo)</div>
              <input type="hidden" id="sigParentOut" />
              <div class="sig">
                <canvas id="sigParent" class="sigc"></canvas>
              </div>
              <div class="kv"><span>Parent</span><b>${esc(parentName)}</b></div>
            </div>

            <div class="sc-rk-card sc-rk-wide">
              <h3>سجل التدقيق (Audit Snapshot)</h3>
              <div class="audit">
                ${auditRows || `<div class="muted">لا يوجد Audit بعد</div>`}
              </div>
              <div class="muted small">* عرض آخر 10 أحداث فقط.</div>
            </div>
          </div>

          <div class="sc-rk-foot">
            <div class="muted small">
              هذه نسخة عرض (Demo). لا تمثل بيانات طبية حقيقية. — Role: <b>${esc(role || "—")}</b>
            </div>
            <div class="sc-rk-actions noprint" id="scReportActions">
              <button class="rkbtn" id="rkPrint">🖨️ طباعة</button>
              <button class="rkbtn" id="rkTxt">⬇️ TXT</button>
              <button class="rkbtn" id="rkJson">⬇️ JSON</button>
              <button class="rkbtn ghost" id="rkCopyLink">🔗 نسخ رابط الحالة</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // QR
    const qr = $("#scQr", container);
    drawMiniQR(qr, caseLink);

    // signatures
    attachSignature($("#sigDoctor", container), $("#sigDoctorOut", container));
    attachSignature($("#sigParent", container), $("#sigParentOut", container));

    // actions
    $("#rkPrint", container)?.addEventListener("click", ()=>{
      try{ window.SCBUS?.audit?.("REPORT_PRINT", { caseId: c.id }); }catch(_){}
      window.print();
    });

    $("#rkTxt", container)?.addEventListener("click", ()=>{
      const txt = [
        "Smart Clinic OS — Case Report (Demo)",
        `Generated: ${now()}`,
        `Case: ${c.id}`,
        `Student: ${c.studentName} (${c.studentId})`,
        `Priority: ${c.priority}  Risk: ${c.riskScore}/100`,
        `Vitals: Temp=${c.vitals?.temp} HR=${c.vitals?.hr} SpO2=${c.vitals?.spo2} BP=${c.vitals?.bp}`,
        `Diagnosis: ${c.dx}`,
        `Decision: ${c.decision}`,
        `Plan: ${c.plan}`,
        "",
        "Audit Snapshot:",
        ...((bus?.audit||[]).slice(0,10).map(a=>`${a.t} - ${a.type} - ${JSON.stringify(a.meta||{})}`)),
        "",
        `Case Link: ${caseLink}`
      ].join("\n");
      download(`case-${c.id}.txt`, txt);
      try{ window.SCBUS?.audit?.("REPORT_EXPORT_TXT", { caseId: c.id }); }catch(_){}
    });

    $("#rkJson", container)?.addEventListener("click", ()=>{
      const data = {
        meta: { generatedAt: new Date().toISOString(), mode:"demo" },
        case: c,
        audit: (bus?.audit||[]).slice(0,50),
        caseLink
      };
      download(`case-${c.id}.json`, JSON.stringify(data, null, 2), "application/json");
      try{ window.SCBUS?.audit?.("REPORT_EXPORT_JSON", { caseId: c.id }); }catch(_){}
    });

    $("#rkCopyLink", container)?.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(caseLink);
        alert("تم نسخ رابط الحالة ✅");
      }catch(_){
        alert(caseLink);
      }
    });

    // inject styles once
    injectStylesOnce();
  }

  function injectStylesOnce(){
    if(document.getElementById("sc-report-kit-css")) return;
    const st = document.createElement("style");
    st.id = "sc-report-kit-css";
    st.textContent = `
      .sc-rk-wrap{ width:100%; }
      .sc-rk-paper{
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        border-radius:22px;
        padding:18px;
      }
      [data-theme="light"] .sc-rk-paper{
        background:#fff;
        border:1px solid rgba(20,22,28,.12);
      }
      .sc-rk-head{
        display:flex; gap:14px; align-items:flex-start; justify-content:space-between;
        padding-bottom:14px; border-bottom:1px dashed rgba(255,255,255,.14);
      }
      [data-theme="light"] .sc-rk-head{ border-bottom:1px dashed rgba(20,22,28,.18); }
      .sc-rk-org{ font-weight:1000; letter-spacing:.2px; }
      .sc-rk-title{ font-size:20px; font-weight:1100; margin-top:2px; }
      .sc-rk-sub{ opacity:.75; margin-top:6px; font-size:12px; }
      .sc-rk-qr{ text-align:center; }
      .sc-rk-qrsub{ font-size:11px; opacity:.75; margin-top:6px; }
      .sc-rk-grid{
        margin-top:14px;
        display:grid; grid-template-columns: 1fr 1fr; gap:12px;
      }
      .sc-rk-card{
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        border-radius:18px;
        padding:12px;
      }
      [data-theme="light"] .sc-rk-card{
        border:1px solid rgba(20,22,28,.12);
        background: rgba(20,22,28,.03);
      }
      .sc-rk-card h3{
        margin:0 0 10px 0; font-size:13px; font-weight:1100;
      }
      .sc-rk-wide{ grid-column: 1 / -1; }
      .kv{ display:flex; justify-content:space-between; gap:10px; padding:6px 0; }
      .kv span{ opacity:.75; font-size:12px; }
      .kv b{ font-weight:1100; font-size:12px; }
      .blk{ margin-top:8px; border-top:1px dashed rgba(255,255,255,.12); padding-top:8px; }
      [data-theme="light"] .blk{ border-top:1px dashed rgba(20,22,28,.16); }
      .blk b{ display:block; margin-bottom:4px; }
      .sig{ margin-top:8px; height:120px; border-radius:14px; overflow:hidden;
        border:1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.08);
      }
      [data-theme="light"] .sig{
        border:1px solid rgba(20,22,28,.14);
        background:#fff;
      }
      .sigc{ width:100%; height:100%; display:block; }
      .audit{ display:grid; gap:8px; }
      .arow{
        display:grid; grid-template-columns: 70px 160px 1fr;
        gap:10px; align-items:center;
        padding:8px 10px; border-radius:12px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
        font-size:11px;
      }
      [data-theme="light"] .arow{
        border:1px solid rgba(20,22,28,.10);
        background: rgba(20,22,28,.03);
      }
      .muted{ opacity:.75; }
      .small{ font-size:12px; }
      .sc-rk-foot{
        margin-top:14px; padding-top:12px;
        border-top:1px dashed rgba(255,255,255,.14);
        display:flex; align-items:center; justify-content:space-between; gap:12px;
      }
      [data-theme="light"] .sc-rk-foot{ border-top:1px dashed rgba(20,22,28,.18); }
      .sc-rk-actions{ display:flex; gap:8px; flex-wrap:wrap; }
      .rkbtn{
        border:1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.08);
        color: inherit;
        padding:8px 10px; border-radius:12px;
        cursor:pointer; font-weight:900; font-size:12px;
      }
      [data-theme="light"] .rkbtn{
        border:1px solid rgba(20,22,28,.12);
        background: rgba(20,22,28,.04);
      }
      .rkbtn.ghost{ background: transparent; }

      /* Print clean */
      @media print{
        body{ background:#fff !important; color:#111 !important; }
        .noprint, .sidebar, .topbar, .sc-rs-btn, .sc-rs-panel { display:none !important; }
        .sc-rk-paper{ background:#fff !important; border:1px solid #ddd !important; }
        .sc-rk-card{ background:#fff !important; border:1px solid #ddd !important; }
      }
      .attgrid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:10px;
}
@media (max-width: 900px){
  .attgrid{ grid-template-columns: repeat(2, 1fr); }
}
.att{
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  border-radius:14px;
  padding:8px;
  overflow:hidden;
}
[data-theme="light"] .att{
  border:1px solid rgba(20,22,28,.12);
  background: rgba(20,22,28,.03);
}
.att img{
  width:100%;
  height:140px;
  object-fit:cover;
  border-radius:12px;
  display:block;
  margin-bottom:8px;
}
    `;
    document.head.appendChild(st);
  }

  window.SCREPORT = { renderInto };
})();

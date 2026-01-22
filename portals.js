/* =========================================================
   Portals UI — Smart Clinic OS
   4 role-specific portals rendered inside index.html
   Requires: rbac.js (window.SCRBAC), engine.js (optional)
   ========================================================= */
(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const ROLE_KEY = "sc_role";

  function role(){ return localStorage.getItem(ROLE_KEY) || "school"; }

  // Create a container right below hero
  function ensurePortalMount(){
    const main = $(".main");
    if(!main) return null;

    let mount = $("#portalMount");
    if(mount) return mount;

    mount = document.createElement("section");
    mount.id = "portalMount";
    mount.className = "portalMount";
    // place after hero and before views
    const hero = $(".hero");
    const views = $(".views");
    if(hero && views) main.insertBefore(mount, views);
    else main.appendChild(mount);
    return mount;
  }

  function setActiveView(view){
    // reuse your existing navigation behavior:
    const btn = $(`.nav-item[data-view="${view}"]`);
    if(btn) btn.click();
  }

  /* ---------------- Role Portals ---------------- */
  function portalStaff(){
    return `
      <div class="portal portal-staff">
        <div class="portal-head">
          <div>
            <div class="portal-kicker">Clinic Staff Console</div>
            <h2>واجهة العيادة (طبيب/تمريض)</h2>
            <div class="muted">إدارة الحالات، فحص سريع، تقارير سريرية، وتنبيهات.</div>
          </div>
          <div class="portal-actions">
            <button class="btn" id="pStaffNewCase">فحص جديد</button>
            <button class="btn ghost" id="pStaffReport">توليد تقرير</button>
            <button class="btn ghost" id="pStaffSync">مزامنة حساسات</button>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <h3>مسار العمل السريع</h3>
              <div class="muted small">Triage → قرار → تقرير</div>
            </div>
            <div class="steps">
              <div class="step"><span class="chip">1</span><b>فتح فحص</b><span class="muted">بيانات + سبب الزيارة</span></div>
              <div class="step"><span class="chip">2</span><b>قراءات</b><span class="muted">حرارة/نبض/SpO₂/ضغط</span></div>
              <div class="step"><span class="chip">3</span><b>تصنيف</b><span class="muted">LOW/MED/HIGH/CRIT</span></div>
              <div class="step"><span class="chip">4</span><b>مخرجات</b><span class="muted">عودة/متابعة/إحالة</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>اختصارات سريرية</h3>
              <div class="muted small">للعرض فقط</div>
            </div>
            <div class="quickGrid">
              <button class="btn ghost qbtn" data-q="asthma">بروتوكول ربو</button>
              <button class="btn ghost qbtn" data-q="fever">بروتوكول حمّى</button>
              <button class="btn ghost qbtn" data-q="injury">إسعاف جروح</button>
              <button class="btn ghost qbtn" data-q="sync">Sync IoT</button>
            </div>
            <div class="divider"></div>
            <div class="muted small" id="pStaffNote">اختر اختصار لإظهار ملاحظة سريعة.</div>
          </div>
        </div>
      </div>
    `;
  }

  function portalSchool(){
    return `
      <div class="portal portal-school">
        <div class="portal-head">
          <div>
            <div class="portal-kicker">School Admin Console</div>
            <h2>واجهة إدارة المدرسة</h2>
            <div class="muted">مؤشرات مجمّعة، إجراءات إدارية، وتقارير غير حساسة.</div>
          </div>
          <div class="portal-actions">
            <button class="btn" id="pSchoolDash">فتح لوحة المؤشرات</button>
            <button class="btn ghost" id="pSchoolExport">تصدير ملخص إداري</button>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <h3>مؤشرات المدرسة</h3>
              <div class="muted small">Aggregate only</div>
            </div>
            <div class="impact">
              <div class="impact-item"><div class="impact-k">غياب صحي</div><div class="impact-v">↓ 12%</div></div>
              <div class="impact-item"><div class="impact-k">حالات متابعة</div><div class="impact-v">5</div></div>
              <div class="impact-item"><div class="impact-k">تنبيهات اليوم</div><div class="impact-v">2</div></div>
              <div class="impact-item"><div class="impact-k">جاهزية التقارير</div><div class="impact-v">↑ 40%</div></div>
            </div>
            <div class="divider"></div>
            <div class="muted small">هذه لوحة تجميعية — بدون تفاصيل سريرية.</div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>إجراءات مطلوبة</h3>
              <div class="muted small">Work queue</div>
            </div>
            <div class="queue" id="pSchoolQueue">
              <div class="qitem"><b>استدعاء ولي أمر</b><span class="muted">حالة متابعة — (Demo)</span><span class="tag">OPEN</span></div>
              <div class="qitem"><b>تنسيق نقل/إحالة</b><span class="muted">تنبيه عالي — (Demo)</span><span class="tag">OPEN</span></div>
              <div class="qitem"><b>توعية صفية</b><span class="muted">نمط أعراض — (Demo)</span><span class="tag">PLANNED</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function portalStudent(){
    return `
      <div class="portal portal-student">
        <div class="portal-head">
          <div>
            <div class="portal-kicker">Student Portal</div>
            <h2>واجهة الطالب</h2>
            <div class="muted">طلب زيارة + إرشادات + آخر توصية.</div>
          </div>
          <div class="portal-actions">
            <button class="btn" id="pStudentRequest">طلب زيارة للعيادة</button>
            <button class="btn ghost" id="pStudentTips">إرشادات صحية</button>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <h3>آخر زيارة</h3>
              <div class="muted small">مختصر فقط</div>
            </div>
            <div class="kv">
              <div class="kvrow"><span class="muted">الحالة:</span><b>مستقرة</b></div>
              <div class="kvrow"><span class="muted">التوصية:</span><b>ماء + راحة 20 دقيقة</b></div>
              <div class="kvrow"><span class="muted">متابعة:</span><b>إن لزم</b></div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>إرشادات سريعة</h3>
              <div class="muted small">Micro-learning</div>
            </div>
            <div class="tips">
              <div class="tip">🍎 اشرب ماء بانتظام</div>
              <div class="tip">😴 نوم كفاية يقلل الصداع</div>
              <div class="tip">😷 لو عندك أعراض عدوى: بلّغ المعلم</div>
              <div class="tip">🏃 تمارين خفيفة يوميًا</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function portalParent(){
    return `
      <div class="portal portal-parent">
        <div class="portal-head">
          <div>
            <div class="portal-kicker">Parent Portal</div>
            <h2>واجهة ولي الأمر</h2>
            <div class="muted">تنبيهات + تقارير + موافقات (Demo).</div>
          </div>
          <div class="portal-actions">
            <button class="btn" id="pParentAlerts">عرض التنبيهات</button>
            <button class="btn ghost" id="pParentReport">فتح التقارير</button>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <h3>تنبيه ولي الأمر</h3>
              <div class="muted small">Demo notification</div>
            </div>
            <div class="parentAlert">
              <div class="paTop">
                <span class="badge">HIGH</span>
                <span class="muted">اليوم ${escapeHtml(new Date().toLocaleDateString("ar-SA"))}</span>
              </div>
              <div class="paBody">
                تم رصد مؤشرات تستدعي متابعة. يُرجى الاطلاع على التقرير المختصر.
              </div>
              <div class="divider"></div>
              <div class="consents">
                <button class="btn" id="pParentAck">تأكيد الاستلام</button>
                <button class="btn ghost" id="pParentConsent">موافقة على إحالة (Demo)</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>معلومات صحية مهمة</h3>
              <div class="muted small">حساسية/مرض مزمن (Demo)</div>
            </div>
            <div class="form">
              <label>حساسية</label>
              <input id="pAllergy" placeholder="مثال: حساسية فستق" />
              <label>مرض مزمن</label>
              <input id="pChronic" placeholder="مثال: ربو" />
              <label>ملاحظة</label>
              <textarea id="pParentNote" rows="3" placeholder="أي ملاحظة للعيادة..."></textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPortal(){
    const mount = ensurePortalMount();
    if(!mount) return;

    const r = role();

    // Hide original hero badges/actions? (keep them, but we’ll soften)
    const hero = $(".hero");
    if(hero){
      hero.style.opacity = ".98";
    }

    if(r === "staff") mount.innerHTML = portalStaff();
    else if(r === "school") mount.innerHTML = portalSchool();
    else if(r === "student") mount.innerHTML = portalStudent();
    else if(r === "parent") mount.innerHTML = portalParent();
    else mount.innerHTML = portalSchool();

    bindPortalActions();
  }

  function bindPortalActions(){
    const r = role();

    // staff
    $("#pStaffNewCase")?.addEventListener("click", ()=> setActiveView("triage"));
    $("#pStaffReport")?.addEventListener("click", ()=> setActiveView("reports"));
    $("#pStaffSync")?.addEventListener("click", ()=> {
      try{ window.ClinicEngine?.syncSensors?.(); }catch(_){}
      toast("تمت مزامنة الحساسات (Demo)");
    });
    $$(".qbtn").forEach(b=>{
      b.addEventListener("click", ()=>{
        const q = b.dataset.q;
        const note = $("#pStaffNote");
        if(!note) return;
        if(q==="asthma") note.textContent = "بروتوكول ربو (Demo): تقييم تنفّس + SpO₂ + موسّع قصبي حسب السياسة.";
        else if(q==="fever") note.textContent = "بروتوكول حمّى (Demo): قياس حرارة + سوائل + متابعة + إبلاغ ولي الأمر إن لزم.";
        else if(q==="injury") note.textContent = "إسعاف جروح (Demo): تنظيف + ضغط + تغطية + تقرير مختصر.";
        else if(q==="sync"){
          try{ window.ClinicEngine?.syncSensors?.(); }catch(_){}
          note.textContent = "تمت المزامنة (Demo).";
        }
      });
    });

    // school
    $("#pSchoolDash")?.addEventListener("click", ()=> setActiveView("dashboard"));
    $("#pSchoolExport")?.addEventListener("click", ()=>{
      const txt = [
        "Smart School Clinic — Administrative Summary (Demo)",
        "-----------------------------------------------",
        "KPIs (Demo):",
        "- Absence (health): -12%",
        "- Follow-up cases: 5",
        "- Alerts today: 2",
        "- Reports readiness: +40%",
        "",
        "Note: Demo build for presentation."
      ].join("\n");
      downloadText("admin-summary.txt", txt);
      toast("تم تصدير الملخص الإداري");
    });

    // student
    $("#pStudentRequest")?.addEventListener("click", ()=>{
      toast("تم إرسال طلب زيارة (Demo) — راجع العيادة");
      setActiveView("triage");
    });
    $("#pStudentTips")?.addEventListener("click", ()=> toast("إرشادات: اشرب ماء + راحة + بلّغ المعلم عند الحاجة"));

    // parent
    $("#pParentAlerts")?.addEventListener("click", ()=> setActiveView("alerts"));
    $("#pParentReport")?.addEventListener("click", ()=> setActiveView("reports"));
    $("#pParentAck")?.addEventListener("click", ()=> toast("تم تأكيد الاستلام ✅"));
    $("#pParentConsent")?.addEventListener("click", ()=> toast("تمت الموافقة (Demo) ✅"));
  }

  /* ---------------- Tiny toast + download ---------------- */
  function toast(msg){
    let t = $("#toast");
    if(!t){
      t = document.createElement("div");
      t.id = "toast";
      t.style.position = "fixed";
      t.style.bottom = "18px";
      t.style.left = "18px";
      t.style.zIndex = "9999";
      t.style.padding = "12px 14px";
      t.style.borderRadius = "14px";
      t.style.border = "1px solid var(--stroke)";
      t.style.background = "var(--panel)";
      t.style.backdropFilter = "blur(10px)";
      t.style.boxShadow = "0 16px 40px rgba(0,0,0,.25)";
      t.style.fontWeight = "900";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
    clearTimeout(toast._tm);
    toast._tm = setTimeout(()=>{ t.style.opacity = "0"; t.style.transform="translateY(6px)"; }, 1800);
  }

  function downloadText(filename, text){
    const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  /* ---------------- Styles (injected) ---------------- */
  function injectPortalStyles(){
    if($("#portalStyles")) return;
    const css = `
      .portalMount{ margin: 14px 0 14px; }
      .portal{ border:1px solid var(--stroke); border-radius: var(--radius2); background: linear-gradient(180deg, var(--panel), transparent 75%); box-shadow: var(--shadow); padding:16px; }
      .portal-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
      .portal-kicker{ display:inline-flex; padding:7px 10px; border-radius:999px; border:1px solid var(--stroke); background: var(--panel); font-weight:1000; font-size:.85rem; color: color-mix(in srgb, var(--cyan) 62%, var(--text)); }
      .portal h2{ margin:8px 0 6px; font-weight:1000; }
      .portal-actions{ display:flex; gap:10px; flex-wrap:wrap; }
      .steps{ display:grid; gap:10px; }
      .step{ display:grid; grid-template-columns: 36px 1fr; gap:10px; align-items:center; padding:10px 12px; border-radius:16px; border:1px solid var(--stroke); background: var(--panel); }
      .chip{ width:28px; height:28px; border-radius:10px; display:grid; place-items:center; font-weight:1000; border:1px solid var(--stroke); background: color-mix(in srgb, var(--panel2) 75%, transparent); }
      .quickGrid{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
      .qbtn{ justify-content:center; }
      .queue{ display:grid; gap:10px; }
      .qitem{ display:grid; gap:4px; padding:10px 12px; border-radius:16px; border:1px solid var(--stroke); background: var(--panel); }
      .kv{ display:grid; gap:10px; }
      .kvrow{ display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:16px; border:1px solid var(--stroke); background: var(--panel); }
      .tips{ display:grid; gap:10px; }
      .tip{ padding:10px 12px; border-radius:16px; border:1px solid var(--stroke); background: var(--panel); }
      .parentAlert{ padding:10px 12px; border-radius:16px; border:1px solid var(--stroke); background: var(--panel); }
      .paTop{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
      .paBody{ margin-top:8px; line-height:1.75; color: var(--muted); font-weight:800; }
      .consents{ display:flex; gap:10px; flex-wrap:wrap; }
      .portal-staff{ border-color: color-mix(in srgb, var(--cyan) 28%, var(--stroke)); }
      .portal-school{ border-color: color-mix(in srgb, var(--blue) 26%, var(--stroke)); }
      .portal-student{ border-color: color-mix(in srgb, var(--good) 22%, var(--stroke)); }
      .portal-parent{ border-color: color-mix(in srgb, var(--warn) 18%, var(--stroke)); }
      @media (max-width:1100px){ .quickGrid{ grid-template-columns:1fr; } }
    `;
    const st = document.createElement("style");
    st.id = "portalStyles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------------- Hook into RBAC changes ---------------- */
  function hookRoleChanges(){
    const sel = $("#roleSelect");
    if(sel){
      sel.addEventListener("change", ()=> {
        renderPortal();
      });
    }
  }

  function init(){
    injectPortalStyles();
    renderPortal();
    hookRoleChanges();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

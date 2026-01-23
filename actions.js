/* ===========================================================
   actions.js
   - Connect UI buttons -> Firestore operations via window.FB
   - Works with: firebase-init.js (window.FB), rbac.js (window.RBAC)
   - Emits: window.bus?.emit(...) OR window.dispatchEvent(...)
   =========================================================== */

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const now = () => new Date().toISOString();
  const uid = () => crypto?.randomUUID?.() || ("id_" + Math.random().toString(16).slice(2) + Date.now());

  function toast(msg, type = "info") {
    // بسيط + ما يكسر CSS عندك
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.bottom = "18px";
      el.style.left = "18px";
      el.style.zIndex = "9999";
      el.style.maxWidth = "420px";
      el.style.padding = "12px 14px";
      el.style.borderRadius = "14px";
      el.style.background = "rgba(20,20,35,.82)";
      el.style.border = "1px solid rgba(255,255,255,.12)";
      el.style.backdropFilter = "blur(10px)";
      el.style.color = "#fff";
      el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Tahoma, Arial";
      el.style.fontSize = "14px";
      el.style.lineHeight = "1.4";
      el.style.boxShadow = "0 14px 40px rgba(0,0,0,.35)";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    el.style.transition = "opacity .25s ease, transform .25s ease";
    if (type === "ok") el.style.borderColor = "rgba(0,255,180,.25)";
    if (type === "err") el.style.borderColor = "rgba(255,70,120,.35)";
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
    }, 2200);
  }

  function emit(evt, payload) {
    try { window.bus?.emit?.(evt, payload); } catch {}
    try { window.dispatchEvent(new CustomEvent(evt, { detail: payload })); } catch {}
  }

  function role() {
    return (window.RBAC?.getRoleFromPage?.() || localStorage.getItem("ROLE") || "student").toLowerCase();
  }

  function sessionId() {
    let sid = localStorage.getItem("SID");
    if (!sid) { sid = uid(); localStorage.setItem("SID", sid); }
    return sid;
  }

  function userName() {
    return localStorage.getItem("USER_NAME") || "مستخدم";
  }

  function childId() {
    return localStorage.getItem("CHILD_ID") || null;
  }

  async function requireFB() {
    if (!window.FB) throw new Error("firebase-init.js غير محمّل");
    // FB.ready(): optional لو موجود
    if (window.FB.ready) await window.FB.ready();
    return window.FB;
  }

  async function audit(action, data = {}) {
    try {
      const FB = await requireFB();
      await FB.addDoc("audit", {
        at: now(),
        sid: sessionId(),
        role: role(),
        userName: userName(),
        action,
        data,
        page: document.body?.getAttribute("data-page") || "unknown",
      });
    } catch {}
  }

  /* ===============================
     Helpers: create sample values
     =============================== */
  function simulateVitals() {
    // محاكاة حساسات (تقدر تبدلها لاحقًا لقراءة حقيقية)
    const hr = Math.floor(60 + Math.random() * 60);
    const spo2 = Math.floor(92 + Math.random() * 8);
    const temp = +(36 + Math.random() * 2).toFixed(1);
    const bpSys = Math.floor(100 + Math.random() * 40);
    const bpDia = Math.floor(60 + Math.random() * 25);
    return { hr, spo2, temp, bp: `${bpSys}/${bpDia}` };
  }

  function triageScore({ hr, spo2, temp }) {
    let score = 0;
    if (hr > 110) score += 2;
    if (hr > 130) score += 3;
    if (spo2 < 95) score += 2;
    if (spo2 < 92) score += 3;
    if (temp >= 38) score += 2;
    if (temp >= 39) score += 3;

    let priority = "روتيني";
    if (score >= 3) priority = "متوسط";
    if (score >= 6) priority = "عالي";
    if (score >= 8) priority = "حرج";

    let risk = "منخفض";
    if (score >= 3) risk = "متوسط";
    if (score >= 6) risk = "مرتفع";

    return { score, priority, risk };
  }

  /* ===============================
     Firestore models
     =============================== */
  async function createVisit() {
    const FB = await requireFB();
    const vitals = simulateVitals();
    const tri = triageScore(vitals);

    const doc = {
      at: now(),
      sid: sessionId(),
      role: role(),
      userName: userName(),
      complaint: ($("#complaint")?.value || $("#txtComplaint")?.value || "شكوى عامة").trim(),
      vitals,
      triage: tri,
      status: "new",
      page: document.body?.getAttribute("data-page") || "unknown",
    };

    const id = await FB.addDoc("visits", doc);
    await audit("visit.create", { id, triage: tri });
    emit("visit:update", { id, ...doc });
    toast("تم إنشاء زيارة جديدة ✅", "ok");
    return { id, ...doc };
  }

  async function runTriage() {
    // إذا فيه زيارة حديثة نخزن النتيجة كـ "triage" مستقلة + نحدث آخر زيارة
    const FB = await requireFB();
    const vitals = simulateVitals();
    const tri = triageScore(vitals);

    const triDoc = {
      at: now(),
      sid: sessionId(),
      role: role(),
      userName: userName(),
      vitals,
      triage: tri,
      note: "تم تشغيل الفرز الذكي (محاكاة)",
    };

    const tid = await FB.addDoc("triage", triDoc);
    await audit("triage.run", { tid, triage: tri });
    emit("triage:update", { id: tid, ...triDoc });

    // اختياري: تحديث UI KPI boxes لو موجودة
    const map = {
      "#kpiRisk": tri.risk,
      "#kpiPriority": tri.priority,
      "#kpiScore": String(tri.score),
      "#kpiHR": String(vitals.hr),
      "#kpiSpO2": String(vitals.spo2),
      "#kpiTemp": String(vitals.temp),
      "#kpiBP": String(vitals.bp),
    };
    Object.entries(map).forEach(([sel, val]) => {
      const el = $(sel);
      if (el) el.textContent = val;
    });

    toast(`تم الفرز ✅ (${tri.priority})`, "ok");
    return { id: tid, ...triDoc };
  }

  async function createCaseFromLast() {
    const FB = await requireFB();

    // حاول نجيب آخر triage من نفس SID
    const triList = await FB.query("triage", [
      ["sid", "==", sessionId()],
    ], { orderBy: ["at", "desc"], limit: 1 });

    const tri = triList?.[0] || null;
    const complaint = ($("#complaint")?.value || $("#txtComplaint")?.value || "شكوى عامة").trim();

    const doc = {
      at: now(),
      sid: sessionId(),
      createdByRole: role(),
      createdByName: userName(),
      complaint,
      vitals: tri?.vitals || simulateVitals(),
      triage: tri?.triage || triageScore(simulateVitals()),
      status: "open",
      priority: tri?.triage?.priority || "متوسط",
      risk: tri?.triage?.risk || "متوسط",
      decision: null,
      assignedTo: null,
      notes: [],
      timeline: [{ at: now(), msg: "تم إنشاء الحالة" }],
    };

    const id = await FB.addDoc("cases", doc);
    await audit("case.create", { id, priority: doc.priority, risk: doc.risk });
    emit("case:update", { id, ...doc });
    toast("تم إنشاء حالة ✅", "ok");
    return { id, ...doc };
  }

  async function updateCase(caseId, patch = {}) {
    const FB = await requireFB();
    if (!caseId) throw new Error("caseId غير موجود");
    const p = { ...patch, updatedAt: now() };

    // timeline
    if (patch.timelineMsg) {
      const msg = patch.timelineMsg;
      delete p.timelineMsg;
      p._appendTimeline = { at: now(), msg };
    }

    await FB.patchDoc("cases", caseId, p);
    await audit("case.update", { caseId, patch: p });
    emit("case:update", { id: caseId, patch: p });
    toast("تم تحديث الحالة ✅", "ok");
  }

  async function decideCase(caseId, decisionText) {
    const dec = (decisionText || $("#decision")?.value || "قرار طبي").trim();
    await updateCase(caseId, {
      decision: dec,
      status: "decided",
      timelineMsg: `قرار الطبيب: ${dec}`,
    });
    await audit("case.decide", { caseId, decision: dec });
  }

  async function assignCase(caseId, assigneeName) {
    const name = (assigneeName || $("#assignee")?.value || "طبيب المناوب").trim();
    await updateCase(caseId, {
      assignedTo: name,
      timelineMsg: `تم إسناد الحالة إلى: ${name}`,
    });
    await audit("case.assign", { caseId, assignedTo: name });
  }

  /* ===============================
     Admin Requests (approvals)
     =============================== */
  async function createRequest(kind = "access") {
    const FB = await requireFB();
    const doc = {
      at: now(),
      sid: sessionId(),
      requesterRole: role(),
      requesterName: userName(),
      kind,
      status: "pending",
      payload: {
        page: document.body?.getAttribute("data-page") || "unknown",
        note: ($("#requestNote")?.value || "طلب").trim(),
      },
    };
    const id = await FB.addDoc("requests", doc);
    await audit("requests.create", { id, kind });
    emit("requests:update", { id, ...doc });
    toast("تم إرسال الطلب للإدارة ✅", "ok");
    return { id, ...doc };
  }

  async function approveRequest(requestId) {
    const FB = await requireFB();
    await FB.patchDoc("requests", requestId, { status: "approved", decidedAt: now(), decidedBy: userName() });
    await audit("requests.approve", { requestId });
    emit("requests:update", { id: requestId, status: "approved" });
    toast("تمت الموافقة ✅", "ok");
  }

  async function rejectRequest(requestId) {
    const FB = await requireFB();
    await FB.patchDoc("requests", requestId, { status: "rejected", decidedAt: now(), decidedBy: userName() });
    await audit("requests.reject", { requestId });
    emit("requests:update", { id: requestId, status: "rejected" });
    toast("تم الرفض ✅", "ok");
  }

  /* ===============================
     Parent linking
     =============================== */
  async function linkChild(childCode) {
    const FB = await requireFB();
    const code = (childCode || $("#childCode")?.value || "").trim();
    if (!code) {
      toast("اكتب كود الطالب أولًا", "err");
      return;
    }

    // ننشئ رابط (Parent <-> Child) بسيط
    const doc = {
      at: now(),
      parentSid: sessionId(),
      parentName: userName(),
      childCode: code,
      status: "linked",
    };
    const id = await FB.addDoc("links", doc);
    localStorage.setItem("CHILD_ID", code);
    await audit("child.link", { id, childCode: code });
    emit("link:update", { id, ...doc });
    toast("تم ربط ولي الأمر بالطالب ✅", "ok");
    return { id, ...doc };
  }

  /* ===============================
     Read helpers for lists
     =============================== */
  async function fetchMyCases() {
    const FB = await requireFB();
    // طالب: حسب SID، ولي أمر: حسب CHILD_ID (كود)، طبيب/إدارة: all
    const r = role();
    let list = [];

    if (r === "student") {
      list = await FB.query("cases", [["sid", "==", sessionId()]], { orderBy: ["at", "desc"], limit: 50 });
    } else if (r === "parent") {
      const cid = childId();
      // في نسختنا البسيطة نخزن childCode داخل complaint أو payload لاحقًا
      // هنا نخليها تجيب “كل الحالات” كـ demo لو ما فيه cid
      if (cid) list = await FB.query("cases", [["complaint", ">=", "" ]], { orderBy: ["at", "desc"], limit: 50 });
      else list = await FB.query("cases", [], { orderBy: ["at", "desc"], limit: 50 });
    } else {
      list = await FB.query("cases", [], { orderBy: ["at", "desc"], limit: 80 });
    }

    emit("cases:list", list || []);
    return list || [];
  }

  async function fetchRequests() {
    const FB = await requireFB();
    const list = await FB.query("requests", [], { orderBy: ["at", "desc"], limit: 80 });
    emit("requests:list", list || []);
    return list || [];
  }

  /* ===============================
     Button wiring
     =============================== */
  function bindClick(sel, fn) {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        // RBAC guard (لو انقفل زر بالـ RBAC غالبًا ما بينضغط أصلاً)
        if (el.classList.contains("isDisabled")) return;

        el.dataset.busy = "1";
        el.style.opacity = "0.85";
        await fn(el, e);
      } catch (err) {
        console.error(err);
        toast(err?.message || "خطأ غير متوقع", "err");
      } finally {
        el.dataset.busy = "0";
        el.style.opacity = "";
      }
    });
  }

  function bindAll() {
    // Student
    bindClick("#btnVisit", async () => createVisit());
    bindClick("#btnTriage", async () => runTriage());
    bindClick("#btnMyCases", async () => fetchMyCases());
    bindClick("#btnMyReport", async () => { emit("report:open", { sid: sessionId() }); toast("فتح التقرير…", "ok"); });
    bindClick("#btnNotify", async () => { await audit("notify.send", { msg: "تنبيه (Demo)" }); toast("تم إرسال تنبيه (Demo) ✅", "ok"); });

    // Doctor
    bindClick("#btnCases", async () => fetchMyCases());
    bindClick("#btnOpenCase", async () => {
      // يحاول يقرأ caseId من input أو data
      const caseId = $("#caseId")?.value || $("#btnOpenCase")?.dataset.caseId || localStorage.getItem("OPEN_CASE_ID");
      if (!caseId) return toast("حط Case ID أولًا", "err");
      localStorage.setItem("OPEN_CASE_ID", caseId);
      emit("case:open", { id: caseId });
      toast("تم فتح الحالة ✅", "ok");
    });
    bindClick("#btnUpdateCase", async () => {
      const caseId = $("#caseId")?.value || localStorage.getItem("OPEN_CASE_ID");
      if (!caseId) return toast("حط Case ID أولًا", "err");
      const note = ($("#caseNote")?.value || "تحديث").trim();
      await updateCase(caseId, { timelineMsg: note });
    });
    bindClick("#btnDecision", async () => {
      const caseId = $("#caseId")?.value || localStorage.getItem("OPEN_CASE_ID");
      if (!caseId) return toast("حط Case ID أولًا", "err");
      await decideCase(caseId);
    });
    bindClick("#btnFollowup", async () => {
      const FB = await requireFB();
      const caseId = $("#caseId")?.value || localStorage.getItem("OPEN_CASE_ID");
      if (!caseId) return toast("حط Case ID أولًا", "err");
      const doc = { at: now(), caseId, by: userName(), role: role(), plan: ($("#followupPlan")?.value || "متابعة خلال 24 ساعة").trim() };
      const id = await FB.addDoc("followups", doc);
      await audit("followup.create", { id, caseId });
      emit("followup:update", { id, ...doc });
      toast("تم إنشاء متابعة ✅", "ok");
    });

    // Admin
    bindClick("#btnRequests", async () => fetchRequests());
    bindClick("#btnApprove", async () => {
      const reqId = $("#requestId")?.value || $("#btnApprove")?.dataset.requestId;
      if (!reqId) return toast("حط Request ID أولًا", "err");
      await approveRequest(reqId);
    });
    bindClick("#btnReject", async () => {
      const reqId = $("#requestId")?.value || $("#btnReject")?.dataset.requestId;
      if (!reqId) return toast("حط Request ID أولًا", "err");
      await rejectRequest(reqId);
    });
    bindClick("#btnAssign", async () => {
      const caseId = $("#caseId")?.value || localStorage.getItem("OPEN_CASE_ID");
      if (!caseId) return toast("حط Case ID أولًا", "err");
      await assignCase(caseId);
    });
    bindClick("#btnHeatmap", async () => { emit("heatmap:open", {}); toast("Heatmap (Demo) ✅", "ok"); });

    // Parent
    bindClick("#btnLinkChild", async () => linkChild());
    bindClick("#btnChildCases", async () => fetchMyCases());
    bindClick("#btnChildReport", async () => { emit("report:open", { childId: childId() }); toast("فتح تقرير الابن…", "ok"); });
    bindClick("#btnConsent", async () => { await audit("consent.manage", { status: "accepted-demo" }); toast("تم تحديث الموافقة (Demo) ✅", "ok"); });

    // Common
    bindClick("#btnHelp", async () => { toast("وضع المساعدة: فعّال ✅", "ok"); await audit("help.open"); });
    bindClick("#btnLogout", async () => {
      localStorage.removeItem("ROLE");
      localStorage.removeItem("SID");
      localStorage.removeItem("OPEN_CASE_ID");
      await audit("logout");
      toast("تم تسجيل الخروج ✅", "ok");
      setTimeout(() => location.href = "index.html", 700);
    });

    // زر “إنشاء حالة” لو موجود بأي صفحة
    bindClick("#btnCreateCase", async () => createCaseFromLast());
  }

  /* ===============================
     Auto-detect buttons by data-action
     (لو عندك أزرار كثيرة وتبيها تشتغل بدون IDs)
     =============================== */
  function bindDataActionFallback() {
    $$("[data-action]").forEach((el) => {
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";

      el.addEventListener("click", async (e) => {
        const act = el.getAttribute("data-action");
        if (!act) return;

        // إذا RBAC قافلها
        if (el.classList.contains("isDisabled")) return;

        try {
          switch (act) {
            case "btnVisit": return await createVisit();
            case "btnTriage": return await runTriage();
            case "btnCreateCase": return await createCaseFromLast();
            case "btnMyCases":
            case "btnCases": return await fetchMyCases();
            case "btnRequests": return await fetchRequests();
            case "btnLinkChild": return await linkChild();
            case "btnApprove": {
              const reqId = el.dataset.requestId || $("#requestId")?.value;
              if (!reqId) return toast("حط Request ID أولًا", "err");
              return await approveRequest(reqId);
            }
            case "btnReject": {
              const reqId = el.dataset.requestId || $("#requestId")?.value;
              if (!reqId) return toast("حط Request ID أولًا", "err");
              return await rejectRequest(reqId);
            }
            default:
              toast(`هذا الزر جاهز… بس ما ربطنا أكشنه: ${act}`, "info");
              await audit("ui.click.unwired", { act });
          }
        } catch (err) {
          console.error(err);
          toast(err?.message || "خطأ غير متوقع", "err");
        }
      });
    });
  }

  /* ===============================
     Public API
     =============================== */
  window.Actions = {
    createVisit,
    runTriage,
    createCaseFromLast,
    updateCase,
    decideCase,
    assignCase,
    createRequest,
    approveRequest,
    rejectRequest,
    linkChild,
    fetchMyCases,
    fetchRequests,
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindAll();
    bindDataActionFallback();

    // حدث عام
    emit("actions:ready", { at: now(), role: role(), sid: sessionId() });

    // سجل جلسة
    audit("page.load", { role: role(), sid: sessionId() }).catch(() => {});
  });
})();

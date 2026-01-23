// actions.js — Works with window.__FB from firebase-init.js

(function () {
  const $ = (s, r = document) => r.querySelector(s);

  function toast(msg) {
    console.log("[SSC]", msg);
    // لو عندك Toast UI عدّل هنا
    alert(msg);
  }

  function getRole() {
    return localStorage.getItem("ssc_role") || "guest";
  }

  function setRole(role) {
    localStorage.setItem("ssc_role", role);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  async function waitFirebase() {
    // انتظر firebase-init.js يجهّز
    for (let i = 0; i < 60; i++) {
      if (window.__FB && window.__FB.db) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  }

  async function createCase(payload) {
    const ok = await waitFirebase();
    if (!ok) return toast("Firebase غير جاهز");

    const { db, addDoc, collection, serverTimestamp } = window.__FB;

    const role = getRole();
    const caseDoc = {
      ...payload,
      roleCreatedBy: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: payload.status || "new",
      priority: payload.priority || "normal",
      risk: payload.risk || "low",
      source: "web",
    };

    const ref = await addDoc(collection(db, "cases"), caseDoc);
    toast("✅ تم إنشاء الحالة: " + ref.id);
    return ref.id;
  }

  async function updateCase(caseId, patch) {
    const ok = await waitFirebase();
    if (!ok) return toast("Firebase غير جاهز");
    const { db, doc, updateDoc, serverTimestamp } = window.__FB;

    await updateDoc(doc(db, "cases", caseId), {
      ...patch,
      updatedAt: serverTimestamp()
    });
    toast("✅ تم تحديث الحالة: " + caseId);
  }

  async function createVisit(payload) {
    const ok = await waitFirebase();
    if (!ok) return toast("Firebase غير جاهز");
    const { db, addDoc, collection, serverTimestamp } = window.__FB;

    const ref = await addDoc(collection(db, "visits"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    toast("✅ تم إنشاء الزيارة: " + ref.id);
    return ref.id;
  }

  // ---- Bind buttons generically via data-action ----
  function bindActions() {
    // Role selector (لو موجود عندك)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-role]");
      if (!btn) return;
      setRole(btn.getAttribute("data-role"));
      toast("تم اختيار الدور: " + getRole());
    });

    document.addEventListener("click", async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.getAttribute("data-action");
      const page = document.body?.getAttribute("data-page") || "unknown";

      try {
        // Student: create a case
        if (action === "case:create") {
          const complaint = ($("#complaint")?.value || "").trim();
          const bp = ($("#v_bp")?.textContent || "").trim();
          const spo2 = ($("#v_spo2")?.textContent || "").trim();
          const hr = ($("#v_hr")?.textContent || "").trim();
          const temp = ($("#v_temp")?.textContent || "").trim();

          const caseId = await createCase({
            page,
            complaint: complaint || "بدون وصف",
            vitals: { bp, spo2, hr, temp },
            studentName: ($("#studentName")?.value || "طالب").trim(),
          });

          // خزّن آخر caseId عشان صفحات ثانية تعرفه
          if (caseId) localStorage.setItem("ssc_last_case_id", caseId);
          return;
        }

        // Parent: approve consent
        if (action === "consent:approve") {
          const caseId = localStorage.getItem("ssc_last_case_id");
          if (!caseId) return toast("ما عندي Case ID… سوّ حالة أولًا");
          await updateCase(caseId, { consent: "approved", consentAt: nowISO() });
          return;
        }

        if (action === "consent:reject") {
          const caseId = localStorage.getItem("ssc_last_case_id");
          if (!caseId) return toast("ما عندي Case ID… سوّ حالة أولًا");
          await updateCase(caseId, { consent: "rejected", consentAt: nowISO() });
          return;
        }

        // Doctor: start visit
        if (action === "visit:start") {
          const caseId = localStorage.getItem("ssc_last_case_id");
          if (!caseId) return toast("ما عندي Case ID… سوّ حالة أولًا");

          const visitId = await createVisit({
            caseId,
            doctor: ($("#doctorName")?.value || "طبيب").trim(),
            notes: ($("#doctorNotes")?.value || "").trim(),
            status: "in_progress"
          });

          if (visitId) localStorage.setItem("ssc_last_visit_id", visitId);
          await updateCase(caseId, { status: "in_review", visitId });
          return;
        }

        // Admin: close case
        if (action === "case:close") {
          const caseId = localStorage.getItem("ssc_last_case_id");
          if (!caseId) return toast("ما عندي Case ID… سوّ حالة أولًا");
          await updateCase(caseId, { status: "closed", closedAt: nowISO() });
          return;
        }

        toast("هذا الزر مربوط لكن ما له منطق بعد: " + action);
      } catch (err) {
        console.error(err);
        toast("⚠️ حصل خطأ: " + (err?.message || err));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindActions();
  });

})();

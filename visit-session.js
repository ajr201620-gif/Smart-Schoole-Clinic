/* visit-session.js — Virtual Visit Session Engine (Static)
   - Creates/updates session timeline
   - Join roles: student/doctor/parent
   - Simple text chat + room state
*/

(() => {
  "use strict";

  const KEY = {
    VISITS: "ssc_visits_v1",
  };

  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); return v; }
  };

  const now = () => new Date().toISOString();
  const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

  function getVisits() { return LS.get(KEY.VISITS, []); }
  function setVisits(list) { return LS.set(KEY.VISITS, list); }

  function findVisit(visitId) {
    const visits = getVisits();
    const i = visits.findIndex(v => v.id === visitId);
    return { visits, i, v: i >= 0 ? visits[i] : null };
  }

  function pushTimeline(v, txt) {
    v.timeline = v.timeline || [];
    v.timeline.unshift({ at: now(), txt });
    return v;
  }

  function pushChat(v, who, msg) {
    v.chat = v.chat || [];
    v.chat.push({ id: uid(), at: now(), who, msg });
    return v;
  }

  function start(visitObj, who = "student") {
    const visitId = visitObj?.id;
    if (!visitId) return visitObj;

    const { visits, i, v } = findVisit(visitId);
    if (i < 0 || !v) return visitObj;

    v.session = v.session || {
      startedAt: null,
      endedAt: null,
      state: "idle", // idle | live | ended
      participants: { student: false, doctor: false, parent: false },
    };

    if (!v.session.startedAt) {
      v.session.startedAt = now();
      v.session.state = "live";
      pushTimeline(v, "بدأت الجلسة (Visit Session)");
    }

    // mark participant
    if (who === "student") v.session.participants.student = true;
    if (who === "doctor") v.session.participants.doctor = true;
    if (who === "parent") v.session.participants.parent = true;

    pushTimeline(v, `انضم للجلسة: ${label(who)}`);

    // welcome chat
    pushChat(v, "system", `✅ تم انضمام ${label(who)} للجلسة`);
    setVisits(Object.assign(visits, { [i]: v }) && visits);

    try { window.bus?.emit?.("visit:update", v); } catch {}
    return v;
  }

  function end(visitId, by = "doctor", summary = "") {
    const { visits, i, v } = findVisit(visitId);
    if (i < 0 || !v) return null;

    v.session = v.session || {};
    v.session.endedAt = now();
    v.session.state = "ended";
    v.status = "completed";
    v.sessionSummary = summary || v.sessionSummary || "";

    pushTimeline(v, `انتهت الجلسة بواسطة: ${label(by)}`);
    pushChat(v, "system", "🧾 تم إنهاء الزيارة الافتراضية");

    v.updatedAt = now();
    visits[i] = v;
    setVisits(visits);

    try { window.bus?.emit?.("visit:update", v); } catch {}
    return v;
  }

  function sendMessage(visitId, who, msg) {
    const { visits, i, v } = findVisit(visitId);
    if (i < 0 || !v) return null;

    const clean = String(msg || "").trim();
    if (!clean) return v;

    pushChat(v, who, clean);
    v.updatedAt = now();
    visits[i] = v;
    setVisits(visits);

    try { window.bus?.emit?.("visit:update", v); } catch {}
    return v;
  }

  function getActive(visitId) {
    const { v } = findVisit(visitId);
    return v || null;
  }

  function label(who) {
    if (who === "student") return "الطالب";
    if (who === "doctor") return "الطبيب";
    if (who === "parent") return "ولي الأمر";
    if (who === "system") return "النظام";
    return "مشارك";
  }

  // Expose
  window.VisitSession = { start, end, sendMessage, getActive };

})();

(() => {
  "use strict";

  const createVisit = ({ caseId, fromRole, studentName }) => {
    const id = SSC.uid("visit");
    const v = {
      id,
      caseId,
      status: "requested", // requested | accepted | rejected | active | ended
      createdAt: SSC.nowISO(),
      updatedAt: SSC.nowISO(),
      participants: {
        student: { name: studentName || "طالب", joined: false },
        doctor:  { name: "طبيب", joined: false },
        parent:  { name: "ولي أمر", joined: false, invited: false }
      },
      notes: [],
      roomCode: id.slice(-6).toUpperCase()
    };

    SSC.updateDB((db) => {
      db.visits.unshift(v);
      return db;
    });

    SSC.audit("visit.create", { id, caseId, fromRole });
    SSC.toast("زيارة افتراضية", "تم إنشاء طلب زيارة افتراضية");
    SSC.emit("visit.updated", v);
    return v;
  };

  const updateVisit = (id, patch) => {
    let updated = null;
    SSC.updateDB((db) => {
      const idx = db.visits.findIndex(v => v.id === id);
      if (idx === -1) return db;
      db.visits[idx] = {
        ...db.visits[idx],
        ...patch,
        updatedAt: SSC.nowISO()
      };
      updated = db.visits[idx];
      return db;
    });
    if (updated) SSC.emit("visit.updated", updated);
    return updated;
  };

  const addNote = (id, role, text) => {
    updateVisit(id, {});
    SSC.updateDB((db) => {
      const v = db.visits.find(x => x.id === id);
      if (!v) return db;
      v.notes.unshift({ id: SSC.uid("note"), at: SSC.nowISO(), role, text });
      v.notes = v.notes.slice(0, 60);
      return db;
    });
    SSC.audit("visit.note", { id, role });
    SSC.emit("visit.updated", SSC.getDB().visits.find(x => x.id === id));
  };

  const accept = (id) => {
    const v = updateVisit(id, { status: "accepted" });
    SSC.audit("visit.accept", { id });
    SSC.toast("تم قبول الزيارة", `رمز الغرفة: ${v?.roomCode || ""}`);
    return v;
  };
  const reject = (id, reason="") => {
    const v = updateVisit(id, { status: "rejected", rejectReason: reason });
    SSC.audit("visit.reject", { id, reason });
    SSC.toast("تم رفض الزيارة", reason || "تم الرفض");
    return v;
  };

  const inviteParent = (id) => {
    const v = updateVisit(id, {
      participants: {
        ...SSC.getDB().visits.find(x => x.id === id)?.participants,
        parent: {
          ...(SSC.getDB().visits.find(x => x.id === id)?.participants?.parent || {}),
          invited: true
        }
      }
    });
    SSC.audit("visit.inviteParent", { id });
    SSC.toast("تمت دعوة ولي الأمر", "يمكنه الانضمام للزيارة");
    return v;
  };

  const start = (id) => {
    const v = updateVisit(id, { status: "active" });
    SSC.audit("visit.start", { id });
    return v;
  };

  const end = (id) => {
    const v = updateVisit(id, { status: "ended" });
    SSC.audit("visit.end", { id });
    SSC.toast("انتهت الزيارة", "تم إغلاق الجلسة");
    return v;
  };

  window.SSC_VISIT = { createVisit, updateVisit, addNote, accept, reject, inviteParent, start, end };
})();

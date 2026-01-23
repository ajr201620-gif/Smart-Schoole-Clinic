(() => {
  "use strict";

  const issueSlip = ({ caseId, type, days, notes }) => {
    const id = SSC.uid("slip");
    const slip = {
      id,
      caseId,
      type: type || "راحة", // راحة | إحالة
      days: days || 1,
      notes: notes || "",
      issuedAt: SSC.nowISO()
    };

    SSC.updateDB((db) => {
      db.slips.unshift(slip);
      db.slips = db.slips.slice(0, 300);
      return db;
    });

    SSC.audit("slip.issue", { id, caseId, type, days });
    SSC.toast("تم إصدار إجراء", `${slip.type} (${slip.days} يوم)`);
    SSC.emit("slip.created", slip);
    return slip;
  };

  window.SSC_SLIPS = { issueSlip };
})();

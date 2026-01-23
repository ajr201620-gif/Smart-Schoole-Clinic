(() => {
  "use strict";

  const consentForVisit = (visitId, allow = true) => {
    const id = SSC.uid("consent");
    const c = {
      id,
      visitId,
      allow,
      at: SSC.nowISO()
    };
    SSC.updateDB((db) => {
      db.consents.unshift(c);
      db.consents = db.consents.slice(0, 200);
      return db;
    });
    SSC.audit("parent.consent", { visitId, allow });
    SSC.toast("موافقة ولي الأمر", allow ? "تمت الموافقة" : "تم الرفض");
    SSC.emit("consent.updated", c);
    return c;
  };

  const myChildCases = () => {
    const db = SSC.getDB();
    // نسخة عرض: نعرض آخر 10 حالات
    return (db.cases || []).slice(0, 10);
  };

  window.SSC_PARENT = { consentForVisit, myChildCases };
})();

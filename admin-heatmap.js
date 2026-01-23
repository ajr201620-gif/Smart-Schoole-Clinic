(() => {
  "use strict";

  const byPriority = (cases) => {
    const out = { critical:0, urgent:0, routine:0 };
    cases.forEach(c => out[c.triage?.priority || "routine"] = (out[c.triage?.priority || "routine"] || 0) + 1);
    return out;
  };

  const stats = () => {
    const db = SSC.getDB();
    const cases = db.cases || [];
    const slips = db.slips || [];
    const p = byPriority(cases);

    return {
      totalCases: cases.length,
      critical: p.critical || 0,
      urgent: p.urgent || 0,
      routine: p.routine || 0,
      slips: slips.length,
      followUp: cases.filter(c => (c.triage?.risk || 0) >= 45).length
    };
  };

  window.SSC_ADMIN = { stats };
})();

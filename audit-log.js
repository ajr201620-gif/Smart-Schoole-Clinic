(() => {
  "use strict";

  const get = (limit=80) => (SSC.getDB().audit || []).slice(0, limit);

  window.SSC_AUDIT = { get };
})();

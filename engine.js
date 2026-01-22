/* ===========================================================
   SMART CLINIC OS — Engine (Safe / Lightweight)
   - Logger
   - IoT mock sync (safe hooks)
   - Helpers for future integrations
   - Does NOT require any external libs
   =========================================================== */

(() => {
  "use strict";

  const now = () => new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const ts = () => `${pad2(now().getHours())}:${pad2(now().getMinutes())}:${pad2(now().getSeconds())}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  const Engine = {
    version: "2026.0.1",
    state: {
      bootAt: ts(),
      lastSyncAt: null,
      sensors: {
        thermometer: { status: "ready", last: null },
        spo2: { status: "ready", last: null },
        bp: { status: "ready", last: null },
        scale: { status: "optional", last: null }
      },
      log: []
    },

    // ---------- Logging ----------
    log(message, level = "info") {
      const item = { t: ts(), level, message };
      this.state.log.unshift(item);
      this.state.log = this.state.log.slice(0, 80);
      this._renderExternalLog();
      // also mirror to console (nice for debugging)
      const tag = level === "warn" ? "⚠️" : level === "error" ? "⛔" : "ℹ️";
      console.log(`[${tag}][ENGINE ${this.version}][${item.t}] ${message}`);
      return item;
    },

    // Try to write to #sysLog if exists (keeps UI updated)
    _renderExternalLog() {
      const el = document.querySelector("#sysLog");
      if (!el) return;

      const rows = this.state.log.slice(0, 24).map((x) => {
        const cls = x.level === "warn" ? "warn" : x.level === "error" ? "warn" : "";
        return `<div class="logline ${cls}"><span class="muted">${x.t}</span><span>${escapeHtml(x.message)}</span></div>`;
      });
      el.innerHTML = rows.join("");
    },

    // ---------- Sensor Mock ----------
    // Generates "safe demo" vitals (never use as medical truth)
    _mockReadings() {
      // Normal-ish demo ranges
      const temp = +(36.6 + Math.random() * 1.3).toFixed(1); // 36.6 - 37.9
      const hr = rand(70, 105);
      const spo2 = rand(96, 99);
      const sbp = rand(105, 125);
      const dbp = rand(65, 82);

      return {
        temperature: temp,
        heartRate: hr,
        spo2,
        bp: `${sbp}/${dbp}`,
        bp_sbp: sbp,
        bp_dbp: dbp
      };
    },

    // Exposed: syncSensors()
    // - Updates engine internal sensor timestamps
    // - If page has vitals elements, updates them (non-breaking)
    syncSensors() {
      const reading = this._mockReadings();

      this.state.lastSyncAt = ts();
      this.state.sensors.thermometer.last = { t: ts(), v: reading.temperature };
      this.state.sensors.spo2.last = { t: ts(), v: reading.spo2 };
      this.state.sensors.bp.last = { t: ts(), v: reading.bp };

      // Update UI if elements exist
      setText("#vTemp", String(reading.temperature));
      setText("#vHr", String(reading.heartRate));
      setText("#vSpo2", String(reading.spo2));
      setText("#vBp", String(reading.bp));

      this.log(`IoT Sync (demo): Temp=${reading.temperature} HR=${reading.heartRate} SpO₂=${reading.spo2} BP=${reading.bp}`);

      // Optional: update #sysStatus if exists
      const st = document.querySelector("#sysStatus");
      if (st) st.textContent = "System: Sensors synced (demo)";

      return reading;
    },

    // Exposed: reset()
    reset() {
      this.state.lastSyncAt = null;
      Object.keys(this.state.sensors).forEach((k) => (this.state.sensors[k].last = null));
      this.log("Engine reset");
      const st = document.querySelector("#sysStatus");
      if (st) st.textContent = "System: Ready";
    },

    // ---------- API placeholders (future) ----------
    // For later integrations, you can attach real APIs without touching UI code:
    async sendCaseToAPI(caseObj) {
      // placeholder — keep it safe
      this.log("sendCaseToAPI called (placeholder) — no network call executed");
      return { ok: true, mode: "demo", caseId: caseObj?.id || null };
    },

    // Health checks (for UI)
    health() {
      const ok = true;
      return {
        ok,
        version: this.version,
        bootAt: this.state.bootAt,
        lastSyncAt: this.state.lastSyncAt,
        sensors: this.state.sensors
      };
    }
  };

  // Helpers
  function setText(sel, txt) {
    const el = document.querySelector(sel);
    if (el) el.textContent = txt;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  // Expose globally for the UI controller to call safely
  window.ClinicEngine = Engine;

  // Boot log
  Engine.log("Engine booted");
})();

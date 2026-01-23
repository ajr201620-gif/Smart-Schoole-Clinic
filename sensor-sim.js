/* =========================================================
   sensor-sim.js — Smart School Clinic OS
   - Simulate vitals (BP / SpO2 / HR / Temp)
   - Writes into #v_bp #v_spo2 #v_hr #v_temp if found
   - Exposes window.Sensors for other modules
   ========================================================= */

(() => {
  "use strict";

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round1 = (n) => Math.round(n * 10) / 10;

  function byId(id) { return document.getElementById(id); }
  function setText(id, v) { const el = byId(id); if (el) el.textContent = String(v); }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function makeVitals(mode = "normal") {
    // modes: normal | mild | urgent
    let hr, spo2, temp, sys, dia;

    if (mode === "normal") {
      hr = Math.round(rand(68, 96));
      spo2 = Math.round(rand(96, 99));
      temp = round1(rand(36.4, 37.4));
      sys = Math.round(rand(108, 128));
      dia = Math.round(rand(70, 84));
    } else if (mode === "mild") {
      hr = Math.round(rand(90, 120));
      spo2 = Math.round(rand(93, 96));
      temp = round1(rand(37.4, 38.4));
      sys = Math.round(rand(125, 145));
      dia = Math.round(rand(80, 92));
    } else {
      // urgent
      hr = Math.round(rand(120, 160));
      spo2 = Math.round(rand(85, 93));
      temp = round1(rand(38.4, 40.2));
      sys = Math.round(rand(85, 105));
      dia = Math.round(rand(55, 70));
    }

    // clamp safety
    hr = clamp(hr, 40, 220);
    spo2 = clamp(spo2, 60, 100);
    temp = clamp(temp, 34.0, 42.0);
    sys = clamp(sys, 70, 200);
    dia = clamp(dia, 40, 130);

    return {
      hr,
      spo2,
      temp,
      bp: `${sys}/${dia}`,
      sys,
      dia,
      at: new Date().toISOString(),
      mode
    };
  }

  function scoreRisk(v) {
    // quick heuristic risk scoring
    let score = 0;
    if (v.spo2 < 92) score += 35;
    else if (v.spo2 < 95) score += 15;

    if (v.hr > 130) score += 25;
    else if (v.hr > 110) score += 12;

    if (v.temp >= 39.0) score += 25;
    else if (v.temp >= 38.0) score += 12;

    if (v.sys < 90 || v.dia < 60) score += 20;
    else if (v.sys > 150 || v.dia > 95) score += 10;

    score = clamp(score, 0, 100);

    let level = "LOW";
    if (score >= 70) level = "CRITICAL";
    else if (score >= 40) level = "MEDIUM";

    return { score, level };
  }

  function render(v) {
    setText("v_bp", v.bp);
    setText("v_spo2", v.spo2);
    setText("v_hr", v.hr);
    setText("v_temp", v.temp);
  }

  function simulate(mode) {
    const v = makeVitals(mode || pick(["normal", "normal", "mild", "urgent"]));
    const risk = scoreRisk(v);

    const payload = { ...v, riskScore: risk.score, riskLevel: risk.level };
    render(payload);

    // store last reading
    try {
      localStorage.setItem("SSC_LAST_VITALS", JSON.stringify(payload));
    } catch {}

    // emit bus event if exists
    if (window.bus?.emit) window.bus.emit("vitals:update", payload);

    return payload;
  }

  // public api
  window.Sensors = {
    simulate,
    makeVitals,
    scoreRisk,
    getLast() {
      try { return JSON.parse(localStorage.getItem("SSC_LAST_VITALS") || "null"); }
      catch { return null; }
    }
  };

  // auto wire button if exists
  document.addEventListener("DOMContentLoaded", () => {
    const btn = byId("btnSimulate");
    if (btn) btn.addEventListener("click", () => simulate());

    // initial auto fill
    if (byId("v_hr") || byId("v_spo2") || byId("v_temp") || byId("v_bp")) {
      simulate("normal");
    }
  });

})();

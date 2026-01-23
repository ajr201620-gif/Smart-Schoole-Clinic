/* sensor-sim.js — Virtual Sensors Generator (Demo → Backend-ready)
   Generates vitals with realistic ranges and scenarios.
*/

(() => {
  "use strict";

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => Math.round(rnd(a, b));

  function scenarioWeights(mode) {
    // return probabilities for [normal, moderate, critical]
    if (mode === "normal") return [0.86, 0.12, 0.02];
    if (mode === "moderate") return [0.25, 0.65, 0.10];
    if (mode === "critical") return [0.05, 0.25, 0.70];
    if (mode === "confirm") return [0.60, 0.32, 0.08];
    return [0.55, 0.35, 0.10]; // mixed
  }

  function chooseScenario(mode = "mixed") {
    const w = scenarioWeights(mode);
    const x = Math.random();
    const a = w[0], b = w[0] + w[1];
    if (x < a) return "normal";
    if (x < b) return "moderate";
    return "critical";
  }

  function genForScenario(sc) {
    // Base ranges (school age)
    let hr, spo2, temp, bpSys, bpDia, rr;

    if (sc === "normal") {
      hr = rndi(70, 105);
      spo2 = rndi(96, 100);
      temp = +(rnd(36.2, 37.4).toFixed(1));
      bpSys = rndi(98, 128);
      bpDia = rndi(58, 82);
      rr = rndi(14, 22);
    } else if (sc === "moderate") {
      const type = Math.random();
      if (type < 0.33) {
        // mild fever + tachy
        hr = rndi(95, 125);
        spo2 = rndi(94, 98);
        temp = +(rnd(37.8, 38.7).toFixed(1));
        bpSys = rndi(102, 138);
        bpDia = rndi(60, 88);
        rr = rndi(18, 28);
      } else if (type < 0.66) {
        // mild hypoxia
        hr = rndi(90, 120);
        spo2 = rndi(92, 95);
        temp = +(rnd(36.8, 37.8).toFixed(1));
        bpSys = rndi(100, 136);
        bpDia = rndi(60, 86);
        rr = rndi(20, 32);
      } else {
        // high BP / stress
        hr = rndi(88, 118);
        spo2 = rndi(95, 99);
        temp = +(rnd(36.4, 37.6).toFixed(1));
        bpSys = rndi(135, 155);
        bpDia = rndi(80, 98);
        rr = rndi(16, 26);
      }
    } else {
      const type = Math.random();
      if (type < 0.5) {
        // severe fever + tachy + dehydration
        hr = rndi(120, 155);
        spo2 = rndi(90, 94);
        temp = +(rnd(39.0, 40.4).toFixed(1));
        bpSys = rndi(88, 110);
        bpDia = rndi(50, 70);
        rr = rndi(26, 40);
      } else {
        // respiratory issue
        hr = rndi(110, 150);
        spo2 = rndi(86, 92);
        temp = +(rnd(37.8, 39.6).toFixed(1));
        bpSys = rndi(92, 120);
        bpDia = rndi(52, 76);
        rr = rndi(30, 44);
      }
    }

    // Slight noise + clamp
    hr = clamp(hr + rndi(-3, 3), 45, 190);
    spo2 = clamp(spo2 + rndi(-1, 1), 75, 100);
    temp = +clamp(temp + rnd(-0.1, 0.1), 34, 41).toFixed(1);
    bpSys = clamp(bpSys + rndi(-2, 2), 70, 200);
    bpDia = clamp(bpDia + rndi(-2, 2), 40, 130);
    rr = clamp(rr + rndi(-1, 1), 10, 55);

    return { hr, spo2, temp, bpSys, bpDia, rr };
  }

  function computeBPString(v) {
    return `${v.bpSys}/${v.bpDia}`;
  }

  function scoreSeverity(v) {
    let score = 0;

    // Temp
    if (v.temp >= 39.5) score += 28;
    else if (v.temp >= 38.5) score += 20;
    else if (v.temp >= 37.8) score += 12;
    else score += 4;

    // SpO2
    if (v.spo2 <= 90) score += 32;
    else if (v.spo2 <= 93) score += 24;
    else if (v.spo2 <= 95) score += 12;
    else score += 4;

    // HR
    if (v.hr >= 140) score += 18;
    else if (v.hr >= 120) score += 12;
    else if (v.hr >= 105) score += 7;
    else score += 3;

    // BP systolic
    if (v.bpSys >= 155) score += 12;
    else if (v.bpSys >= 140) score += 8;
    else if (v.bpSys <= 92) score += 10;
    else score += 2;

    // RR
    if (v.rr >= 36) score += 10;
    else if (v.rr >= 28) score += 6;
    else score += 2;

    return clamp(score, 0, 100);
  }

  function generate(mode = "mixed") {
    const sc = chooseScenario(mode);
    const v = genForScenario(sc);
    const severity = scoreSeverity(v);

    const out = {
      ...v,
      bp: computeBPString(v),
      scenario: sc,
      severity,
      at: new Date().toISOString()
    };

    // notify
    try { window.bus?.emit?.("sensors:update", out); } catch {}
    return out;
  }

  // expose
  window.SensorSim = { generate };

})();

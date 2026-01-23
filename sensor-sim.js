(() => {
  "use strict";

  const rand = (a, b) => a + Math.random() * (b - a);
  const round1 = (n) => Math.round(n * 10) / 10;

  const simulate = (preset = "mixed") => {
    // Presets: normal / fever / asthma / stressed / mixed
    if (preset === "normal") {
      return {
        hr: Math.round(rand(68, 92)),
        spo2: Math.round(rand(96, 99)),
        temp: round1(rand(36.4, 37.2)),
        bpSys: Math.round(rand(105, 125)),
        bpDia: Math.round(rand(65, 82))
      };
    }

    if (preset === "fever") {
      return {
        hr: Math.round(rand(95, 125)),
        spo2: Math.round(rand(95, 98)),
        temp: round1(rand(38.0, 39.4)),
        bpSys: Math.round(rand(110, 135)),
        bpDia: Math.round(rand(70, 90))
      };
    }

    if (preset === "asthma") {
      return {
        hr: Math.round(rand(90, 135)),
        spo2: Math.round(rand(90, 95)),
        temp: round1(rand(36.6, 37.6)),
        bpSys: Math.round(rand(110, 140)),
        bpDia: Math.round(rand(70, 92))
      };
    }

    if (preset === "stressed") {
      return {
        hr: Math.round(rand(95, 135)),
        spo2: Math.round(rand(96, 99)),
        temp: round1(rand(36.2, 37.1)),
        bpSys: Math.round(rand(140, 170)),
        bpDia: Math.round(rand(90, 110))
      };
    }

    const bag = ["normal", "fever", "asthma", "stressed"];
    return simulate(SSC.pick(bag));
  };

  window.SSC_SENSORS = { simulate };
})();

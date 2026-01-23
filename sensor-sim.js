/* =========================================================
   Smart School Clinic OS — Sensors Simulator (Offline)
   - Generates realistic vitals for demo
   ========================================================= */

(function(){
  const rand = (min, max)=> Math.round((Math.random()*(max-min)+min)*10)/10;
  const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];

  function generate(){
    // Base ranges (school-aged)
    let temp = rand(36.4, 38.8);
    let hr   = Math.round(rand(72, 118));
    let spo2 = Math.round(rand(93, 100));
    let sys  = Math.round(rand(95, 125));
    let dia  = Math.round(rand(60, 80));

    // Introduce occasional abnormality (demo realism)
    const anomaly = Math.random();
    if(anomaly < 0.12){           // fever spike
      temp = rand(38.5, 39.6);
    }else if(anomaly < 0.20){     // low SpO2
      spo2 = Math.round(rand(88, 92));
    }else if(anomaly < 0.28){     // tachycardia
      hr = Math.round(rand(120, 145));
    }else if(anomaly < 0.34){     // BP abnormal
      sys = pick([rand(85,90), rand(140,165)]);
      dia = pick([rand(50,55), rand(85,95)]);
    }

    return {
      temp: Number(temp),
      hr: Number(hr),
      spo2: Number(spo2),
      bp: `${sys}/${dia}`,
      generatedAt: new Date().toISOString()
    };
  }

  // Optional: generate a second reading closer to first (confirmation)
  function generateSecond(prev){
    if(!prev) return generate();
    const jitter = (v, j)=> Math.round((v + rand(-j, j))*10)/10;

    const [sys, dia] = (prev.bp||"110/70").split("/").map(Number);

    return {
      temp: clamp(jitter(prev.temp, 0.3), 35.8, 40.2),
      hr:   Math.round(clamp(jitter(prev.hr, 6), 60, 170)),
      spo2: Math.round(clamp(jitter(prev.spo2, 2), 85, 100)),
      bp:   `${Math.round(clamp(jitter(sys, 6), 80, 180))}/${Math.round(clamp(jitter(dia, 5), 45, 110))}`,
      generatedAt: new Date().toISOString(),
      second: true
    };
  }

  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

  window.SCSIM = { generate, generateSecond };
})();

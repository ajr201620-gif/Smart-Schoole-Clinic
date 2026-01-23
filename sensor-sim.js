/* ===========================================================
   SENSOR SIM (client-side)
   =========================================================== */
(function(){
  const r=(a,b)=>a+Math.random()*(b-a);
  function gen(profile="normal"){
    let temp, hr, spo2, bpS, bpD;

    if(profile==="normal"){
      temp=+r(36.4,37.3).toFixed(1); hr=Math.round(r(72,105)); spo2=Math.round(r(96,99));
      bpS=Math.round(r(105,125)); bpD=Math.round(r(65,82));
    } else if(profile==="mild"){
      temp=+r(37.4,38.0).toFixed(1); hr=Math.round(r(90,118)); spo2=Math.round(r(95,98));
      bpS=Math.round(r(105,132)); bpD=Math.round(r(65,88));
    } else if(profile==="sick"){
      temp=+r(38.1,39.2).toFixed(1); hr=Math.round(r(108,138)); spo2=Math.round(r(92,96));
      bpS=Math.round(r(95,125)); bpD=Math.round(r(60,82));
    } else { // critical
      temp=+r(39.0,40.2).toFixed(1); hr=Math.round(r(128,158)); spo2=Math.round(r(88,93));
      bpS=Math.round(r(85,112)); bpD=Math.round(r(50,74));
    }

    return { temp, hr, spo2, bp:`${bpS}/${bpD}` };
  }
  window.SCSIM = { gen };
})();

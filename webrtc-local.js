/* ===========================================================
   WebRTC Local Signaling (NO SERVER)
   - Works across tabs on SAME device/origin using localStorage
   - Kiosk creates offer -> Doctor answers -> Kiosk connects
   - ICE candidates exchanged via localStorage
   =========================================================== */

(function(){
  const $ = (s,r=document)=>r.querySelector(s);

  const pcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  function key(room, kind){ return `sc_webrtc_${room}_${kind}`; }

  function lsSet(k, v){
    localStorage.setItem(k, JSON.stringify(v));
    localStorage.setItem("sc_webrtc_ping", String(Date.now()));
  }
  function lsGet(k){
    try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(_){ return null; }
  }

  async function initKiosk(room, els){
    const pc = new RTCPeerConnection(pcConfig);
    const local = els.localVideo, remote = els.remoteVideo;
    const status = (t)=> els.status && (els.status.textContent = t);

    // local media
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    stream.getTracks().forEach(tr=> pc.addTrack(tr, stream));
    local.srcObject = stream;
    await local.play();

    // remote media
    pc.ontrack = (e)=>{
      remote.srcObject = e.streams[0];
      remote.play().catch(()=>{});
    };

    // ICE -> store
    pc.onicecandidate = (e)=>{
      if(!e.candidate) return;
      const arr = lsGet(key(room,"ice_offer")) || [];
      arr.push(e.candidate);
      lsSet(key(room,"ice_offer"), arr);
    };

    // Create offer
    status("Generating offer…");
    const offer = await pc.createOffer({ offerToReceiveAudio:true, offerToReceiveVideo:true });
    await pc.setLocalDescription(offer);
    lsSet(key(room,"offer"), offer);
    status("Offer ready. Waiting doctor…");

    // Listen for answer + ICE from doctor
    async function tryAnswer(){
      const ans = lsGet(key(room,"answer"));
      if(ans && !pc.currentRemoteDescription){
        await pc.setRemoteDescription(ans);
        status("Answer received ✅ Connecting…");
      }
      // add doctor ICE
      const ice = lsGet(key(room,"ice_answer")) || [];
      for(const c of ice){
        try{ await pc.addIceCandidate(c); }catch(_){}
      }
    }

    window.addEventListener("storage", (e)=>{
      if(e.key === "sc_webrtc_ping") tryAnswer();
    });

    // also poll (in case storage event missed)
    const poll = setInterval(async ()=>{
      await tryAnswer();
      if(pc.connectionState === "connected"){
        status("Connected ✅");
        clearInterval(poll);
      }
    }, 600);

    return { pc, stream };
  }

  async function initDoctor(room, els){
    const pc = new RTCPeerConnection(pcConfig);
    const local = els.localVideo, remote = els.remoteVideo;
    const status = (t)=> els.status && (els.status.textContent = t);

    // local media
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    stream.getTracks().forEach(tr=> pc.addTrack(tr, stream));
    local.srcObject = stream;
    await local.play();

    // remote
    pc.ontrack = (e)=>{
      remote.srcObject = e.streams[0];
      remote.play().catch(()=>{});
    };

    // ICE -> store
    pc.onicecandidate = (e)=>{
      if(!e.candidate) return;
      const arr = lsGet(key(room,"ice_answer")) || [];
      arr.push(e.candidate);
      lsSet(key(room,"ice_answer"), arr);
    };

    async function acceptOffer(){
      const offer = lsGet(key(room,"offer"));
      if(!offer){
        status("No offer yet. Open kiosk call first.");
        return;
      }
      if(!pc.currentRemoteDescription){
        await pc.setRemoteDescription(offer);
        status("Offer received ✅ Creating answer…");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        lsSet(key(room,"answer"), answer);
        status("Answer sent ✅ Connecting…");
      }

      // add kiosk ICE
      const ice = lsGet(key(room,"ice_offer")) || [];
      for(const c of ice){
        try{ await pc.addIceCandidate(c); }catch(_){}
      }
    }

    window.addEventListener("storage", (e)=>{
      if(e.key === "sc_webrtc_ping") acceptOffer();
    });

    // poll
    const poll = setInterval(async ()=>{
      await acceptOffer();
      if(pc.connectionState === "connected"){
        status("Connected ✅");
        clearInterval(poll);
      }
    }, 600);

    await acceptOffer();
    return { pc, stream };
  }

  function clearRoom(room){
    ["offer","answer","ice_offer","ice_answer"].forEach(k=>{
      localStorage.removeItem(key(room,k));
    });
    localStorage.setItem("sc_webrtc_ping", String(Date.now()));
  }

  window.SCWEBRTC = { initKiosk, initDoctor, clearRoom };
})();

const MedicalBot = {
    expressions: {
        idle: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
        scanning: "https://api.dicebear.com/7.x/bottts/svg?seed=Liam&eyes=sensor",
        warning: "https://api.dicebear.com/7.x/bottts/svg?seed=Warn&eyes=danger",
        happy: "https://api.dicebear.com/7.x/bottts/svg?seed=Joy&eyes=happy"
    },
    init() {
        const div = document.createElement('div');
        div.className = 'bot-wrapper glass';
        div.innerHTML = `<img id="bot-face" src="${this.expressions.idle}" style="width:80px">
                         <div id="bot-speech" class="text-[10px] mt-2 text-center">أنا "ذكي"، جاهز لمساعدتك.</div>`;
        div.style.cssText = "position:fixed; bottom:30px; left:30px; width:180px; padding:20px; display:flex; flex-direction:column; align-items:center; z-index:1000;";
        document.body.appendChild(div);
    },
    updateState(state, msg) {
        document.getElementById('bot-face').src = this.expressions[state];
        document.getElementById('bot-speech').innerText = msg;
        VoiceAI.speak(msg);
    }
};

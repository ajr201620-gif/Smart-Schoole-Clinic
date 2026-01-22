const VoiceAI = {
    speak(text) {
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance();
            msg.text = text;
            msg.lang = 'ar-SA';
            window.speechSynthesis.speak(msg);
        }
    }
};

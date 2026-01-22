const TeleMedicine = {
    initiateEmergencyCall(data) {
        const overlay = document.createElement('div');
        overlay.className = 'tele-overlay';
        overlay.innerHTML = `
            <div class="tele-window glass p-10 flex flex-col items-center">
                <h2 class="text-red-500 font-black mb-4 animate-pulse">مكالمة طوارئ نشطة مع الطبيب...</h2>
                <div class="flex gap-4 mb-6">
                    <img src="https://img.freepik.com/free-photo/doctor-with-stethoscope_1150-12940.jpg" class="w-64 h-64 rounded-3xl object-cover border-4 border-blue-500">
                    <div class="bg-black/50 p-6 rounded-3xl w-64 flex items-center justify-center italic">فيديو الطالب نشط...</div>
                </div>
                <div class="bg-blue-500/10 p-4 rounded-xl w-full text-center text-blue-400 font-bold mb-4">بيانات لحظية للطبيب: 🌡️ ${data.temp} | 🫀 ${data.bpm}</div>
                <button onclick="PharmacyHub.issuePrescription('باراسيتامول', 'راحة تامة'); this.parentElement.parentElement.remove();" class="bg-emerald-600 px-10 py-4 rounded-2xl font-black">اعتماد التشخيص والصيدلية</button>
            </div>`;
        document.body.appendChild(overlay);
        MobileApp.sendPushNotification("طوارئ!", "بدأ ابنك مكالمة مع الطبيب.");
    }
};

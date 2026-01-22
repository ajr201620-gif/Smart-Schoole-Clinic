/* Smart Clinic Core Logic - v5.0
   System: جمع -> تحليل -> قرار -> استجابة -> متابعة
*/

// بيانات الطلاب الافتراضية المحمية (Blockchain Simulation)
const studentDB = {
    "12345": { name: "أحمد محمد", history: "حساسية موسمية", blood: "O+", parentID: "96650XXXXXXX" }
};

// وظيفة بدء المنظومة
function initSystem() {
    console.log("System Initialized: Smart Clinic AI is Online.");
    playAmbientSound(); // محاكاة صوت تقني
}

// 1. تسجيل الدخول والتعرف على الطالب
function loginStudent() {
    updateWorkflowUI(1);
    const mainDisplay = document.getElementById('main-content');
    mainDisplay.innerHTML = `<div class="loader"></div> <p class="tech-text">جاري استدعاء الملف من البلوك تشين...</p>`;
    
    setTimeout(() => {
        showVitalsScanner();
    }, 2000);
}

// 2. قياس العلامات الحيوية (IoT Simulation)
function showVitalsScanner() {
    updateWorkflowUI(2);
    const mainDisplay = document.getElementById('main-content');
    mainDisplay.innerHTML = `
        <div class="radar-section animate-in">
            <div class="radar-scan">
                <i class="fas fa-user-shield text-4xl text-cyan-400 animate-pulse"></i>
            </div>
            <h2 class="mt-8 text-2xl font-black italic">رصد المؤشرات الحيوية (IoT)</h2>
            <div class="grid grid-cols-2 gap-4 mt-6">
                <div class="vital-mini">Temp: <span id="t-live">--</span></div>
                <div class="vital-mini">Pulse: <span id="p-live">--</span></div>
            </div>
        </div>
    `;

    // محاكاة تدفق بيانات IoT اللحظي
    let t = 36.0;
    let p = 70;
    const interval = setInterval(() => {
        t += (Math.random() * 0.2);
        p += Math.floor(Math.random() * 5);
        document.getElementById('t-live').innerText = t.toFixed(1) + "°";
        document.getElementById('p-live').innerText = p + " bpm";
        if(t >= 37.5) {
            clearInterval(interval);
            triggerAIAnalysis(t, p);
        }
    }, 100);
}

// 4. الفرز الطبي الذكي (AI Analysis)
function triggerAIAnalysis(temp, pulse) {
    updateWorkflowUI(4);
    const mainDisplay = document.getElementById('main-content');
    
    mainDisplay.innerHTML = `
        <div class="ai-box p-8 glass-panel border-cyan-500/50">
            <h3 class="text-xl font-bold text-cyan-400 mb-4 italic">
                <i class="fas fa-brain"></i> نتائج الفرز الذكي (AI Triage)
            </h3>
            <div class="space-y-4">
                <p class="text-white">تحليل النمط: <span class="text-orange-400">ارتفاع طفيف في درجة الحرارة</span></p>
                <p class="text-white italic text-sm">التنبؤ بالمخاطر: احتمال بداية أعراض زكام (Risk: 15%)</p>
                <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p class="text-xs text-emerald-400">القرار الوقائي: إرسال تنبيه فوري للمنصة الموحدة ولولي الأمر.</p>
                </div>
            </div>
            <button onclick="document.location.reload()" class="btn-main mt-6 w-full">6. توثيق السجل الصحي (Blockchain)</button>
        </div>
    `;
}

function updateWorkflowUI(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-' + step).classList.add('active');
}

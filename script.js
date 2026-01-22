let currentStep = 1;

function nextStep(step) {
    const area = document.getElementById('work-area');
    
    // الانتقال من الخطوة 1 إلى 2: قياس العلامات تلقائياً (IoT)
    if(step === 2) {
        updateSidebar(2);
        area.innerHTML = `
            <div class="text-center animate-fade-in">
                <i class="fas fa-thermometer-half text-orange-500 text-5xl mb-6"></i>
                <h3 class="text-2xl font-bold mb-4 text-white font-mono uppercase tracking-widest italic text-center">رصد المؤشرات الصحية للطلاب لحظة بلحظة</h3>
                <div class="flex gap-10 justify-center">
                    <div class="bg-white/5 p-6 rounded-3xl border border-white/10 w-40">
                        <p class="text-xs text-gray-400">الحرارة</p>
                        <p class="text-3xl font-black text-orange-400">36.7°</p>
                    </div>
                    <div class="bg-white/5 p-6 rounded-3xl border border-white/10 w-40">
                        <p class="text-xs text-gray-400">الأكسجين</p>
                        <p class="text-3xl font-black text-blue-400">98%</p>
                    </div>
                </div>
                <button onclick="nextStep(3)" class="mt-8 bg-emerald-600 px-10 py-3 rounded-full font-bold">تأكيد البيانات</button>
            </div>
        `;
    }

    // الانتقال إلى الفرز الذكي (AI)
    if(step === 3) {
        updateSidebar(4);
        area.innerHTML = `
            <div class="w-full px-10">
                <h3 class="text-xl font-bold mb-4 italic"><i class="fas fa-robot text-blue-500"></i> نظام الفرز الطبي الذكي</h3>
                <div class="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/30">
                    <p class="text-blue-400 text-sm">تحليل الأنماط الصحية والتنبؤ بالمخاطر...</p>
                    <div class="h-2 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
                        <div class="h-full bg-blue-500 w-[75%] animate-pulse"></div>
                    </div>
                    <p class="mt-6 text-white leading-relaxed font-bold">التوصية: حالة مستقرة. يوصى براحة لمدة 15 دقيقة وإبلاغ ولي الأمر عبر المنصة الموحدة.</p>
                </div>
                <button onclick="finishSession()" class="mt-6 w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-gray-200 transition-colors">توثيق القرار في الملف الصحي (Blockchain)</button>
            </div>
        `;
    }
}

function updateSidebar(step) {
    document.querySelectorAll('[id^="step"]').forEach(el => el.classList.remove('step-active', 'opacity-100'));
    const active = document.getElementById('step' + step);
    active.classList.add('step-active', 'opacity-100');
}

function finishSession() {
    alert("تم اتخاذ القرار والتوثيق إلكترونياً ✅\nتم إشعار ولي الأمر والجهات الصحية المعنية.");
    location.reload();
}

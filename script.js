// --- إدارة التنقل بين الأقسام ---
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(sectionId).classList.remove('hidden');
    event.target.classList.add('active');

    if(sectionId === 'analytics') initChart();
}

// --- محاكاة آلية العمل المكونة من 6 خطوات ---
function proceedToStep(step) {
    const monitor = document.getElementById('ui-interactive-area');
    
    // الخطوة 2: قياس العلامات تلقائياً (IoT)
    if(step === 2) {
        updateStepUI(2);
        monitor.innerHTML = `
            <div class="animate-fade-in text-center">
                <i class="fas fa-wave-square text-5xl text-blue-500 mb-6 animate-pulse"></i>
                <h2 class="text-2xl font-black text-white mb-4 italic">2. قياس العلامات الحيوية تلقائياً</h2>
                <p class="text-slate-400 mb-8">يتم الآن سحب البيانات من الحساسات الذكية (IoT) ومعالجتها فورياً...</p>
                <div class="h-1 w-64 bg-slate-800 mx-auto rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 animate-[loading_2s_ease-in-out]"></div>
                </div>
            </div>
        `;
        
        // محاكاة وصول بيانات IoT
        setTimeout(() => {
            document.getElementById('v-temp').innerText = "36.8°C";
            document.getElementById('v-pulse').innerText = "72 bpm";
            document.getElementById('v-ox').innerText = "98 %";
            document.getElementById('v-weight').innerText = "65 kg";
            proceedToStep(4); // الانتقال التلقائي للفرز الذكي
        }, 2500);
    }

    // الخطوة 4: الفرز الطبي الذكي (AI)
    if(step === 4) {
        updateStepUI(4);
        setTimeout(() => {
            monitor.innerHTML = `
                <div class="animate-fade-in text-right p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] w-full max-w-xl">
                    <h3 class="text-xl font-black text-blue-400 mb-4 italic"><i class="fas fa-robot ml-2"></i> 4. الفرز الطبي الذكي (AI)</h3>
                    <p class="text-white text-sm leading-relaxed mb-6 font-bold">بناءً على تحليل البيانات الصحية: <br> • الحالة: مستقرة (خضراء) <br> • التوصية: إجهاد بسيط، يوصى بالراحة والعودة للفصل الدراسي بعد 15 دقيقة.</p>
                    <button onclick="proceedToStep(6)" class="w-full bg-blue-600 py-4 rounded-2xl font-black shadow-lg">6. اتخاذ القرار وتوثيق السجل (Blockchain)</button>
                </div>
            `;
        }, 1000);
    }

    // الخطوة 6: التوثيق النهائي
    if(step === 6) {
        updateStepUI(6);
        alert("تم توثيق القرار الطبي بنجاح في سجل الطالب المحمي بالبلوك تشين ✅\nتم إرسال إشعار فوري لولي الأمر والجهات الصحية.");
        location.reload();
    }
}

function updateStepUI(stepNum) {
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    document.getElementById('s' + stepNum).classList.add('active');
}

// --- محاكاة الرسوم البيانية للتحليل اللحظي ---
function initChart() {
    const ctx = document.getElementById('healthChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
            datasets: [{
                label: 'معدل الحالات المكتشفة مبكراً',
                data: [12, 19, 15, 25, 22],
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

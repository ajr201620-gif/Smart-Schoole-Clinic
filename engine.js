let chart;
let pulseData = Array(30).fill(70);

// تهيئة الرسم البياني للنبض الحي
function initChart() {
    const ctx = document.getElementById('pulseChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pulseData.map((_, i) => i),
            datasets: [{
                data: pulseData,
                borderColor: '#ef4444',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { display: false }, y: { display: false } },
            plugins: { legend: { display: false } },
            animation: { duration: 100 }
        }
    });
}

// محاكاة الفحص عبر AI و IoT
function startBioScan() {
    let timer = 0;
    const interval = setInterval(() => {
        const bpm = Math.floor(70 + Math.random() * 50);
        pulseData.push(bpm);
        pulseData.shift();
        chart.update();
        
        timer++;
        if(timer > 40) {
            clearInterval(interval);
            generateQR(`PATIENT_REPORT_${Date.now()}_RESULT:FEVER_ACTION:ISOLATE`);
            alert("تم انتهاء الفحص: تم رصد حالة نشطة. تم إشعار الإدارة وولي الأمر فوراً.");
        }
    }, 150);
}

// توليد رمز الاستجابة السريع
function generateQR(text) {
    const container = document.getElementById("qrcode");
    container.innerHTML = "";
    new QRCode(container, { text: text, width: 128, height: 128 });
}

// نظام تبديل التبويبات
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

window.onload = () => {
    initChart();
    generateQR("INITIAL_LOAD_SECURE");
    // بناء فصول المدرسة
    const grid = document.querySelector('.building-grid');
    for(let i=1; i<=12; i++) {
        const room = document.createElement('div');
        room.className = `room ${i === 3 ? 'alert' : ''}`;
        room.innerHTML = `فصل ${i}-أ`;
        grid.appendChild(room);
    }
};

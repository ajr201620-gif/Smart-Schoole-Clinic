let chart;
let pulseData = Array(30).fill(70);

function initChart() {
    const ctx = document.getElementById('pulseChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pulseData.map((_, i) => i),
            datasets: [{
                data: pulseData,
                borderColor: '#3b82f6',
                borderWidth: 3,
                pointRadius: 0,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { display: false }, y: { display: false } },
            plugins: { legend: { display: false } }
        }
    });
}

function startBioScan() {
    MedicalBot.updateState('scanning', "جاري سحب بيانات الحساسات الحيوية...");
    let timer = 0;
    const interval = setInterval(() => {
        const bpm = Math.floor(70 + Math.random() * 55);
        pulseData.push(bpm);
        pulseData.shift();
        chart.update();
        timer++;
        
        if(timer > 40) {
            clearInterval(interval);
            if(bpm > 100) {
                MedicalBot.updateState('warning', "تنبيه: مؤشرات غير مستقرة. جاري طلب الطبيب.");
                TeleMedicine.initiateEmergencyCall({name:'فهد محمد', temp:38.9, bpm:bpm, spo2:94});
            } else {
                MedicalBot.updateState('happy', "مؤشراتك ممتازة، تستطيع العودة لفصلك.");
                Blockchain.addBlock(`SCAN_NORMAL: BPM ${bpm}`);
            }
        }
    }, 150);
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

window.onload = () => {
    initChart();
    MedicalBot.init();
    const map = document.getElementById('school-map');
    for(let i=1; i<=12; i++) {
        const r = document.createElement('div');
        r.className = `room ${i===3?'alert':''}`;
        r.innerText = `فصل ${i}-أ`;
        map.appendChild(r);
    }
    new QRCode(document.getElementById("qrcode"), { text: "STUDENT_ID_8841", width: 120, height: 120 });
};

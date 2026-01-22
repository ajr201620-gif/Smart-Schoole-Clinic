// بيانات النظام والخدمات
const portals = {
    school: {
        title: "إدارة المدرسة", color: "#3b82f6", icon: 'fa-school',
        menu: [
            { id: 'map', name: 'خريطة الرصد اللحظي', icon: 'fa-map-marked-alt' },
            { id: 'impact', name: 'مؤشرات الأثر الدراسي', icon: 'fa-chart-line' }
        ]
    },
    doctor: {
        title: "بوابة الطبيب", color: "#10b981", icon: 'fa-user-md',
        menu: [
            { id: 'triage', name: 'الفرز الذكي (AI)', icon: 'fa-stethoscope' },
            { id: 'patients', name: 'سجلات Blockchain', icon: 'fa-link' }
        ]
    },
    student: {
        title: "بوابة الطالب", color: "#a855f7", icon: 'fa-user-graduate',
        menu: [
            { id: 'health-id', name: 'هويتي الصحية الرقمية', icon: 'fa-id-card' },
            { id: 'ar-edu', name: 'الواقع المعزز AR', icon: 'fa-vr-cardboard' }
        ]
    },
    parent: {
        title: "بوابة ولي الأمر", color: "#f59e0b", icon: 'fa-family',
        menu: [
            { id: 'live-track', name: 'متابعة الحالة الآن', icon: 'fa-heartbeat' },
            { id: 'history', name: 'التقارير الطبية', icon: 'fa-file-alt' }
        ]
    }
};

let notifications = [
    { id: 1, type: 'warning', title: 'تنبيه AI', msg: 'ارتفاع حرارة فصل 1-B', time: 'منذ دقيقة' }
];

// فتح بوابة محددة
function openPortal(type) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-interface').classList.remove('hidden');
    document.getElementById('noti-center').classList.remove('hidden');
    
    const portal = portals[type];
    document.getElementById('portal-title').innerText = portal.title;
    document.getElementById('user-avatar').innerHTML = `<i class="fas ${portal.icon} text-3xl" style="color:${portal.color}"></i>`;
    document.getElementById('user-avatar').style.borderColor = portal.color;

    renderSidebar(type);
    loadPage(type, portal.menu[0].id);
    renderNotifications();
}

function renderSidebar(type) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = portals[type].menu.map(item => `
        <button onclick="loadPage('${type}', '${item.id}')" class="nav-btn" id="btn-${item.id}">
            <i class="fas ${item.icon}"></i> <span>${item.name}</span>
        </button>
    `).join('');
}

function loadPage(type, pageId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + pageId)?.classList.add('active');
    
    const view = document.getElementById('portal-content');
    const title = document.getElementById('view-title');
    title.innerText = portals[type].menu.find(m => m.id === pageId).name;

    // عرض المحتوى بناء على الصفحة
    if (pageId === 'map') renderMap(view);
    else if (pageId === 'triage') renderTriage(view);
    else if (pageId === 'ar-edu') renderAR(view);
    else if (pageId === 'live-track') renderParentTrack(view);
    else view.innerHTML = `<div class="p-20 text-center glass rounded-3xl">جاري تحميل البيانات الرقمية...</div>`;
}

// محاكاة الخريطة
function renderMap(container) {
    container.innerHTML = `
        <div class="school-map">
            <div class="classroom safe"><span>فصل 1-A</span><p class="text-[10px] mt-2 text-emerald-500">مستقر</p></div>
            <div class="classroom warning"><span>فصل 1-B</span><p class="text-[10px] mt-2 text-orange-500">تنبيه حرارة</p></div>
            <div class="classroom safe"><span>فصل 2-A</span><p class="text-[10px] mt-2 text-emerald-500">مستقر</p></div>
            <div class="classroom safe"><span>فصل 2-B</span><p class="text-[10px] mt-2 text-emerald-500">مستقر</p></div>
        </div>
    `;
}

// محاكاة الفرز الذكي
function renderTriage(container) {
    container.innerHTML = `
        <div class="max-w-xl mx-auto glass-main p-10 rounded-[3rem] text-center">
            <div class="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 class="text-xl font-bold mb-4">في انتظار مسح الطالب (IoT)</h3>
            <button onclick="simulateAI()" class="bg-blue-600 px-10 py-4 rounded-2xl font-black shadow-lg">محاكاة فحص AI</button>
        </div>
    `;
}

function simulateAI() {
    sendNewNotification('اكتشاف حالة', 'تم رصد ارتفاع حرارة طالب (38.8) - نظام الفرز أصدر قرار العزل', 'warning');
    alert("AI Result: Fever Detected. Parent notified. Data stored in Blockchain.");
}

// إدارة التنبيهات
function toggleNotifications() {
    document.getElementById('noti-dropdown').classList.toggle('hidden');
}

function renderNotifications() {
    const list = document.getElementById('noti-list');
    list.innerHTML = notifications.map(n => `
        <div class="noti-item ${n.type}">
            <p class="text-[10px] font-bold uppercase">${n.title}</p>
            <p class="text-xs text-slate-400">${n.msg}</p>
        </div>
    `).join('');
    document.getElementById('noti-count').innerText = notifications.length;
}

function sendNewNotification(title, msg, type) {
    notifications.unshift({ id: Date.now(), type, title, msg, time: 'الآن' });
    renderNotifications();
}

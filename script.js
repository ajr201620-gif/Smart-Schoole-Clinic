function startAIDiagnosis() {
    const input = document.getElementById('symptomsInput').value;
    const resultDiv = document.getElementById('aiResult');
    const title = document.getElementById('diagnosisTitle');
    const text = document.getElementById('diagnosisText');
    const log = document.getElementById('notif-log');

    if (!input || input.length < 5) {
        alert("يرجى وصف الحالة الطبية للطالب بشكل أوضح");
        return;
    }

    resultDiv.classList.remove('hidden');
    title.innerText = "جاري معالجة البيانات...";
    text.innerText = "فحص العلامات الحيوية المترابطة وتحليل الأنماط الصحية...";

    setTimeout(() => {
        title.innerHTML = "تقرير التشخيص المتوقع <i class='fas fa-check-circle ml-2'></i>";
        text.innerHTML = `
            <b>الحالة:</b> بناءً على المدخلات، تظهر أعراض (إعياء موسمي).<br>
            <b>الاحتمالية:</b> 92%<br>
            <b>التوصية:</b> يوصى بعزل الطالب في غرفة الراحة وقياس الحرارة كل 15 دقيقة.
        `;
        
        // محاكاة إرسال واتساب
        log.innerHTML += `
            <div class="p-3 bg-blue-500/10 rounded-xl border-r-2 border-blue-500 mt-2 animate-pulse">
                تم إرسال إشعار فوري لولي أمر الطالب عبر WhatsApp ✅
            </div>
        `;
    }, 2500);
}

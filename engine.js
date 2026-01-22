
// محرك الذكاء الاصطناعي المبسط
function analyzeHealthData(data) {
  // مثال: تحليل درجة الحرارة
  if (data.temperature > 38) {
    return "تنبيه: حرارة مرتفعة!";
  } else if (data.temperature < 36) {
    return "تنبيه: حرارة منخفضة!";
  }
  return "الحالة الصحية مستقرة.";
}

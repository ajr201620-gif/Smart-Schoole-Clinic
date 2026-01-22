/** مركز الصيدلية الروبوتية **/
const PharmacyHub = {
    checkInventory(status) {
        if(status === "CRITICAL") {
            console.log("📦 نظام الصيدلية: جاري تجهيز وصفة خافض حرارة فورية.");
        }
    }
};

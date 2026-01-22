const MobileApp = {
    sendPushNotification(title, msg) {
        const div = document.createElement('div');
        div.className = 'glass p-4 border-l-4 border-orange-500 shadow-2xl animate-bounce';
        div.style.cssText = "position:fixed; top:20px; left:20px; z-index:100000; width:250px;";
        div.innerHTML = `<h5 class="text-xs font-black text-orange-500">${title}</h5><p class="text-[10px]">${msg}</p>`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
};

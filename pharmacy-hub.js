const PharmacyHub = {
    issuePrescription(med, note) {
        const rxID = "RX-" + Math.floor(Math.random()*9999);
        const div = document.createElement('div');
        div.className = 'glass p-6 text-center shadow-2xl border-2 border-emerald-500';
        div.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:20000; width:300px;";
        div.innerHTML = `<h3 class="font-black mb-2">وصفة رقمية جاهزة</h3>
                         <div id="rx-qr" class="bg-white p-2 mb-4 mx-auto w-fit"></div>
                         <p class="text-xs">الدواء: ${med}</p>
                         <button onclick="this.parentElement.remove()" class="mt-4 bg-blue-600 px-4 py-2 rounded-lg text-xs">إغلاق</button>`;
        document.body.appendChild(div);
        new QRCode(document.getElementById("rx-qr"), { text: rxID, width: 100, height: 100 });
        Blockchain.addBlock(`PRESCRIPTION: ${med}`);
    }
};

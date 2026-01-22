const Blockchain = {
    addBlock(data) {
        const container = document.getElementById('ledger-display');
        const block = document.createElement('div');
        block.className = 'glass p-4 border-r-4 border-purple-500 mb-2 opacity-80';
        block.innerHTML = `<div class="text-[9px] cyber-font text-purple-400">HASH: ${Math.random().toString(36).substring(7)}</div>
                           <div class="text-[10px] font-bold">DATA: ${data}</div>`;
        container.prepend(block);
    }
};

const ReportEngine = {
    generatePDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("OFFICIAL HEALTH REPORT", 20, 20);
        doc.text(`Student: ${data.name}`, 20, 40);
        doc.text(`Temp: ${data.temp}`, 20, 50);
        doc.text(`BPM: ${data.bpm}`, 20, 60);
        doc.save("Report.pdf");
    }
};

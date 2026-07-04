window.BellonaPartyExport = window.BellonaPartyExport || {
    exportAll: function(){ return (typeof captureParties === 'function') ? captureParties() : alert('ไม่พบฟังก์ชัน Export All'); },
    exportMain: function(){ return (typeof captureMainParties === 'function') ? captureMainParties() : alert('ไม่พบฟังก์ชัน Main PNG'); },
    exportSub: function(){ return (typeof captureSubParties === 'function') ? captureSubParties() : alert('ไม่พบฟังก์ชัน Sub PNG'); }
};

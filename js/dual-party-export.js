window.BellonaDualPartyExport = {
    _runWithExportView: function(mode, fn) {
        const zone = document.getElementById('capture-party-combined-zone');
        const oldView = window.currentPartyView || currentPartyView || 'main';
        if (zone) {
            zone.classList.remove('party-export-show-all','party-export-main','party-export-sub');
            zone.classList.add(mode === 'all' ? 'party-export-show-all' : (mode === 'sub' ? 'party-export-sub' : 'party-export-main'));
        }
        if (mode === 'all') {
            const main = document.getElementById('capture-main-zone');
            const sub = document.getElementById('capture-sub-zone');
            if (main) main.style.display = 'flex';
            if (sub) sub.style.display = 'flex';
        } else if (typeof switchPartyView === 'function') {
            switchPartyView(mode === 'sub' ? 'sub' : 'main');
        }
        const restore = () => {
            if (zone) zone.classList.remove('party-export-show-all','party-export-main','party-export-sub');
            if (typeof switchPartyView === 'function') switchPartyView(oldView);
        };
        try {
            const result = fn();
            Promise.resolve(result).finally(() => setTimeout(restore, 500));
            return result;
        } catch (err) {
            restore();
            throw err;
        }
    },
    exportAll: function() {
        return this._runWithExportView('all', () => window.BellonaPartyExport?.exportAll ? window.BellonaPartyExport.exportAll() : (typeof captureParties === 'function' ? captureParties() : alert('ไม่พบฟังก์ชัน Export All')));
    },
    exportMain: function() {
        return this._runWithExportView('main', () => window.BellonaPartyExport?.exportMain ? window.BellonaPartyExport.exportMain() : (typeof captureMainParties === 'function' ? captureMainParties() : alert('ไม่พบฟังก์ชัน Main PNG')));
    },
    exportSub: function() {
        return this._runWithExportView('sub', () => window.BellonaPartyExport?.exportSub ? window.BellonaPartyExport.exportSub() : (typeof captureSubParties === 'function' ? captureSubParties() : alert('ไม่พบฟังก์ชัน Sub PNG')));
    }
};
